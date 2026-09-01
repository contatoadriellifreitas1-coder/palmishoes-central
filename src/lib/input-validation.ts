/**
 * ✅ Input Validation & Sanitization - Prevenção de XSS e Injeção
 * 
 * Responsável por:
 * - Validar inputs (email, telefone, URL, etc)
 * - Sanitizar valores para prevenir XSS
 * - Escapar caracteres perigosos
 * - Limpar dados antes de salvar no banco/renderizar
 * 
 * Uso:
 * import { validateEmail, sanitizeHtml, validatePhone } from '@/lib/input-validation'
 * 
 * // Validar email
 * if (!validateEmail(email)) throw new Error('Email inválido')
 * 
 * // Sanitizar HTML (previne XSS)
 * const safeHtml = sanitizeHtml(userContent)
 * 
 * // Validar telefone
 * if (!validatePhone(phone)) throw new Error('Telefone inválido')
 */

// ============================================================================
// 1. EMAIL VALIDATION
// ============================================================================

/**
 * ✅ Validar email
 * - Verifica formato RFC 5322 simplificado
 * - Rejeita caracteres perigosos
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // ✅ Regex simplificada mas segura
  // RFC 5322 completa é muito complexa, usar versão prática
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email.trim())) {
    return false
  }

  // ✅ Tamanho máximo
  if (email.length > 254) {
    console.warn('Email too long (max 254 characters)')
    return false
  }

  // ✅ Rejeitar caracteres de controle e espaços
  if (/[\x00-\x1f\s]/.test(email)) {
    return false
  }

  return true
}

/**
 * Sanitizar email: remover caracteres perigosos
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@.-]/gi, '')
}

// ============================================================================
// 2. PHONE VALIDATION
// ============================================================================

/**
 * ✅ Validar telefone
 * - Suporta formatos: (XX) XXXXX-XXXX, +XX XXXXX-XXXX, XXXXXXXXXX
 * - Rejeita caracteres perigosos (exceto números e caracteres de formatação)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }

  // ✅ Remover espaços e caracteres de formatação
  const cleanPhone = phone.replace(/[\s\-().+]/g, '')

  // ✅ Deve ter entre 10 e 15 dígitos (E.164 standard)
  if (!/^\d{10,15}$/.test(cleanPhone)) {
    return false
  }

  // ✅ Rejeitar sequências suspeitas (todas zeros, todos números iguais)
  if (/^(\d)\1+$/.test(cleanPhone)) {
    return false
  }

  return true
}

/**
 * Sanitizar telefone: remover caracteres perigosos
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-().\s]/g, '')
}

// ============================================================================
// 3. URL VALIDATION
// ============================================================================

/**
 * ✅ Validar URL
 * - Apenas protocolos seguros: http, https
 * - Rejeita: javascript:, data:, etc
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const urlObj = new URL(url)

    // ✅ Apenas HTTP e HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false
    }

    // ✅ Rejeitar URLs muito longas (possível DoS)
    if (url.length > 2048) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Sanitizar URL: garantir que é segura
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    // ✅ Apenas http e https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return ''
    }

    return urlObj.toString()
  } catch {
    return ''
  }
}

// ============================================================================
// 4. HTML SANITIZATION (Previne XSS)
// ============================================================================

/**
 * ✅ Sanitizar HTML: remover scripts e tags perigosas
 * Previne XSS attacks quando usuários inserem conteúdo
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // ✅ Remover scripts
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // ✅ Remover event handlers perigosos
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '')

  // ✅ Remover tags e atributos perigosos
  const dangerousTags = ['iframe', 'object', 'embed', 'applet', 'meta', 'link', 'style', 'form']
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi')
    sanitized = sanitized.replace(regex, '')
  }

  // ✅ Remover atributos javascript:
  sanitized = sanitized.replace(/href\s*=\s*["']?javascript:[^"']*["']?/gi, 'href="#"')

  // ✅ Remover caracteres de controle perigosos
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return sanitized
}

/**
 * Escapar HTML: converter caracteres especiais em entidades
 * Útil para renderizar texto do usuário sem interpretar HTML
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }

  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

// ============================================================================
// 5. TEXT VALIDATION & SANITIZATION
// ============================================================================

/**
 * ✅ Validar string: não vazia, tamanho, caracteres
 */
export function validateString(
  value: string,
  options: {
    minLength?: number // Default: 1
    maxLength?: number // Default: 10000
    allowHtml?: boolean // Default: false
    pattern?: RegExp // Pattern adicional
  } = {}
): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const minLength = options.minLength ?? 1
  const maxLength = options.maxLength ?? 10000

  // ✅ Verificar tamanho
  if (value.length < minLength || value.length > maxLength) {
    return false
  }

  // ✅ Verificar padrão customizado
  if (options.pattern && !options.pattern.test(value)) {
    return false
  }

  // ✅ Se não permitir HTML, rejeitar tags
  if (!options.allowHtml && /<[^>]*>/g.test(value)) {
    return false
  }

  return true
}

/**
 * Sanitizar string: remover espaços extras, caracteres de controle
 */
export function sanitizeString(value: string, options: { trim?: boolean; lowercase?: boolean } = {}): string {
  if (!value || typeof value !== 'string') {
    return ''
  }

  let sanitized = value

  // ✅ Trim
  if (options.trim !== false) {
    sanitized = sanitized.trim()
  }

  // ✅ Remover espaços múltiplos
  sanitized = sanitized.replace(/\s+/g, ' ')

  // ✅ Remover caracteres de controle
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '')

  // ✅ Lowercase
  if (options.lowercase) {
    sanitized = sanitized.toLowerCase()
  }

  return sanitized
}

// ============================================================================
// 6. SPECIAL CHARACTERS & SQL INJECTION PREVENTION
// ============================================================================

/**
 * ✅ Sanitizar contra SQL Injection: escapar aspas simples
 * NOTA: Usar prepared statements é sempre mais seguro!
 * Esta função é apenas uma camada adicional.
 */
export function escapeSqlString(value: string): string {
  if (!value || typeof value !== 'string') {
    return ''
  }

  // ✅ Escapar aspas simples
  return value.replace(/'/g, "''")
}

/**
 * ✅ Validar contra injeção: rejeitar caracteres perigosos SQL
 */
export function isValidSqlInput(value: string): boolean {
  if (typeof value !== 'string') {
    return false
  }

  // ✅ Rejeitar comandos SQL perigosos
  const dangerousPatterns = [
    /union\s+select/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /update\s+.*\s+set/i,
    /drop\s+table/i,
    /drop\s+database/i,
    /exec\s*\(/i,
    /execute\s*\(/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      console.warn(`Potentially dangerous SQL pattern detected: ${pattern.source}`)
      return false
    }
  }

  return true
}

// ============================================================================
// 7. FILE VALIDATION
// ============================================================================

/**
 * ✅ Validar nome de arquivo: rejeitar caracteres perigosos
 */
export function validateFileName(filename: string, allowedExtensions: string[] = []): boolean {
  if (!filename || typeof filename !== 'string') {
    return false
  }

  // ✅ Tamanho máximo
  if (filename.length > 255) {
    return false
  }

  // ✅ Rejeitar caminhos (path traversal)
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false
  }

  // ✅ Rejeitar caracteres de controle
  if (/[\x00-\x1f\x7f]/.test(filename)) {
    return false
  }

  // ✅ Verificar extensão
  if (allowedExtensions.length > 0) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      return false
    }
  }

  return true
}

/**
 * Sanitizar nome de arquivo
 */
export function sanitizeFileName(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file'
  }

  // ✅ Remover path traversal
  const clean = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '')

  // ✅ Remover caracteres perigosos
  const sanitized = clean.replace(/[^a-zA-Z0-9._-]/g, '_')

  // ✅ Garantir que não está vazio
  return sanitized || 'file'
}

// ============================================================================
// 8. COMPREHENSIVE VALIDATOR
// ============================================================================

/**
 * Validador configurável para diferentes tipos de entrada
 */
export const createValidator = (rules: {
  type?: 'email' | 'phone' | 'url' | 'string' | 'number'
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean
}) => {
  return (value: any): { valid: boolean; error?: string } => {
    // ✅ Verificar se é obrigatório
    if (rules.required && !value) {
      return { valid: false, error: 'This field is required' }
    }

    if (!value) {
      return { valid: true }
    }

    // ✅ Validar por tipo
    switch (rules.type) {
      case 'email':
        if (!validateEmail(value)) {
          return { valid: false, error: 'Invalid email format' }
        }
        break

      case 'phone':
        if (!validatePhone(value)) {
          return { valid: false, error: 'Invalid phone format' }
        }
        break

      case 'url':
        if (!validateUrl(value)) {
          return { valid: false, error: 'Invalid URL' }
        }
        break

      case 'number':
        if (isNaN(Number(value))) {
          return { valid: false, error: 'Must be a number' }
        }
        break

      case 'string':
      default:
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string' }
        }
    }

    // ✅ Verificar tamanho
    if (rules.minLength && String(value).length < rules.minLength) {
      return { valid: false, error: `Minimum length is ${rules.minLength}` }
    }

    if (rules.maxLength && String(value).length > rules.maxLength) {
      return { valid: false, error: `Maximum length is ${rules.maxLength}` }
    }

    // ✅ Verificar padrão
    if (rules.pattern && !rules.pattern.test(String(value))) {
      return { valid: false, error: 'Invalid format' }
    }

    // ✅ Validação customizada
    if (rules.custom && !rules.custom(value)) {
      return { valid: false, error: 'Validation failed' }
    }

    return { valid: true }
  }
}

// ============================================================================
// 9. SANITIZER MIDDLEWARE
// ============================================================================

/**
 * Sanitizar objeto inteiro
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, { type: 'email' | 'phone' | 'url' | 'string' | 'html' | 'text'; options?: any }>
): T {
  const sanitized = { ...obj }

  for (const [key, config] of Object.entries(schema)) {
    const value = obj[key as keyof T]

    if (value === null || value === undefined) {
      continue
    }

    switch (config.type) {
      case 'email':
        sanitized[key as keyof T] = sanitizeEmail(String(value)) as any
        break

      case 'phone':
        sanitized[key as keyof T] = sanitizePhone(String(value)) as any
        break

      case 'url':
        sanitized[key as keyof T] = sanitizeUrl(String(value)) as any
        break

      case 'html':
        sanitized[key as keyof T] = sanitizeHtml(String(value)) as any
        break

      case 'text':
      case 'string':
      default:
        sanitized[key as keyof T] = sanitizeString(String(value), config.options) as any
    }
  }

  return sanitized
}
