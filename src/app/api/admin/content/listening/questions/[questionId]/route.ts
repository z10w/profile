import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';

// GET single listening question
export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const { questionId } = params;

    const question = await db.listeningQuestion.findUnique({
      where: { id: questionId },
      include: {
        audio: {
          select: {
            id: true,
            s3Key: true,
            url: true,
            duration: true,
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

    const question = await db.listeningQuestion.update({
      where: { id: questionId },
      data: body,
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

    await db.listeningQuestion.delete({
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
