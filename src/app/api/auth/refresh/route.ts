import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyRefreshToken, signAccessToken, signRefreshToken, refreshTokenSchema } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = refreshTokenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { refreshToken } = validationResult.data;

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Find the session with this refresh token
    const session = await db.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await db.session.delete({
        where: { id: session.id },
      });
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const tokenPayload = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    const newAccessToken = await signAccessToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);

    // Rotate tokens - update the session with new tokens
    await db.session.update({
      where: { id: session.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Reset expiration to 7 days
      },
    });

    return NextResponse.json({
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
