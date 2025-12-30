import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const updatePassageSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  text: z.string().min(1, 'Text is required').optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  isPublished: z.boolean().optional(),
});

// GET single passage
export async function GET(
  request: NextRequest,
  { params }: { params: { passageId: string } }
) {
  try {
    const { passageId } = params;

    const passage = await db.readingPassage.findUnique({
      where: { id: passageId },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!passage) {
      return NextResponse.json(
        { error: 'Passage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ passage });
  } catch (error) {
    console.error('Error fetching passage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update passage
export async function PUT(
  request: NextRequest,
  { params }: { params: { passageId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { passageId } = params;
    const body = await request.json();
    const validationResult = updatePassageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const passage = await db.readingPassage.update({
      where: { id: passageId },
      data: validationResult.data,
    });

    return NextResponse.json({ passage });
  } catch (error) {
    console.error('Error updating passage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE passage
export async function DELETE(
  request: NextRequest,
  { params }: { params: { passageId: string } }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const { passageId } = params;

    await db.readingPassage.delete({
      where: { id: passageId },
    });

    return NextResponse.json({ message: 'Passage deleted successfully' });
  } catch (error) {
    console.error('Error deleting passage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
