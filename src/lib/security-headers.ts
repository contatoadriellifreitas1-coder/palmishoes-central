/**
 * Security headers configuration
 * Add these headers to your HTTP responses for better security
 */

export interface SecurityHeadersConfig {
  'Strict-Transport-Security'?: string
  'X-Content-Type-Options'?: string
  'X-Frame-Options'?: string
  'X-XSS-Protection'?: string
  'Referrer-Policy'?: string
  'Permissions-Policy'?: string
  'Content-Security-Policy'?: string
}

/**
 * Default security headers for production
 */
export const defaultSecurityHeaders: SecurityHeadersConfig = {
  // HSTS: Force HTTPS for 1 year
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy':
    'accelerometer=(), camera=(), microphone=(), geolocation=(), usb=(), payment=(), vr=()',

  // Content Security Policy
  'Content-Security-Policy':
    // eslint-disable-next-line max-len
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
}

/**
 * Development security headers (less strict CSP)
 */
export const devSecurityHeaders: SecurityHeadersConfig = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN', // Allow in iframes for dev tools
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer-when-downgrade',
  'Permissions-Policy':
    'accelerometer=(), camera=(), microphone=(), geolocation=(), usb=()', // More permissive for dev
  'Content-Security-Policy':
    // eslint-disable-next-line max-len
    "default-src 'self' 'unsafe-eval'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http: https:; frame-ancestors 'self';"
}

/**
 * Get appropriate security headers based on environment
 */
export function getSecurityHeaders(): SecurityHeadersConfig {
  return process.env.NODE_ENV === 'production' ? defaultSecurityHeaders : devSecurityHeaders
}

/**
 * Middleware to apply security headers (Express/Fastify compatible)
 */
export function securityHeadersMiddleware() {
  const headers = getSecurityHeaders()

  return (req: any, res: any, next: any) => {
    Object.entries(headers).forEach(([key, value]) => {
      if (value) {
        res.set(key, value)
      }
    })
    next()
  }
}

/**
 * For TanStack Start / Nitro, use renderRouteContext to add headers
 */
export function applySecurityHeaders(renderContext: any) {
  const headers = getSecurityHeaders()

  if (!renderContext.response) {
    renderContext.response = {}
  }

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      renderContext.response.headers = renderContext.response.headers || {}
      renderContext.response.headers[key] = value
    }
  })

  return renderContext
}

/**
 * CORS configuration
 */
export const corsConfig = {
  origin:
    process.env.ALLOWED_ORIGINS?.split(',') ||
    (process.env.NODE_ENV === 'production'
      ? ['https://palmishoes.com.br', 'https://www.palmishoes.com.br']
      : ['http://localhost:3000', 'http://localhost:5173']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}

/**
 * Log security headers (useful for debugging)
 */
export function logSecurityHeaders() {
  const headers = getSecurityHeaders()
  console.log('🔒 Security Headers Configuration:')
  console.log('Environment:', process.env.NODE_ENV)
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      console.log(`  ${key}: ${value.substring(0, 60)}...`)
    }
  })
}
