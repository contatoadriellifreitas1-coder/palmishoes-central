/**
 * Rate limiting implementation for API endpoints
 * Prevents abuse and DDoS attacks
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes default
      maxRequests: config.maxRequests || 100,
      message: config.message || 'Too many requests, please try again later'
    }

    // Cleanup old entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000)
    }
  }

  /**
   * Check if request is allowed
   * @param identifier - IP address or user ID
   * @returns { allowed: boolean; remaining: number; resetTime: number }
   */
  check(identifier: string): {
    allowed: boolean
    remaining: number
    resetTime: number
  } {
    const now = Date.now()
    const key = identifier

    if (!this.store[key]) {
      // First request in this window
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      }
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[key].resetTime
      }
    }

    const entry = this.store[key]

    if (now > entry.resetTime) {
      // Window expired, reset
      entry.count = 1
      entry.resetTime = now + this.config.windowMs
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: entry.resetTime
      }
    }

    // Within window
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    }
  }

  /**
   * Reset a specific identifier
   */
  reset(identifier: string): void {
    delete this.store[identifier]
  }

  /**
   * Reset all entries
   */
  resetAll(): void {
    this.store = {}
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */

// Strict limit for authentication endpoints (login, signup)
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again later'
})

// Moderate limit for general API endpoints
export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Rate limit exceeded'
})

// Strict limit for sensitive operations (delete, export)
export const strictLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 operations per hour
  message: 'Too many operations, please try again later'
})

/**
 * Middleware for Express/Fastify
 * Usage: app.use(createRateLimitMiddleware(apiLimiter, 'ip'))
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  identifierFn: (req: any) => string = (req) => req.ip || 'unknown'
) {
  return (req: any, res: any, next: any) => {
    const identifier = identifierFn(req)
    const result = limiter.check(identifier)

    // Add rate limit headers
    res.set('X-RateLimit-Limit', limiter['config'].maxRequests.toString())
    res.set('X-RateLimit-Remaining', result.remaining.toString())
    res.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: limiter['config'].message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      })
    }

    next()
  }
}

/**
 * Server function wrapper to apply rate limiting
 * Usage: 
 * export const myEndpoint = createServerFn(...)(...).applyRateLimit(apiLimiter, 'ip')
 */
export function applyRateLimit(
  limiter: RateLimiter,
  identifierType: 'ip' | 'user' = 'ip'
) {
  return (fn: any) => {
    return async (req: any, ...args: any[]) => {
      const identifier =
        identifierType === 'ip' ? req.ip || 'unknown' : req.user?.id || 'anonymous'

      const result = limiter.check(identifier)

      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded. Retry after ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds`
        )
      }

      return fn(req, ...args)
    }
  }
}

/**
 * Check rate limit status without incrementing counter
 */
export function checkRateLimit(
  limiter: RateLimiter,
  identifier: string
): { allowed: boolean; remaining: number; resetTime: number } {
  return limiter.check(identifier)
}
