/**
 * 🔒 Cookie Manager - Gerenciamento Seguro de Cookies
 * 
 * Responsável por:
 * - Criar cookies com parâmetros de segurança (HttpOnly, Secure, SameSite)
 * - Ler cookies de forma segura
 * - Remover/invalidar cookies no logout
 * - Validar e sanitizar valores de cookies
 * 
 * Uso:
 * import { cookieManager } from '@/lib/cookie-manager'
 * 
 * // Criar cookie
 * cookieManager.set('token', 'abc123', { maxAge: 3600 })
 * 
 * // Ler cookie
 * const token = cookieManager.get('token')
 * 
 * // Remover cookie
 * cookieManager.remove('token')
 */

interface CookieOptions {
  maxAge?: number // Segundos (ex: 3600 = 1 hora)
  path?: string // Default: '/'
  domain?: string // Se vazio, usa domínio atual
  secure?: boolean // HTTPS only (default: true em produção)
  httpOnly?: boolean // Não acessível via JS (default: true)
  sameSite?: 'Strict' | 'Lax' | 'None' // CSRF protection (default: 'Strict')
}

interface CookieManagerConfig {
  environment?: 'development' | 'production'
  defaultMaxAge?: number // Default: 7 dias
  defaultPath?: string // Default: '/'
  defaultDomain?: string // Default: vazio (domínio atual)
}

/**
 * Classe para gerenciar cookies com segurança
 */
class CookieManager {
  private config: Required<CookieManagerConfig>

  constructor(config: CookieManagerConfig = {}) {
    this.config = {
      environment: config.environment || (typeof window !== 'undefined' ? 'production' : 'development'),
      defaultMaxAge: config.defaultMaxAge || 7 * 24 * 60 * 60, // 7 dias
      defaultPath: config.defaultPath || '/',
      defaultDomain: config.defaultDomain || ''
    }
  }

  /**
   * Criar/Atualizar um cookie com parâmetros de segurança
   */
  set(name: string, value: string, options: CookieOptions = {}): void {
    try {
      // ✅ Validar nome do cookie
      if (!this.validateCookieName(name)) {
        throw new Error(`Cookie name invalid: "${name}"`)
      }

      // ✅ Validar valor do cookie
      const sanitizedValue = this.sanitizeValue(value)

      // ✅ Preparar opções com defaults seguros
      const cookieOptions = this.buildCookieOptions(options)

      // ✅ Construir string do cookie
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(sanitizedValue)}`

      if (cookieOptions.maxAge !== undefined) {
        cookieString += `; Max-Age=${cookieOptions.maxAge}`
      }

      if (cookieOptions.path) {
        cookieString += `; Path=${cookieOptions.path}`
      }

      if (cookieOptions.domain) {
        cookieString += `; Domain=${cookieOptions.domain}`
      }

      // ✅ Secure: HTTPS only (obrigatório em produção, opcional em dev)
      if (cookieOptions.secure) {
        cookieString += '; Secure'
      }

      // ✅ HttpOnly: Não acessível via JavaScript (XSS protection)
      if (cookieOptions.httpOnly) {
        cookieString += '; HttpOnly'
      }

      // ✅ SameSite: CSRF protection
      if (cookieOptions.sameSite) {
        cookieString += `; SameSite=${cookieOptions.sameSite}`
      }

      // ✅ Aplicar o cookie
      if (typeof document !== 'undefined') {
        document.cookie = cookieString
        console.debug(`🍪 Cookie set: ${name}`)
      }
    } catch (error) {
      console.error(`❌ Error setting cookie "${name}":`, error)
      throw error
    }
  }

  /**
   * Ler um cookie de forma segura
   */
  get(name: string): string | null {
    try {
      if (typeof document === 'undefined') {
        return null
      }

      // ✅ Validar nome
      if (!this.validateCookieName(name)) {
        return null
      }

      const cookieName = `${encodeURIComponent(name)}=`
      const cookies = document.cookie.split(';')

      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim()
        if (trimmedCookie.startsWith(cookieName)) {
          const value = trimmedCookie.substring(cookieName.length)
          try {
            return decodeURIComponent(value)
          } catch (e) {
            console.warn(`Warning: Could not decode cookie value: ${value}`)
            return value
          }
        }
      }

      return null
    } catch (error) {
      console.error(`❌ Error getting cookie "${name}":`, error)
      return null
    }
  }

  /**
   * Obter todos os cookies como objeto
   */
  getAll(): Record<string, string> {
    try {
      if (typeof document === 'undefined') {
        return {}
      }

      const cookies: Record<string, string> = {}
      const cookiePairs = document.cookie.split(';')

      for (const pair of cookiePairs) {
        const trimmed = pair.trim()
        const eqIndex = trimmed.indexOf('=')

        if (eqIndex > 0) {
          const name = decodeURIComponent(trimmed.substring(0, eqIndex))
          const value = decodeURIComponent(trimmed.substring(eqIndex + 1))
          cookies[name] = value
        }
      }

      return cookies
    } catch (error) {
      console.error('❌ Error getting all cookies:', error)
      return {}
    }
  }

  /**
   * Remover/Invalidar um cookie (logout)
   * Define maxAge = 0 para remover imediatamente
   */
  remove(name: string, options: Omit<CookieOptions, 'maxAge'> = {}): void {
    try {
      if (!this.validateCookieName(name)) {
        throw new Error(`Cookie name invalid: "${name}"`)
      }

      // ✅ Remover definindo maxAge = 0
      this.set(name, '', {
        ...options,
        maxAge: 0
      })

      console.debug(`🗑️ Cookie removed: ${name}`)
    } catch (error) {
      console.error(`❌ Error removing cookie "${name}":`, error)
      throw error
    }
  }

  /**
   * Limpar todos os cookies (logout completo)
   */
  clear(excludeNames: string[] = []): void {
    try {
      const allCookies = this.getAll()

      for (const name of Object.keys(allCookies)) {
        if (!excludeNames.includes(name)) {
          this.remove(name)
        }
      }

      console.debug('🗑️ All cookies cleared')
    } catch (error) {
      console.error('❌ Error clearing cookies:', error)
      throw error
    }
  }

  /**
   * Existência de cookie
   */
  exists(name: string): boolean {
    return this.get(name) !== null
  }

  /**
   * ✅ VALIDAÇÃO: Validar nome do cookie
   * - Não pode conter caracteres especiais perigosos
   * - Não pode estar vazio
   */
  private validateCookieName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false
    }

    // ✅ Rejeitar caracteres especiais perigosos
    const invalidChars = /[;,\s=]/
    if (invalidChars.test(name)) {
      console.warn(`Invalid cookie name: "${name}" contains illegal characters`)
      return false
    }

    return true
  }

  /**
   * ✅ SANITIZAÇÃO: Sanitizar valor do cookie
   * - Remove caracteres de controle
   * - Limita tamanho (máx 4096 bytes, mas recomendado 512)
   */
  private sanitizeValue(value: string): string {
    if (typeof value !== 'string') {
      value = String(value)
    }

    // ✅ Remover caracteres de controle perigosos
    let sanitized = value.replace(/[\x00-\x1f\x7f]/g, '')

    // ✅ Limitar tamanho
    const maxSize = 512 // Recomendado para compatibilidade
    if (sanitized.length > maxSize) {
      console.warn(`Cookie value truncated from ${sanitized.length} to ${maxSize} bytes`)
      sanitized = sanitized.substring(0, maxSize)
    }

    return sanitized
  }

  /**
   * ✅ BUILDER: Construir opções de cookie com defaults seguros
   */
  private buildCookieOptions(options: CookieOptions): Required<CookieOptions> {
    const isProduction = this.config.environment === 'production'

    return {
      maxAge: options.maxAge ?? this.config.defaultMaxAge,
      path: options.path ?? this.config.defaultPath,
      domain: options.domain ?? this.config.defaultDomain,
      // ✅ Secure: HTTPS only (obrigatório em produção)
      secure: options.secure ?? isProduction,
      // ✅ HttpOnly: Não acessível via JavaScript (XSS protection)
      httpOnly: options.httpOnly ?? true,
      // ✅ SameSite: CSRF protection (Strict por padrão)
      sameSite: options.sameSite ?? 'Strict'
    }
  }
}

// ============================================================================
// INSTÂNCIAS PRÉ-CONFIGURADAS
// ============================================================================

/**
 * Cookie manager com configuração padrão
 */
export const cookieManager = new CookieManager({
  environment: process.env.NODE_ENV as 'development' | 'production',
  defaultMaxAge: 7 * 24 * 60 * 60, // 7 dias
  defaultPath: '/',
  defaultDomain: ''
})

/**
 * Cookie manager para tokens de autenticação (com tempo de expiração menor)
 */
export const authCookieManager = new CookieManager({
  environment: process.env.NODE_ENV as 'development' | 'production',
  defaultMaxAge: 60 * 60, // 1 hora
  defaultPath: '/',
  defaultDomain: ''
})

/**
 * Cookie manager para dados não-sensíveis (preferências, etc)
 */
export const preferencesCookieManager = new CookieManager({
  environment: process.env.NODE_ENV as 'development' | 'production',
  defaultMaxAge: 30 * 24 * 60 * 60, // 30 dias
  defaultPath: '/',
  defaultDomain: ''
})

// ============================================================================
// CONSTANTES DE SEGURANÇA
// ============================================================================

export const COOKIE_CONSTANTS = {
  // Nomes de cookies
  AUTH_TOKEN: 'sb_auth_token',
  REFRESH_TOKEN: 'sb_refresh_token',
  SESSION_ID: 'session_id',
  PREFERENCES: 'user_preferences',

  // Tempos de expiração (segundos)
  AUTH_TOKEN_EXPIRY: 60 * 60, // 1 hora
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 dias
  SESSION_EXPIRY: 30 * 60, // 30 minutos (inatividade)

  // Caminhos
  DEFAULT_PATH: '/',

  // Configurações SameSite
  CSRF_PROTECTION: 'Strict' as const
}

// ============================================================================
// TIPOS
// ============================================================================

export type CookieManagerType = typeof cookieManager
export type CookieOptions_ = CookieOptions
export type CookieManagerConfig_ = CookieManagerConfig
