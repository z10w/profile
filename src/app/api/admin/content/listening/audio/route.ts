import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, unauthorizedResponse } from '@/lib/auth/admin';
import { z } from 'zod';

const createAudioSchema = z.object({
  s3Key: z.string().optional(),
  url: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

const updateAudioSchema = z.object({
  s3Key: z.string().optional(),
  url: z.string().optional(),
  transcript: z.string().optional(),
  duration: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

// GET all audio files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const audioFiles = await db.listeningAudio.findMany({
      where: publishedOnly ? { isPublished: true } : undefined,
      include: {
        questions: {
          where: publishedOnly ? { isPublished: true } : undefined,
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ audioFiles });
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create audio
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validationResult = createAudioSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Validate that at least s3Key or url is provided
    if (!body.s3Key && !body.url) {
      return NextResponse.json(
        { error: 'Either s3Key or url must be provided' },
        { status: 400 }
      );
    }

    const audio = await db.listeningAudio.create({
      data: validationResult.data,
    });

    return NextResponse.json({ audio }, { status: 201 });
  } catch (error) {
    console.error('Error creating audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
