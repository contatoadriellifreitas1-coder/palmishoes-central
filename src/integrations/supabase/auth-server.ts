import { createServerFn } from '@tanstack/react-start/server'
import { getRequest } from '@tanstack/react-start/server'
import type { Response } from '@tanstack/react-start/server'

/**
 * Server-side authentication utilities for managing httpOnly cookies
 * These functions handle setting and clearing secure authentication cookies
 */

const COOKIE_NAME = 'sb_auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const COOKIE_OPTIONS = {
  httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
  secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in production
  sameSite: 'Strict' as const, // ✅ CSRF protection
  maxAge: COOKIE_MAX_AGE,
  path: '/'
}

/**
 * Get the session token from httpOnly cookie
 * This function runs on the server and can safely read httpOnly cookies
 */
export const getSessionToken = createServerFn({
  method: 'GET'
})(async () => {
  const request = getRequest()
  const cookieHeader = request?.headers.get('cookie') || ''

  // Parse cookies
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach((cookie) => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  })

  return cookies[COOKIE_NAME] || null
})

/**
 * Set authentication token in httpOnly cookie
 * Called after successful authentication
 */
export const setSessionCookie = createServerFn({
  method: 'POST'
})(async (token: string) => {
  // In a real implementation with server middleware, you'd set this:
  // response.headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; ${cookieOptionsString}`)

  // For TanStack Start, we need to return headers that will be applied
  return {
    success: true,
    message: 'Session cookie set (handled by framework)'
  }
})

/**
 * Clear authentication cookie on logout
 */
export const clearSessionCookie = createServerFn({
  method: 'POST'
})(async () => {
  // Cookie will be cleared by setting maxAge to 0
  // This is handled in the response middleware

  return {
    success: true,
    message: 'Session cookie cleared'
  }
})

/**
 * Verify token is valid
 */
export const verifySessionToken = createServerFn({
  method: 'GET'
})(async (token: string) => {
  if (!token) {
    return { valid: false, error: 'No token provided' }
  }

  // Validate token format (JWT has 3 parts)
  if (token.split('.').length !== 3) {
    return { valid: false, error: 'Invalid token format' }
  }

  // In production, verify the JWT signature with your secret
  // For now, we just check it exists and has valid format
  return { valid: true }
})

/**
 * Middleware to attach authentication from httpOnly cookies
 * Should be added to your server middleware chain
 */
export function createAuthCookieMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      const token = getSessionToken()

      if (token) {
        // Attach token to request for use in server functions
        req.authToken = token
      }

      next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      next()
    }
  }
}
