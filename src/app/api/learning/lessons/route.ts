import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.string()).optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  videoUrl: z.string().url().optional(),
  isPublished: z.boolean().optional(),
});

const updateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  tags: z.array(z.string()).optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  videoUrl: z.string().url().optional(),
  isPublished: z.boolean().optional(),
});

// GET /api/learning/lessons - List all lessons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as string | null;
    const tag = searchParams.get('tag') as string | null;
    const publishedOnly = searchParams.get('published') === 'true';

    const where: any = {};
    
    if (level) {
      where.level = level;
    }
    
    if (publishedOnly !== null) {
      where.isPublished = publishedOnly === 'true';
    }
    
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    const lessons = await db.lesson.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: true, // For like count
      },
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/learning/lessons - Create new lesson (admin only)
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

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = createLessonSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const lesson = await db.lesson.create({
      data: validationResult.data,
    });

    console.log(`Admin ${user.email} created lesson: ${lesson.id}`);

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
