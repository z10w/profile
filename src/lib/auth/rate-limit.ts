interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(identifier);
  }

  const currentEntry = rateLimitStore.get(identifier);

  if (!currentEntry) {
    // First request in the window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (currentEntry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: currentEntry.resetTime,
    };
  }

  // Increment count
  currentEntry.count++;
  return {
    success: true,
    remaining: maxRequests - currentEntry.count,
    resetTime: currentEntry.resetTime,
  };
}

// Common rate limit configurations
export const RATE_LIMITS = {
  SIGNUP: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  LOGIN: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 requests per minute
  GENERAL: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 requests per minute
} as const;
