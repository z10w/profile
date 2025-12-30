import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

// Validation schemas
const createPassageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  text: z.string().min(1, 'Text is required'),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  isPublished: z.boolean().optional(),
});

const updatePassageSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  text: z.string().min(1, 'Text is required').optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  isPublished: z.boolean().optional(),
});

// GET all passages (with optional filter for published)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const passages = await db.readingPassage.findMany({
      where: publishedOnly ? { isPublished: true } : undefined,
      include: {
        questions: {
          where: publishedOnly ? { isPublished: true } : undefined,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ passages });
  } catch (error) {
    console.error('Error fetching passages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create passage
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validationResult = createPassageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const passage = await db.readingPassage.create({
      data: validationResult.data,
    });

    return NextResponse.json({ passage }, { status: 201 });
  } catch (error) {
    console.error('Error creating passage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
