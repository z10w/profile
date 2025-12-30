import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

// GET /api/learning/bookmarks - List user's bookmarked lessons
export async function GET(request: NextRequest) {
  try {
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

    const bookmarks = await db.lessonBookmark.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
            level: true,
            videoUrl: true,
            isPublished: true,
          },
        },
      },
    });

    const lessons = bookmarks.map((bookmark) => bookmark.lesson);

    return NextResponse.json({ bookmarks, lessons });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/learning/bookmarks - Create bookmark
export async function POST(request: NextRequest) {
  try {
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

    const { lessonId } = await request.json();

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    const existingBookmark = await db.lessonBookmark.findUnique({
      where: {
        userId_lessonId: {
          userId: payload.userId,
          lessonId,
        },
      },
    });

    if (existingBookmark) {
      return NextResponse.json(
        { error: 'Lesson already bookmarked' },
        { status: 400 }
      );
    }

    const bookmark = await db.lessonBookmark.create({
      data: {
        userId: payload.userId,
        lessonId,
      },
    });

    console.log(`User ${payload.userId} bookmarked lesson: ${lessonId}`);

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error('Error creating bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/learning/bookmarks/:id - Delete bookmark
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const bookmark = await db.lessonBookmark.findUnique({
      where: {
        userId_lessonId: {
          userId: payload.userId,
          lessonId: params.id,
        },
      },
    });

    if (!bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    if (bookmark.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this bookmark' },
        { status: 403 }
      );
    }

    await db.lessonBookmark.delete({
      where: {
        userId_lessonId: {
          userId: payload.userId,
          lessonId: params.id,
        },
      },
    });

    console.log(`User ${payload.userId} deleted bookmark: ${params.id}`);

    return NextResponse.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
