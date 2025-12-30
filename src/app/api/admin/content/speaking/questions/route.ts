import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const createQuestionSchema = z.object({
  part: z.number().int().min(1).max(3, 'Part must be 1, 2, or 3'),
  cueCardText: z.string().min(1, 'Cue card text is required'),
  prepTime: z.number().int().min(1, 'Prep time must be at least 1 second'),
  recordingTime: z.number().int().min(1, 'Recording time must be at least 1 second'),
  followUpQuestions: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

const updateQuestionSchema = z.object({
  part: z.number().int().min(1).max(3, 'Part must be 1, 2, or 3').optional(),
  cueCardText: z.string().min(1, 'Cue card text is required').optional(),
  prepTime: z.number().int().min(1, 'Prep time must be at least 1 second').optional(),
  recordingTime: z.number().int().min(1, 'Recording time must be at least 1 second').optional(),
  followUpQuestions: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

// GET all speaking questions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';
    const part = searchParams.get('part');

    const questions = await db.speakingQuestion.findMany({
      where: {
        ...(publishedOnly && { isPublished: true }),
        ...(part && { part: parseInt(part) }),
      },
      orderBy: [{ part: 'asc' }, { createdAt: 'desc' }],
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

    const question = await db.speakingQuestion.create({
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
