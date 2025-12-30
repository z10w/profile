import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forgotPasswordSchema, RATE_LIMITS, rateLimit } from '@/lib/auth';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const identifier = `${ip}:${email}`;

    const rateLimitResult = rateLimit(
      `forgot-password:${identifier}`,
      RATE_LIMITS.PASSWORD_RESET.maxRequests,
      RATE_LIMITS.PASSWORD_RESET.windowMs
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    // Only create token if user exists
    if (user) {
      // Create password reset token (expires in 1 hour)
      const resetToken = await new SignJWT({ userId: user.id, email: user.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(JWT_SECRET);

      // Store token in EmailVerification table with 1 hour expiry
      // We reuse EmailVerification for simplicity - it can be used for both email verification and password reset
      await db.emailVerification.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Simulate sending email by logging the token
      console.log('=== PASSWORD RESET ===');
      console.log(`To: ${email}`);
      console.log(`Reset Token: ${resetToken}`);
      console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
      console.log('=====================');
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
