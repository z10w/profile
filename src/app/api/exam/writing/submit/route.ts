import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { gradeWritingEssayWithFallback } from '@/lib/services/writing-grading';
import { z } from 'zod';

// Validation schema
const submitWritingSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  text: z.string().min(1, 'Writing text is required'),
  timeSpent: z.number().int().min(0).optional(),
});

/**
 * Submit Writing Exam Endpoint
 * 
 * Logic:
 * 1. Verify authentication
 * 2. Load ExamHistory
 * 3. Fetch writing prompt
 * 4. Call AI to grade the essay
 * 5. Update ExamHistory with COMPLETED status
 * 6. Save AI cost to aiCost field
 * 7. Return grading result
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = submitWritingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { examId, text, timeSpent } = validationResult.data;

    // Load exam history
    const examHistory = await db.examHistory.findUnique({
      where: { id: examId },
    });

    if (!examHistory) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Verify user owns this exam
    if (examHistory.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this exam' },
        { status: 403 }
      );
    }

    // Check if exam is already completed
    if (examHistory.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Exam already submitted' },
        { status: 400 }
      );
    }

    // Verify exam type is WRITING
    if (examHistory.examType !== 'WRITING') {
      return NextResponse.json(
        { error: 'Invalid exam type' },
        { status: 400 }
      );
    }

    // Get prompt from exam data
    const examData = examHistory.jsonData as any;
    const prompt = examData.prompt;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Writing prompt not found in exam data' },
        { status: 400 }
      );
    }

    console.log(`Grading writing exam ${examId} for user ${payload.userId}`);
    console.log(`Word count: ${text.trim().split(/\s+/).length}`);

    // Call AI to grade the essay
    const { result, cost } = await gradeWritingEssayWithFallback(
      prompt.taskType || 'TASK_2',
      prompt.topic || '',
      text,
      timeSpent
    );

    // Prepare sub-scores for ExamHistory
    const subScores = {
      taskResponse: result.taskResponse,
      coherence: result.coherence,
      vocabulary: result.vocabulary,
      grammar: result.grammar,
      wordCount: text.trim().split(/\s+/).length,
      timeSpent,
    };

    // Update ExamHistory with grading result
    await db.examHistory.update({
      where: { id: examId },
      data: {
        status: 'COMPLETED',
        score: result.score,
        subScores,
        aiCost: cost.cost,
        jsonData: {
          ...examData,
          answers: {
            text,
          },
          gradingResult: result,
          gradingCost: cost,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`Writing exam graded: Score ${result.score}, Cost $${cost.cost.toFixed(6)}`);

    return NextResponse.json({
      message: 'Writing exam graded successfully',
      score: result.score,
      subScores,
      feedback: result.feedback,
      improvedAnswerExample: result.improvedAnswerExample,
      gradingCost: cost,
      examId,
    });
  } catch (error) {
    console.error('Writing exam submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
