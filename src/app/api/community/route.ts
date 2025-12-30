import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schemas
const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  tags: z.array(z.enum(['GENERAL', 'STUDY_ABROAD', 'EXAM_TIPS', 'WRITING', 'SPEAKING', 'VOCABULARY', 'GRAMMAR', 'COMMUNITY'])).optional(),
});

const createCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  content: z.string().min(1, 'Content is required'),
});

// GET /api/community/posts - List all community posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag') as string | null;
    const userId = searchParams.get('userId') as string | null;
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};
    
    if (tag) {
      where.tags = {
        has: tag,
      };
    }
    
    if (userId) {
      where.userId = userId;
    }

    const posts = await db.communityPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/posts - Create new post (authenticated)
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
    const validationResult = createPostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const post = await db.communityPost.create({
      data: {
        userId: payload.userId,
        content: body.content,
        tags: body.tags || [],
        likesCount: 0,
      },
    });

    console.log(`User ${payload.userId} created post: ${post.id}`);

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/like/:id - Like a post (authenticated)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const postId = params.id;

    // Check if post exists
    const post = await db.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Increment or decrement likes count
    const updatedPost = await db.communityPost.update({
      where: { id: postId },
      data: {
        likesCount: {
          increment: 1,
        },
      },
    });

    console.log(`User ${payload.userId} liked post: ${postId}`);

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('Error liking post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/community/comments/:postId - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const comments = await db.comment.findMany({
      where: { postId: params.postId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/comments - Create comment (authenticated)
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
    const validationResult = createCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const comment = await db.comment.create({
      data: {
        postId: body.postId,
        userId: payload.userId,
        content: body.content,
      },
    });

    console.log(`User ${payload.userId} created comment: ${comment.id}`);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/posts/:id - Delete post (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete post (this will cascade delete comments)
    await db.communityPost.delete({
      where: { id: params.id },
    });

    console.log(`Admin ${user.email} deleted post: ${params.id}`);

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
