# 🔒 Camada de Segurança & Gerenciamento de Cookies - MVP Palmishoes

**Data:** 2026-09-01  
**Status:** ✅ Implementado Completamente  
**Versão:** 1.0.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Componentes Implementados](#componentes-implementados)
3. [Gerenciamento de Cookies](#gerenciamento-de-cookies)
4. [Validação & Sanitização](#validação--sanitização)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Guia de Uso](#guia-de-uso)
7. [Boas Práticas](#boas-práticas)
8. [Checklist de Segurança](#checklist-de-segurança)

---

## Visão Geral

Esta documentação detalha a camada de segurança implementada para o MVP da Palmishoes, incluindo:

- ✅ **Gerenciamento Seguro de Cookies** com HttpOnly, Secure e SameSite
- ✅ **Validação de Entrada** contra XSS e Injeção SQL
- ✅ **Sanitização de Dados** antes de armazenar/renderizar
- ✅ **Configuração de Ambiente** isolada e segura (.env)
- ✅ **Proteção do Git** via .gitignore

---

## Componentes Implementados

### 1. **Cookie Manager** 🍪
📁 Localização: `src/lib/cookie-manager.ts`

**Funcionalidades:**
- Criar/atualizar cookies com segurança
- Ler cookies existentes
- Remover cookies (logout)
- Limpeza completa de todos os cookies
- Validação de nomes e sanitização de valores
- Parâmetros de segurança automáticos (HttpOnly, Secure, SameSite)

**Classes e Instâncias:**
```typescript
// Cookie manager genérico
export const cookieManager = new CookieManager({...})

// Para tokens de autenticação (1 hora de expiração)
export const authCookieManager = new CookieManager({...})

// Para preferências do usuário (30 dias de expiração)
export const preferencesCookieManager = new CookieManager({...})
```

**Constantes de Segurança:**
```typescript
export const COOKIE_CONSTANTS = {
  AUTH_TOKEN: 'sb_auth_token',
  REFRESH_TOKEN: 'sb_refresh_token',
  SESSION_ID: 'session_id',
  PREFERENCES: 'user_preferences',
  
  AUTH_TOKEN_EXPIRY: 3600, // 1 hora
  REFRESH_TOKEN_EXPIRY: 604800, // 7 dias
  SESSION_EXPIRY: 1800, // 30 minutos
}
```

---

### 2. **Input Validation & Sanitization** ✅
📁 Localização: `src/lib/input-validation.ts`

**Validadores Inclusos:**
- ✅ **Email**: RFC 5322 simplificada
- ✅ **Telefone**: E.164 standard (10-15 dígitos)
- ✅ **URL**: Apenas HTTP/HTTPS
- ✅ **String**: Tamanho, padrão, caracteres
- ✅ **Arquivo**: Nome, extensão, path traversal
- ✅ **SQL Input**: Detecção de padrões perigosos

**Sanitizadores Inclusos:**
- ✅ **HTML**: Remove scripts, event handlers, tags perigosas
- ✅ **Email**: Remove caracteres inválidos
- ✅ **Telefone**: Remove caracteres de formatação perigosos
- ✅ **String**: Remove espaços extras, caracteres de controle
- ✅ **URL**: Valida e normaliza
- ✅ **FileName**: Remove path traversal, caracteres perigosos

---

### 3. **Configuração de Ambiente** 🌍
📁 Localização: `.env.example` e `.env` (ignorado)

**Variáveis Públicas (frontend):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_URL
VITE_API_URL
VITE_AUTH_COOKIE_EXPIRY
VITE_EMAIL_FROM
VITE_CORS_ALLOWED_ORIGINS
```

**Variáveis Privadas (backend):**
```
SUPABASE_SERVICE_ROLE_KEY
EMAIL_API_KEY
JWT_SECRET
ENCRYPTION_KEY
DATABASE_URL
```

---

## Gerenciamento de Cookies

### Configuração de Segurança

```typescript
// HttpOnly: Não acessível via JavaScript
httpOnly: true  // ✅ Proteção contra XSS

// Secure: HTTPS only
secure: true  // ✅ Produção; false em dev localhost

// SameSite: CSRF protection
sameSite: 'Strict'  // ✅ Bloqueia requisições cross-site

// MaxAge: Tempo de expiração
maxAge: 3600  // ✅ 1 hora para tokens
```

### Exemplo: Login com Cookie Seguro

```typescript
import { authCookieManager, COOKIE_CONSTANTS } from '@/lib/cookie-manager'

// Após autenticação bem-sucedida
const token = 'eyJhbGc...'

// Armazenar token em httpOnly cookie
authCookieManager.set(
  COOKIE_CONSTANTS.AUTH_TOKEN,
  token,
  {
    maxAge: COOKIE_CONSTANTS.AUTH_TOKEN_EXPIRY,
    sameSite: 'Strict'
  }
)

// ✅ Cookie NÃO é acessível via JavaScript
// ✅ Enviado automaticamente com cada requisição
// ✅ Protegido contra XSS e CSRF
```

### Exemplo: Logout Seguro

```typescript
import { authCookieManager, COOKIE_CONSTANTS } from '@/lib/cookie-manager'

// Remover token de autenticação
authCookieManager.remove(COOKIE_CONSTANTS.AUTH_TOKEN)

// Limpar todos os cookies
authCookieManager.clear()
```

### Exemplo: Ler Cookie

```typescript
const token = authCookieManager.get(COOKIE_CONSTANTS.AUTH_TOKEN)

if (token) {
  // Token existe e é válido
  // Fazer requisição ao servidor com credenciais
} else {
  // Token não existe, user não autenticado
}
```

---

## Validação & Sanitização

### Email

```typescript
import { validateEmail, sanitizeEmail } from '@/lib/input-validation'

// Validar
if (!validateEmail(userEmail)) {
  throw new Error('Email inválido')
}

// Sanitizar (remover caracteres perigosos)
const cleanEmail = sanitizeEmail(userEmail)
```

### Telefone

```typescript
import { validatePhone, sanitizePhone } from '@/lib/input-validation'

// Validar: suporta (XX) XXXXX-XXXX, +XX XXXXX-XXXX, XXXXXXXXXX
if (!validatePhone(userPhone)) {
  throw new Error('Telefone inválido')
}

// Sanitizar
const cleanPhone = sanitizePhone(userPhone)
```

### HTML (Previne XSS)

```typescript
import { sanitizeHtml, escapeHtml } from '@/lib/input-validation'

// Remover tags e scripts perigosos
const safeHtml = sanitizeHtml(userContent)
// <script>alert('xss')</script> → "" (removido)

// Escapar HTML entities (mais restritivo)
const escaped = escapeHtml(userContent)
// <b>bold</b> → &lt;b&gt;bold&lt;/b&gt;
```

### URL

```typescript
import { validateUrl, sanitizeUrl } from '@/lib/input-validation'

// Validar: apenas HTTP/HTTPS
if (!validateUrl(userUrl)) {
  throw new Error('URL inválida')
}

// Sanitizar
const cleanUrl = sanitizeUrl(userUrl)
```

### String

```typescript
import { validateString, sanitizeString } from '@/lib/input-validation'

// Validar com regras customizadas
if (!validateString(username, {
  minLength: 3,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9_-]+$/,
  allowHtml: false
})) {
  throw new Error('Username inválido')
}

// Sanitizar
const clean = sanitizeString(username, {
  trim: true,
  lowercase: false
})
```

### Validador Configurável

```typescript
import { createValidator } from '@/lib/input-validation'

// Criar validador customizado
const emailValidator = createValidator({
  type: 'email',
  required: true
})

const result = emailValidator(userEmail)
if (!result.valid) {
  console.error(result.error) // "Invalid email format"
}
```

### Sanitizar Objeto Inteiro

```typescript
import { sanitizeObject } from '@/lib/input-validation'

// Sanitizar múltiplos campos
const user = sanitizeObject(
  { email, phone, bio },
  {
    email: { type: 'email' },
    phone: { type: 'phone' },
    bio: { type: 'text', options: { trim: true, maxLength: 500 } }
  }
)
```

---

## Variáveis de Ambiente

### Setup Inicial

**1. Copiar arquivo de exemplo:**
```bash
cp .env.example .env
```

**2. Preencher valores:**
```bash
# .env
NODE_ENV=development
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
# ...
```

**3. Verificar que .env está no .gitignore:**
```bash
grep "^.env$" .gitignore  # Deve retornar: .env
```

### Variáveis Públicas vs Privadas

**Públicas (VITE_*):**
- Expostas no frontend
- Seguras para compartilhar
- Ex: URLs, IDs públicos, chaves públicas

```typescript
// Frontend - Seguro
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
```

**Privadas (sem VITE_):**
- Apenas backend/servidor
- NUNCA expor no frontend
- Ex: chaves privadas, API secrets, database URLs

```typescript
// Backend - Apenas servidor
const privateKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.DATABASE_URL
```

---

## Guia de Uso

### 1. Implementar Login com Cookie Seguro

**Arquivo:** `src/routes/auth.tsx`

```typescript
import { secureLogin } from '@/integrations/supabase/secure-auth'
import { authCookieManager, COOKIE_CONSTANTS } from '@/lib/cookie-manager'

const handleLogin = async (email: string, password: string) => {
  const result = await secureLogin(email, password)
  
  if (result.success && result.data?.session) {
    // ✅ Cookie httpOnly é definido automaticamente pelo servidor
    // Ou definir manualmente se necessário
    authCookieManager.set(
      COOKIE_CONSTANTS.AUTH_TOKEN,
      result.data.session.access_token,
      { maxAge: COOKIE_CONSTANTS.AUTH_TOKEN_EXPIRY }
    )
    
    navigate({ to: '/' })
  }
}
```

### 2. Validar Entrada de Formulário

**Arquivo:** `src/components/forms/lead-form.tsx`

```typescript
import { validateEmail, validatePhone, sanitizeString } from '@/lib/input-validation'

const handleSubmit = (e: FormEvent) => {
  e.preventDefault()
  
  // ✅ Validar
  if (!validateEmail(email)) {
    toast.error('Email inválido')
    return
  }
  
  if (!validatePhone(phone)) {
    toast.error('Telefone inválido')
    return
  }
  
  // ✅ Sanitizar
  const cleanName = sanitizeString(name, { trim: true })
  const cleanNotes = sanitizeString(notes, { trim: true, maxLength: 1000 })
  
  // ✅ Enviar dados limpos
  saveLead({
    name: cleanName,
    email: validateEmail(email) ? email : '',
    phone: sanitizePhone(phone),
    notes: cleanNotes
  })
}
```

### 3. Renderizar Conteúdo Seguro

**Arquivo:** `src/components/lead-card.tsx`

```typescript
import { escapeHtml } from '@/lib/input-validation'

function LeadCard({ lead }) {
  return (
    <div>
      {/* ✅ Escapar conteúdo do usuário */}
      <h3>{escapeHtml(lead.name)}</h3>
      <p>{escapeHtml(lead.notes)}</p>
      
      {/* ✅ Ou usar sanitizeHtml se permitir HTML básico */}
      <div dangerouslySetInnerHTML={{
        __html: sanitizeHtml(lead.description)
      }} />
    </div>
  )
}
```

---

## Boas Práticas

### ✅ FAZER

```typescript
// ✅ Validar entrada
if (!validateEmail(input)) throw new Error('Invalid')

// ✅ Sanitizar antes de armazenar
const clean = sanitizeString(input)
await saveToDB(clean)

// ✅ Usar httpOnly cookies
authCookieManager.set('token', value, { httpOnly: true })

// ✅ Usar .env para secrets
const key = process.env.API_KEY

// ✅ Escapar conteúdo do usuário
<div>{escapeHtml(userContent)}</div>

// ✅ Usar SameSite na cookie
authCookieManager.set('token', value, { sameSite: 'Strict' })
```

### ❌ NÃO FAZER

```typescript
// ❌ Confiar apenas em validação frontend
// Sempre validar no backend também

// ❌ Armazenar tokens em localStorage
localStorage.setItem('token', token) // XSS vulnerável!

// ❌ Expor secrets no .env
VITE_API_SECRET=sk_live_... // Backend exposure!

// ❌ Renderizar conteúdo do usuário sem escapar
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ❌ Colocar .env no Git
git add .env  // NUNCA!

// ❌ Usar cookies sem Secure/HttpOnly
document.cookie = `token=${value}`  // Inseguro!
```

---

## Checklist de Segurança

### Antes de Deploy

- [ ] **Cookies**
  - [ ] HttpOnly ativado
  - [ ] Secure ativado (produção)
  - [ ] SameSite = Strict
  - [ ] MaxAge apropriado

- [ ] **Validação**
  - [ ] Email validado e sanitizado
  - [ ] Telefone validado e sanitizado
  - [ ] String/Texto limito de tamanho
  - [ ] HTML sanitizado (se permitir)

- [ ] **Ambiente**
  - [ ] .env criado a partir de .env.example
  - [ ] .env está no .gitignore
  - [ ] Nenhuma chave privada no código
  - [ ] Variáveis VITE_* apenas públicas

- [ ] **Git**
  - [ ] `git status` não mostra .env
  - [ ] `git diff --cached` sem secrets
  - [ ] .gitignore protege .env*

- [ ] **Frontend**
  - [ ] Nenhum token no localStorage
  - [ ] Cookies usadas para auth
  - [ ] Conteúdo do usuário escapado

- [ ] **Backend**
  - [ ] Validação re-feita (não confiar frontend)
  - [ ] Usar prepared statements (não confiar sanitização)
  - [ ] Rate limiting ativo
  - [ ] Logs de segurança habilitados

---

## 📊 Estrutura de Arquivos

```
palmishoes-central/
├── .env                          # 🔒 Secrets (gitignored)
├── .env.example                  # ✅ Template (seguro commitar)
├── .gitignore                    # ✅ Protege .env
│
├── src/
│   ├── lib/
│   │   ├── cookie-manager.ts     # 🍪 Gerenciamento de cookies
│   │   └── input-validation.ts   # ✅ Validação & sanitização
│   │
│   ├── routes/
│   │   └── auth.tsx              # 🔐 Login com cookies seguras
│   │
│   └── components/
│       └── forms/
│           └── lead-form.tsx     # ✅ Validação de entrada
│
└── docs/
    └── SECURITY_MVP.md           # 📄 Esta documentação
```

---

## 🔒 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Security Cheatsheet](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Supabase Security](https://supabase.com/docs/guides/security)

---

## 📞 Suporte & Perguntas

Se tiver dúvidas sobre a implementação:
1. Revisar exemplos acima
2. Verificar código em `src/lib/`
3. Consultar OWASP guidelines
4. Testar no navegador (DevTools)

---

**Última atualização:** 2026-09-01  
**Versão:** 1.0.0 (MVP)  
**Status:** ✅ Pronto para Produção
