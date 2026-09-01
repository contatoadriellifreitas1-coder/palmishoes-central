# 🔒 Análise de Segurança de Dados Sensíveis - Palmishoes

**Data:** 2026-09-01  
**Status:** ✅ SEGURO (com recomendações)

---

## 📊 Dados Sensíveis Identificados

| Dado | Local | Status | Proteção |
|------|-------|--------|----------|
| **Email** | `profiles` table | ✅ Seguro | RLS: Usuário vê apenas seu próprio |
| **Telefone** | `leads` table | ✅ Seguro | RLS: Acesso por role + proprietário |
| **Senhas** | `auth.users` (Supabase) | ✅ Seguro | Hasheadas (bcrypt), nunca expostas |
| **Tokens JWT** | localStorage | ⚠️ Atenção | Recomendação: usar httpOnly cookies |
| **API Keys** | Environment vars | ✅ Seguro | `VITE_SUPABASE_PUBLISHABLE_KEY` (pública) |
| **Notas de Leads** | `leads.notes` | ✅ Seguro | RLS: Acesso restrito |
| **Valores de Negócio** | `leads.estimated_value` | ✅ Seguro | RLS: Acesso restrito |

---

## ✅ O QUE ESTÁ SEGURO

### 1. **Autenticação**
```typescript
// ✅ Correto: Supabase gerencia senhas
const { error } = await supabase.auth.signInWithPassword({
  email: parsed.data.email,
  password: parsed.data.password
});
// Senhas NUNCA são armazenadas no código ou localStorage
```

### 2. **Chaves de API**
```typescript
// ✅ Correto: Usando PUBLISHABLE_KEY (pública)
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ❌ ERRADO (não existe no projeto): usar SECRET_KEY no frontend
// const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY;
```

### 3. **Row Level Security (RLS)**
Todas as tabelas com dados sensíveis têm RLS ativado:

```sql
-- Exemplo: Perfil do usuário
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
  
-- Resultado: Usuário 123 só vê profile de 123
SELECT * FROM profiles; -- Retorna apenas seu próprio perfil
```

### 4. **Validação de Entrada**
```typescript
// ✅ Email validado com regex
const schema = z.object({
  email: z.string().email()
});

// ✅ Telefone validado no banco
// CHECK (phone ~ '^[+0-9\s\-()]{10,}$')

// ✅ Senhas validadas no Supabase
password: z.string().min(6).max(72)
```

### 5. **Encriptação em Trânsito**
- Todas as conexões com Supabase usam **HTTPS**
- Supabase enforce SSL/TLS automaticamente

### 6. **Auditoria Implementada**
```sql
-- Cada mudança é registrada
INSERT INTO audit_logs (user_id, operation, old_values, new_values, created_at)
VALUES (...);

-- Você pode rastrear: quem mudou, o quê, quando
SELECT * FROM audit_logs WHERE table_name = 'profiles';
```

---

## ⚠️ RECOMENDAÇÕES DE MELHORIA

### 1. **Usar httpOnly Cookies para Tokens (IMPORTANTE)**
**Problema Atual:**
```typescript
// localStorage é vulnerável a XSS
storage: typeof window !== 'undefined' ? localStorage : undefined,
```

**Solução Recomendada:**
```typescript
// Implementar no backend um endpoint que retorna token em httpOnly cookie
// Assim tokens não ficam acessíveis via JavaScript
import { createServerFn } from '@tanstack/react-start/server'

export const getSession = createServerFn({ method: 'GET' })(async () => {
  // Cookie é enviado automaticamente pelo navegador
  // Mas não é acessível via `document.cookie` (seguro contra XSS)
  const session = getSessionFromCookie();
  return session;
});
```

### 2. **Adicionar Content Security Policy (CSP)**
Crie/atualize `public/index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    connect-src 'self' https://your-project.supabase.co;
    img-src 'self' data: https:;
    style-src 'self' 'unsafe-inline';
  ">
```

### 3. **Implementar CORS Seguro**
No Supabase dashboard, configurar CORS permitindo apenas seu domínio:
```bash
# Ao invés de: * (qualquer origem)
# Use: https://palmishoes.com.br
```

### 4. **Rate Limiting nas APIs**
Criar função que limite requisições:
```typescript
// Após implementar: máx 100 requisições por IP por hora
export const limitRequests = createServerFn(async () => {
  const ip = getClientIp();
  const count = await checkRateLimit(ip);
  if (count > 100) throw new Error("Too many requests");
});
```

### 5. **Encriptação de Campos Sensíveis (Futuro)**
Se precisar de mais dados sensíveis (cartão de crédito, CPF):
```sql
-- Usar pgcrypto ou similar
ALTER TABLE leads ADD COLUMN sensitive_data BYTEA;
UPDATE leads 
SET sensitive_data = pgp_sym_encrypt(notes, current_setting('app.encryption_key'));
```

### 6. **Adicionar Headers de Segurança**
No `vite.config.ts` ou servidor:
```typescript
export default {
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
}
```

### 7. **Secrets Rotation**
```bash
# Recomendação: Rotacionar SUPABASE_PUBLISHABLE_KEY anualmente
# Supabase oferece versioning de chaves
```

---

## 🔍 CHECKLIST DE SEGURANÇA ATUAL

### Implementado ✅
- [x] RLS policies em todas as tabelas sensíveis
- [x] Validação de email e telefone
- [x] Auditoria de mudanças
- [x] Senhas gerenciadas pelo Supabase (hasheadas)
- [x] HTTPS obrigatório (Supabase)
- [x] Roles baseados em usuário (RBAC)
- [x] Soft delete para rastreabilidade
- [x] Environment variables para chaves públicas
- [x] Sem exposição de SECRET_KEY no frontend

### Pendente ⚠️
- [ ] httpOnly cookies para sessão (em vez de localStorage)
- [ ] Content Security Policy (CSP)
- [ ] Rate limiting em endpoints
- [ ] Headers de segurança (X-Frame-Options, etc)
- [ ] 2FA (Two-Factor Authentication)
- [ ] Encriptação adicional para dados ultra-sensíveis
- [ ] Backup automático de audit logs

---

## 🚨 DADOS QUE NUNCA DEVEM SER ARMAZENADOS

❌ **NUNCA fazer isso:**
```typescript
// ❌ ERRADO: Armazenar senha em localStorage
localStorage.setItem('password', userPassword);

// ❌ ERRADO: Colocar API SECRET no frontend
const SUPABASE_SECRET = import.meta.env.VITE_SUPABASE_SECRET;

// ❌ ERRADO: Log de dados sensíveis
console.log('User password:', password);

// ❌ ERRADO: Passar senha na URL
navigate(`/dashboard?password=${password}`);

// ❌ ERRADO: Armazenar dados de cartão de crédito sem encriptação
const cardData = { number: '1234-5678-9012-3456' };
localStorage.setItem('card', JSON.stringify(cardData));
```

✅ **FAZER assim:**
```typescript
// ✅ Deixar Supabase gerenciar autenticação
const { data, error } = await supabase.auth.signUp({
  email,
  password
});
// Supabase retorna apenas session token, nunca a senha

// ✅ Usar environment variables para chaves públicas
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ✅ RLS protege dados no banco
// Usuário não consegue acessar via SQL injeção

// ✅ Usar HTTPS sempre
fetch('https://secure-api.com/data'); // Criptografado em trânsito
```

---

## 📱 Segurança no Frontend vs Backend

### Frontend (Navegador)
```
✅ Pode:
  - Usar VITE_SUPABASE_PUBLISHABLE_KEY
  - Chamar APIs públicas
  - Renderizar dados do usuário autenticado
  - Validar formulários (UX)

❌ NÃO pode:
  - Conter SUPABASE_SECRET_KEY
  - Fazer queries diretas bypass de RLS
  - Armazenar senhas
  - Confiar apenas em validação frontend
```

### Backend (Supabase)
```
✅ Faz:
  - Valida queries (server-side validation)
  - Aplica RLS policies (banco de dados)
  - Haseia senhas (bcrypt)
  - Auditoria de mudanças
  - Encriptação SSL/TLS

✅ Protege:
  - Dados sensíveis com políticas
  - Acesso com tokens JWT
  - SQL injection com prepared statements
```

---

## 🎯 PRÓXIMAS PRIORIDADES

### 1️⃣ **Urgent (Fazer em breve)**
- [ ] Implementar httpOnly cookies para sessão

### 2️⃣ **Important (Próximas semanas)**
- [ ] Adicionar CSP headers
- [ ] Implementar rate limiting
- [ ] Adicionar 2FA

### 3️⃣ **Nice to have (Futuro)**
- [ ] Encriptação adicional
- [ ] Backup automático de audit logs
- [ ] Secrets rotation

---

## 📞 Conclusão

**Status Geral: ✅ SEGURO**

Seus dados sensíveis estão bem protegidos pela combinação de:
1. **RLS policies** no banco (Layer 1)
2. **Validação de dados** (Layer 2)
3. **Auditoria completa** (Layer 3)
4. **Autenticação do Supabase** (Layer 4)
5. **HTTPS/TLS** (Layer 5)

As melhorias recomendadas (+httpOnly cookies, CSP, rate limiting) elevam a segurança para **nível enterprise**, mas o sistema atual já está em um nível **bem sólido**.

Quer que eu implemente alguma das recomendações? 🚀
