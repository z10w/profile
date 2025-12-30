import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';

// GET single writing prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params;

    const prompt = await db.writingPrompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { promptId } = params;
    const body = await request.json();

    const prompt = await db.writingPrompt.update({
      where: { id: promptId },
      data: body,
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { promptId } = params;

    await db.writingPrompt.delete({
      where: { id: promptId },
    });

    return NextResponse.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
