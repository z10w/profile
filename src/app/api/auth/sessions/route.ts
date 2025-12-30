import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Verify token
    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Get all sessions for this user
    const sessions = await db.session.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out expired sessions
    const now = new Date();
    const activeSessions = sessions.filter(session => session.expiresAt > now);

    // Transform sessions to expose only necessary information
    const sessionList = activeSessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrentSession: session.accessToken === accessToken,
    }));

    return NextResponse.json({
      sessions: sessionList,
      total: sessionList.length,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
