import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const updateQuestionSchema = z.object({
  type: z.enum(['MCQ', 'TRUE_FALSE', 'HEADING', 'GAP_FILL']).optional(),
  questionText: z.string().min(1, 'Question text is required').optional(),
  options: z.any().optional(),
  correctAnswer: z.any().optional(),
  explanation: z.string().optional(),
  isPublished: z.boolean().optional(),
});

// GET single question
export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const { questionId } = params;

    const question = await db.readingQuestion.findUnique({
      where: { id: questionId },
      include: {
        passage: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update question
export async function PUT(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { questionId } = params;
    const body = await request.json();
    const validationResult = updateQuestionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const question = await db.readingQuestion.update({
      where: { id: questionId },
      data: validationResult.data,
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { questionId } = params;

    await db.readingQuestion.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
