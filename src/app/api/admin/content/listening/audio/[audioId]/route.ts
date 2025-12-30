import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';

// GET single audio file
export async function GET(
  request: NextRequest,
  { params }: { params: { audioId: string } }
) {
  try {
    const { audioId } = params;

    const audio = await db.listeningAudio.findUnique({
      where: { id: audioId },
      include: {
        questions: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audio });
  } catch (error) {
    console.error('Error fetching audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update audio
export async function PUT(
  request: NextRequest,
  { params }: { params: { audioId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { audioId } = params;
    const body = await request.json();

    const audio = await db.listeningAudio.update({
      where: { id: audioId },
      data: body,
    });

    return NextResponse.json({ audio });
  } catch (error) {
    console.error('Error updating audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE audio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { audioId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { audioId } = params;

    await db.listeningAudio.delete({
      where: { id: audioId },
    });

    return NextResponse.json({ message: 'Audio deleted successfully' });
  } catch (error) {
    console.error('Error deleting audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
