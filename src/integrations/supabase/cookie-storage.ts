import { useCallback } from 'react'

/**
 * Custom storage implementation using httpOnly cookies via server functions
 * This is more secure than localStorage for storing sensitive tokens
 */

const COOKIE_NAME = 'sb_auth_token'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface CookieStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

/**
 * Server-side cookie storage adapter
 * Communicates with backend to manage httpOnly cookies
 */
export function createCookieStorage(): CookieStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      // In browser: read from document.cookie (but httpOnly cookies won't be readable here)
      // Instead, rely on automatic cookie sending with fetch (credentials: 'include')
      // The server will validate the cookie
      if (typeof document === 'undefined') return null

      const name = `${key}=`
      const cookies = document.cookie.split(';')
      for (let cookie of cookies) {
        cookie = cookie.trim()
        if (cookie.startsWith(name)) {
          return decodeURIComponent(cookie.substring(name.length))
        }
      }
      return null
    },

    async setItem(key: string, value: string): Promise<void> {
      // For httpOnly cookies, this is handled by the server
      // We send a request to the server to set the cookie
      if (typeof window === 'undefined') return

      try {
        // Call our auth server function to set the cookie
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Important: send cookies
          body: JSON.stringify({ value })
        })
      } catch (error) {
        console.error('Failed to set session cookie:', error)
      }
    },

    async removeItem(key: string): Promise<void> {
      if (typeof window === 'undefined') return

      try {
        await fetch('/api/auth/clear-session', {
          method: 'POST',
          credentials: 'include'
        })
      } catch (error) {
        console.error('Failed to clear session cookie:', error)
      }
    }
  }
}

/**
 * Hook to use cookie storage in React components
 */
export function useCookieStorage() {
  const storage = createCookieStorage()

  const getSession = useCallback(async () => {
    return await storage.getItem('sb_auth_token')
  }, [])

  const setSession = useCallback(async (token: string) => {
    return await storage.setItem('sb_auth_token', token)
  }, [])

  const clearSession = useCallback(async () => {
    return await storage.removeItem('sb_auth_token')
  }, [])

  return { getSession, setSession, clearSession }
}
