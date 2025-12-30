import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * Audit Log Types
 */
type AuditAction =
  | 'USER_SIGNUP'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'CREDIT_PURCHASE'
  | 'CREDIT_REFUND'
  | 'EXAM_START'
  | 'EXAM_SUBMIT'
  | 'POST_CREATE'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'ADMIN_LOGIN'
  | 'ADMIN_ACTION'
  | 'USER_UPDATE';

interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
}

/**
 * Write Audit Log Entry
 * 
 * Logs all POST requests to file/DB for security monitoring
 * @param userId - User ID (null for public endpoints)
 * @param action - The action being performed
 * @param details - Additional details about the action
 * @param request - The NextRequest object
 */
export async function writeAuditLog(
  userId: string | null,
  action: AuditAction,
  details: string,
  request: NextRequest
): Promise<void> {
  const logEntry = {
    userId,
    action,
    details,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
    timestamp: new Date(),
  };

  // Write to console for now (in production, would write to DB/file)
  console.log('=== AUDIT LOG ===');
  console.log(JSON.stringify(logEntry, null, 2));
  console.log('=====================');

  // In production, you would write this to a database table
  // await db.auditLog.create({ data: logEntry });
}

/**
 * Create Audit Middleware
 * Wraps audit logging around request handlers
 */
export function withAuditLog(
  handler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    try {
      // Start timer for performance monitoring
      const startTime = Date.now();

      // Call handler
      const response = await handler(request);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log action
      await writeAuditLog(
        null, // Could extract userId from JWT
        getActionFromPath(request.nextUrl.pathname),
        `${request.method} ${request.nextUrl.pathname} (${duration}ms)`,
        request
      );

      return response;
    } catch (error) {
      console.error('Audit middleware error:', error);
      // Log to error
      await writeAuditLog(
        null,
        'ERROR',
        `${request.method} ${request.nextUrl.pathname} failed: ${error}`,
        request
      );

      throw error;
    }
  };
}

/**
 * Get Action from Path
 */
function getActionFromPath(pathname: string): AuditAction {
  if (pathname.includes('/auth/signup')) return 'USER_SIGNUP';
  if (pathname.includes('/auth/login')) return 'USER_LOGIN';
  if (pathname.includes('/auth/logout')) return 'USER_LOGOUT';
  if (pathname.includes('/payments/refund')) return 'CREDIT_REFUND';
  if (pathname.includes('/exam/start')) return 'EXAM_START';
  if (pathname.includes('/exam/submit')) return 'EXAM_SUBMIT';
  if (pathname.includes('/community/posts')) return 'POST_CREATE';
  if (pathname.includes('/community/like')) return 'POST_LIKE';
  if (pathname.includes('/community/comments')) return 'POST_COMMENT';

  return 'USER_UPDATE';
}
