import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailVerificationSchema, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = emailVerificationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Find verification record
    const verification = await db.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (verification.verifiedAt) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification token expired' },
        { status: 400 }
      );
    }

    // Verify JWT token
    const payload = await verifyToken(token);

    if (!payload || payload.userId !== verification.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Mark email as verified
    await db.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    });

    // Mark verification as completed
    await db.emailVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    });

    return NextResponse.json({
      message: 'Email verified successfully',
      userId: verification.userId,
      email: verification.user.email,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
