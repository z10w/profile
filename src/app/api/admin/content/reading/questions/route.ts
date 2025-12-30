import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const createQuestionSchema = z.object({
  passageId: z.string().min(1, 'Passage ID is required'),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'HEADING', 'GAP_FILL']),
  questionText: z.string().min(1, 'Question text is required'),
  options: z.any().optional(), // JSON array
  correctAnswer: z.any(), // JSON - can be string, number, or array
  explanation: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const updateQuestionSchema = z.object({
  type: z.enum(['MCQ', 'TRUE_FALSE', 'HEADING', 'GAP_FILL']).optional(),
  questionText: z.string().min(1, 'Question text is required').optional(),
  options: z.any().optional(),
  correctAnswer: z.any().optional(),
  explanation: z.string().optional(),
  isPublished: z.boolean().optional(),
});

// GET all questions (optionally filtered by passageId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passageId = searchParams.get('passageId');
    const publishedOnly = searchParams.get('published') === 'true';

    const questions = await db.readingQuestion.findMany({
      where: {
        ...(passageId && { passageId }),
        ...(publishedOnly && { isPublished: true }),
      },
      include: {
        passage: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create question
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validationResult = createQuestionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const question = await db.readingQuestion.create({
      data: validationResult.data,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
