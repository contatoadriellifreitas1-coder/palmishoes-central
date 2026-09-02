import { createServerFn } from '@tanstack/react-start/server'
import { getRequest } from '@tanstack/react-start/server'
import { authLimiter } from '@/lib/rate-limiter'
import { supabase } from './client'

/**
 * Secure login endpoint with rate limiting
 * Prevents brute force attacks
 */
export const secureLogin = createServerFn(
  { method: 'POST' },
  async (email: string, password: string) => {
    try {
      // ✅ Get client IP for rate limiting
      const request = getRequest()
      const ip = request?.headers.get('x-forwarded-for') ||
                request?.headers.get('cf-connecting-ip') ||
                'unknown'

      // ✅ Check rate limit (max 5 attempts per 15 minutes)
      const rateLimitResult = authLimiter.check(ip)
      if (!rateLimitResult.allowed) {
        const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        throw new Error(
          `Too many login attempts. Try again in ${retryAfterSeconds} seconds`
        )
      }

      // ✅ Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      // ✅ Perform authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        throw new Error(error.message || 'Authentication failed')
      }

      return {
        success: true,
        data: {
          user: data.user,
          session: data.session,
          rateLimitRemaining: rateLimitResult.remaining
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      return {
        success: false,
        error: message
      }
    }
  }
)

/**
 * Secure signup endpoint with rate limiting
 */
export const secureSignup = createServerFn(
  { method: 'POST' },
  async (email: string, password: string, fullName?: string) => {
    try {
      const request = getRequest()
      const ip = request?.headers.get('x-forwarded-for') ||
                request?.headers.get('cf-connecting-ip') ||
                'unknown'

      // ✅ Check rate limit (same as login)
      const rateLimitResult = authLimiter.check(ip)
      if (!rateLimitResult.allowed) {
        const retryAfterSeconds = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        throw new Error(
          `Too many signup attempts. Try again in ${retryAfterSeconds} seconds`
        )
      }

      // ✅ Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      if (password.length < 6 || password.length > 72) {
        throw new Error('Password must be between 6 and 72 characters')
      }

      // ✅ Perform signup
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          data: { 
            full_name: fullName?.trim() || undefined 
          }
        }
      })

      if (error) {
        throw new Error(error.message || 'Signup failed')
      }

      return {
        success: true,
        data: {
          user: data.user,
          message: 'Account created successfully'
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      return {
        success: false,
        error: message
      }
    }
  }
)

/**
 * Check if user is authenticated
 */
export const checkAuth = createServerFn(
  { method: 'GET' },
  async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      return {
        authenticated: !!data.session,
        user: data.session?.user || null
      }
    } catch (error) {
      return {
        authenticated: false,
        user: null
      }
    }
  }
)

/**
 * Secure logout
 */
export const secureLogout = createServerFn(
  { method: 'POST' },
  async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed'
      return { success: false, error: message }
    }
  }
)
