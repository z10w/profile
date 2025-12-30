import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyToken, resetPasswordSchema } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { token, password } = validationResult.data;

    // Find verification record
    const verification = await db.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 404 }
      );
    }

    // Check if already verified (this would indicate it was already used)
    if (verification.verifiedAt) {
      return NextResponse.json(
        { error: 'Reset token already used' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset token expired' },
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

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await db.user.update({
      where: { id: verification.userId },
      data: { passwordHash },
    });

    // Mark verification as completed
    await db.emailVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() },
    });

    // Revoke all sessions for this user to force re-login
    await db.session.deleteMany({
      where: { userId: verification.userId },
    });

    return NextResponse.json({
      message: 'Password reset successfully. Please login with your new password.',
      userId: verification.userId,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
