import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const createPromptSchema = z.object({
  taskType: z.enum(['TASK_1', 'TASK_2']),
  topic: z.string().min(1, 'Topic is required'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  timeLimit: z.number().int().min(1, 'Time limit must be at least 1 minute'),
  wordCount: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

const updatePromptSchema = z.object({
  taskType: z.enum(['TASK_1', 'TASK_2']).optional(),
  topic: z.string().min(1, 'Topic is required').optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  timeLimit: z.number().int().min(1, 'Time limit must be at least 1 minute').optional(),
  wordCount: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

// GET all writing prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const prompts = await db.writingPrompt.findMany({
      where: publishedOnly ? { isPublished: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create prompt
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validationResult = createPromptSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const prompt = await db.writingPrompt.create({
      data: validationResult.data,
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
