import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const startExamSchema = z.object({
  type: z.enum(['READING', 'LISTENING', 'WRITING', 'SPEAKING']),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'MIXED']).optional(),
});

// Exam duration limits (in minutes)
const EXAM_DURATION = {
  READING: 60,
  LISTENING: 40,
  WRITING: 60,
  SPEAKING: 15,
};

/**
 * Start Exam Endpoint
 * 
 * Logic:
 * 1. Verify user authentication
 * 2. Check user has sufficient credits
 * 3. Atomically deduct 1 credit
 * 4. Randomly select published content
 * 5. Create ExamHistory entry with IN_PROGRESS status
 * 6. Return exam object with questions, text/audio URLs
 * 
 * Failure Handling:
 * - If credit deduction fails, restore credit with USAGE_FAIL transaction
 * - If DB error, roll back transaction and restore credit
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
    const validationResult = startExamSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { type, difficulty = 'MIXED' } = validationResult.data;

    // Get user
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has sufficient credits
    if (user.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to take an exam.' },
        { status: 402 }
      );
    }

    let examData: any = null;

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Deduct 1 credit
      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            decrement: 1,
          },
        },
      });

      // Create usage transaction
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -1,
          type: 'USAGE',
          reason: `Started ${type} exam`,
        },
      });

      // Select content based on exam type
      if (type === 'READING') {
        // Get random reading passage with published questions
        const passages = await tx.readingPassage.findMany({
          where: {
            isPublished: true,
            ...(difficulty !== 'MIXED' && { level: difficulty }),
          },
          include: {
            questions: {
              where: { isPublished: true },
            },
          },
        });

        if (passages.length === 0) {
          throw new Error('No published reading passages available');
        }

        // Select random passage
        const randomIndex = Math.floor(Math.random() * passages.length);
        const selectedPassage = passages[randomIndex];

        examData = {
          type: 'READING',
          passage: {
            id: selectedPassage.id,
            title: selectedPassage.title,
            text: selectedPassage.text,
            level: selectedPassage.level,
          },
          questions: selectedPassage.questions.map((q: any) => ({
            id: q.id,
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            // Don't send correctAnswer to frontend
            explanation: q.explanation,
          })),
          duration: EXAM_DURATION.READING,
        };
      } else if (type === 'LISTENING') {
        // Get random listening audio with published questions
        const audioFiles = await tx.listeningAudio.findMany({
          where: {
            isPublished: true,
          },
          include: {
            questions: {
              where: { isPublished: true },
              orderBy: { timestamp: 'asc' },
            },
          },
        });

        if (audioFiles.length === 0) {
          throw new Error('No published listening audio available');
        }

        // Select random audio
        const randomIndex = Math.floor(Math.random() * audioFiles.length);
        const selectedAudio = audioFiles[randomIndex];

        examData = {
          type: 'LISTENING',
          audio: {
            id: selectedAudio.id,
            url: selectedAudio.url,
            duration: selectedAudio.duration,
          },
          questions: selectedAudio.questions.map((q: any) => ({
            id: q.id,
            type: q.type,
            timestamp: q.timestamp,
            questionText: q.questionText,
            options: q.options,
            explanation: q.explanation,
          })),
          duration: EXAM_DURATION.LISTENING,
        };
      } else if (type === 'WRITING') {
        // Get random writing prompt
        const prompts = await tx.writingPrompt.findMany({
          where: { isPublished: true },
        });

        if (prompts.length === 0) {
          throw new Error('No published writing prompts available');
        }

        const randomIndex = Math.floor(Math.random() * prompts.length);
        const selectedPrompt = prompts[randomIndex];

        examData = {
          type: 'WRITING',
          prompt: {
            id: selectedPrompt.id,
            taskType: selectedPrompt.taskType,
            topic: selectedPrompt.topic,
            description: selectedPrompt.description,
            imageUrl: selectedPrompt.imageUrl,
            timeLimit: selectedPrompt.timeLimit,
            wordCount: selectedPrompt.wordCount,
          },
          duration: selectedPrompt.timeLimit,
        };
      } else if (type === 'SPEAKING') {
        // Get random speaking questions (one from each part)
        const part1Questions = await tx.speakingQuestion.findMany({
          where: { part: 1, isPublished: true },
        });
        const part2Questions = await tx.speakingQuestion.findMany({
          where: { part: 2, isPublished: true },
        });
        const part3Questions = await tx.speakingQuestion.findMany({
          where: { part: 3, isPublished: true },
        });

        if (part1Questions.length === 0 || part2Questions.length === 0 || part3Questions.length === 0) {
          throw new Error('No published speaking questions available for all parts');
        }

        // Select one from each part
        const selectRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

        const selectedQuestions = [
          selectRandom(part1Questions),
          selectRandom(part2Questions),
          selectRandom(part3Questions),
        ];

        examData = {
          type: 'SPEAKING',
          questions: selectedQuestions.map((q: any) => ({
            id: q.id,
            part: q.part,
            cueCardText: q.cueCardText,
            prepTime: q.prepTime,
            recordingTime: q.recordingTime,
            followUpQuestions: q.followUpQuestions,
          })),
          duration: 15, // Total speaking time
        };
      }

      // Create ExamHistory entry
      const examHistory = await tx.examHistory.create({
        data: {
          userId: user.id,
          examType: type,
          status: 'IN_PROGRESS',
          jsonData: {
            ...examData,
            startTime: new Date().toISOString(),
          },
        },
      });

      examData.examId = examHistory.id;
    });

    console.log(`Exam started: ${type} for user ${user.id}, exam ID: ${examData.examId}`);

    return NextResponse.json(examData, { status: 201 });
  } catch (error) {
    console.error('Exam start error:', error);

    // If error, try to restore credit
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.substring(7);
    const payload = await verifyAccessToken(accessToken || '');

    if (payload && error instanceof Error && error.message.includes('No published')) {
      // Restore credit if content was not available
      try {
        await db.user.update({
          where: { id: payload.userId },
          data: {
            credits: {
              increment: 1,
            },
          },
        });

        await db.creditTransaction.create({
          data: {
            userId: payload.userId,
            amount: 1,
            type: 'USAGE_FAIL',
            reason: 'Credit restored - no published content available',
          },
        });
      } catch (restoreError) {
        console.error('Failed to restore credit:', restoreError);
      }

      return NextResponse.json(
        { error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
