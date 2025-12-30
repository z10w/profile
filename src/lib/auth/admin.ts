import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

/**
 * Verify admin access
 * Returns admin user if authorized, null otherwise
 */
export async function verifyAdminAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const accessToken = authHeader.substring(7);
  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    return null;
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return user;
}

/**
 * Create admin authorization response helper
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return Response.json(
    { error: message },
    { status: 401 }
  );
}

export function forbiddenResponse(message: string = 'Forbidden: Admin access required') {
  return Response.json(
    { error: message },
    { status: 403 }
  );
}
