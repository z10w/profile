import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schema
const submitExamSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  answers: z.record(z.string(), z.any()),
  timeSpent: z.number().int().min(0).optional(),
});

/**
 * Calculate IELTS band score from percentage
 * 
 * IELTS 9-band scale:
 * - 100% = 9
 * - 90-99% = 8.5
 * - 80-89% = 8
 * - 70-79% = 7.5
 * - 60-69% = 7
 * - 50-59% = 6.5
 * - 40-49% = 6
 * - 30-39% = 5.5
 * - 20-29% = 5
 * - 10-19% = 4.5
 * - 1-9% = 4
 * - 0% = 0-3 (depends on question count)
 */
function calculateBandScore(percentage: number): number {
  if (percentage >= 100) return 9;
  if (percentage >= 90) return 8.5;
  if (percentage >= 80) return 8;
  if (percentage >= 70) return 7.5;
  if (percentage >= 60) return 7;
  if (percentage >= 50) return 6.5;
  if (percentage >= 40) return 6;
  if (percentage >= 30) return 5.5;
  if (percentage >= 20) return 5;
  if (percentage >= 10) return 4.5;
  if (percentage > 0) return 4;
  return 0; // No correct answers
}

/**
 * Compare user answer with correct answer
 * Handles different answer formats (string, array, boolean)
 */
function compareAnswers(userAnswer: any, correctAnswer: any): boolean {
  // Handle null/undefined
  if (userAnswer === null || userAnswer === undefined) return false;

  // Handle arrays (gap fill, MCQ multiple)
  if (Array.isArray(correctAnswer)) {
    if (!Array.isArray(userAnswer)) return false;
    // Compare arrays (order doesn't matter for gap fill)
    if (correctAnswer.length !== userAnswer.length) return false;
    return correctAnswer.every((val) => userAnswer.includes(val));
  }

  // Handle strings (MCQ single, True/False, Heading)
  if (typeof correctAnswer === 'string') {
    const userStr = String(userAnswer).trim().toLowerCase();
    const correctStr = correctAnswer.trim().toLowerCase();
    return userStr === correctStr;
  }

  // Handle boolean
  if (typeof correctAnswer === 'boolean') {
    if (typeof userAnswer === 'boolean') {
      return userAnswer === correctAnswer;
    }
    if (typeof userAnswer === 'string') {
      return userAnswer.toLowerCase() === String(correctAnswer).toLowerCase();
    }
    return false;
  }

  return false;
}

/**
 * Submit Exam Endpoint
 * 
 * Logic:
 * 1. Verify authentication
 * 2. Load ExamHistory
 * 3. Fetch questions with correct answers
 * 4. Compare user answers with correct answers
 * 5. Calculate score (0-9 band score)
 * 6. Save ExamHistory with COMPLETED status
 * 7. Return score, breakdown, correctCount, totalQuestions
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
    const validationResult = submitExamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { examId, answers, timeSpent } = validationResult.data;

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

    // Get exam data from jsonData
    const examData = examHistory.jsonData as any;
    const examType = examHistory.examType;

    let questions: any[] = [];
    let results: any[] = [];

    // Fetch questions with correct answers based on exam type
    if (examType === 'READING') {
      // Fetch reading questions
      questions = await db.readingQuestion.findMany({
        where: {
          id: { in: Object.keys(answers) },
        },
      });

      results = questions.map((q) => {
        const userAnswer = answers[q.id];
        const isCorrect = compareAnswers(userAnswer, q.correctAnswer);

        return {
          questionId: q.id,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
        };
      });
    } else if (examType === 'LISTENING') {
      // Fetch listening questions
      questions = await db.listeningQuestion.findMany({
        where: {
          id: { in: Object.keys(answers) },
        },
      });

      results = questions.map((q) => {
        const userAnswer = answers[q.id];
        const isCorrect = compareAnswers(userAnswer, q.correctAnswer);

        return {
          questionId: q.id,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation,
        };
      });
    } else if (examType === 'WRITING' || examType === 'SPEAKING') {
      // For writing and speaking, just store the answers
      // These will be graded by AI later
      results = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        userAnswer: answer,
        isCorrect: null, // AI will grade
        explanation: null,
      }));
    }

    // Calculate score for Reading/Listening
    let score: number | null = null;
    let subScores: any = null;

    if (examType === 'READING' || examType === 'LISTENING') {
      const correctCount = results.filter((r) => r.isCorrect).length;
      const totalQuestions = results.length;
      const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      
      score = calculateBandScore(percentage);

      subScores = {
        correctCount,
        totalQuestions,
        percentage: Math.round(percentage * 100) / 100,
        bandScore: score,
      };
    }

    // Update ExamHistory
    await db.examHistory.update({
      where: { id: examId },
      data: {
        status: 'COMPLETED',
        score,
        subScores,
        jsonData: {
          ...examData,
          answers,
          results,
          timeSpent,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`Exam submitted: ${examType} for user ${payload.userId}, score: ${score}`);

    return NextResponse.json({
      message: 'Exam submitted successfully',
      score,
      subScores,
      examType,
      examId,
    });
  } catch (error) {
    console.error('Exam submit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
