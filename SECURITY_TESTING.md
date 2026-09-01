# 🧪 Testes de Segurança - Verificação Manual

**Data:** 2026-09-01  
**Status:** ✅ Pronto para testar

## ✅ PASSO 1: Cookie Storage (Implementado)

### Teste 1.1: Verificar se localStorage NÃO é usado
```bash
# 1. Abrir DevTools (F12)
# 2. Ir para Application → Cookies
# 3. Verificar se existe cookie: sb_auth_token (httpOnly)
# 4. Ir para Application → Local Storage
# 5. Verificar que NÃO há token de autenticação
```

**Resultado esperado:**
```
✅ Cookie sb_auth_token existe (httpOnly: true)
✅ localStorage NÃO contém tokens de autenticação
✅ Cookie não é acessível via console: document.cookie (não aparece)
```

**Teste via Console:**
```javascript
// Tentar acessar cookie (NÃO vai aparecer porque é httpOnly)
console.log(document.cookie);
// Resultado: "" (vazio ou sem sb_auth_token)

// ✅ Correto! Token está protegido contra XSS
```

---

## ✅ PASSO 2: Rate Limiting (Implementado)

### Teste 2.1: Ativar Rate Limiting no Login

**Teste Automático:**
```bash
# Executar no terminal (6 tentativas seguidas):
for i in {1..6}; do
  curl -X POST https://localhost:5173/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\n Status: %{http_code}\n" \
    -s
  sleep 1
done
```

**Resultado esperado:**
```
Tentativa 1-5: 200 OK (ou erro de credenciais)
Tentativa 6: 429 Too Many Requests
{
  "error": "Too Many Requests",
  "retryAfter": 850
}
```

### Teste 2.2: Verificar Headers de Rate Limit

```bash
curl -I https://localhost:5173/api/auth/login

# Headers esperados:
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1693478400
```

**Resultado esperado:**
```
✅ X-RateLimit-Limit: 5 (máximo de tentativas)
✅ X-RateLimit-Remaining: 4 (tentativas restantes)
✅ X-RateLimit-Reset: 1693478400 (timestamp de reset)
```

---

## ✅ PASSO 3: Security Headers (Implementado)

### Teste 3.1: Verificar Headers Automaticamente

**Opção 1: Security Headers Website** (Recomendado)
1. Ir para: https://securityheaders.com
2. Digitar seu domínio (ex: https://palmishoes.com.br)
3. Verificar score

**Esperado:**
```
A+ Nota máxima indicaria:
- Strict-Transport-Security ✅
- X-Content-Type-Options ✅
- X-Frame-Options ✅
- X-XSS-Protection ✅
- Content-Security-Policy ✅
- Referrer-Policy ✅
```

**Opção 2: Via Terminal (curl)**
```bash
curl -I https://palmishoes.com.br

# Verificar presença de:
HTTP/2 200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: accelerometer=(), camera=(), ...
```

**Resultado esperado:**
```
✅ Todos os headers presentes
✅ Strict-Transport-Security ativado (HTTPS forçado)
✅ CSP restritiva (only self)
✅ Sem vulnerabilidades flagradas
```

### Teste 3.2: Verificar CSP funciona

**Teste via Console:**
```javascript
// CSP deve bloquear scripts de origem externa
const script = document.createElement('script');
script.src = 'https://external-site.com/malicious.js';
document.head.appendChild(script);

// Esperado: Error in console
// "Refused to load the script 'https://external-site.com/malicious.js' because it violates the following Content Security Policy directive"
```

**Resultado esperado:**
```
✅ CSP bloqueou script externo
✅ Mensagem de erro no console (esperado!)
✅ Proteção contra XSS funcionando
```

### Teste 3.3: Verificar X-Frame-Options

**Teste: Tentar embutir em iframe**
```html
<!-- Criar arquivo iframe-test.html -->
<html>
<body>
  <h1>Teste de Clickjacking</h1>
  <iframe src="https://palmishoes.com.br" style="width:800px;height:600px;"></iframe>
  <p>Seu site deve NÃO aparecer no iframe (bloqueado por X-Frame-Options: DENY)</p>
</body>
</html>
```

**Resultado esperado:**
```
✅ Painel NÃO aparece dentro do iframe
✅ Bloqueado por X-Frame-Options: DENY
✅ Proteção contra clickjacking funcionando
```

---

## ✅ PASSO 4: Teste Completo de Segurança

### Ferramenta 1: Mozilla Observatory
```
1. Ir para: https://observatory.mozilla.org
2. Digitar domínio
3. Aguardar resultado
4. Score esperado: 85+ (com nossas implementações)
```

### Ferramenta 2: OWASP ZAP (Gratuita)
```bash
# Instalar ZAP: https://www.zaproxy.org/
# Executar scan
zaproxy-scan.sh -t https://palmishoes.com.br -r security-report.html

# Verificar relatório
# Esperar resultados de:
# ✅ XSS: 0 vulnerabilidades
# ✅ CSRF: 0 vulnerabilidades  
# ✅ Clickjacking: 0 vulnerabilidades
# ✅ SQL Injection: 0 vulnerabilidades
```

### Ferramenta 3: Qualys SSL Labs
```
1. Ir para: https://www.ssllabs.com/ssltest/
2. Digitar domínio
3. Aguardar análise
4. Score esperado: A+ (com HSTS ativado)
```

---

## 📊 Checklist de Testes

### Cookies & Armazenamento
- [ ] localStorage NÃO contém tokens
- [ ] Cookie httpOnly presente
- [ ] Cookie não é acessível via document.cookie

### Rate Limiting
- [ ] 1-5 tentativas: 200 OK
- [ ] 6ª tentativa: 429 Too Many Requests
- [ ] Headers X-RateLimit-* presentes
- [ ] Bloqueio por IP funciona

### Security Headers
- [ ] Strict-Transport-Security presente
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy ativa
- [ ] Referrer-Policy configurada
- [ ] Permissions-Policy configurada

### CSP (Content Security Policy)
- [ ] Scripts internos funcionam
- [ ] Scripts externos são bloqueados
- [ ] Mensagens no console sobre bloqueios
- [ ] Inline styles funcionam (com 'unsafe-inline' em dev)

### Proteção contra Ataques
- [ ] XSS bloqueado por CSP
- [ ] Clickjacking bloqueado por X-Frame-Options
- [ ] MIME sniffing bloqueado
- [ ] Força bruta bloqueada por rate limit

### Teste de Ferramentas
- [ ] Security Headers score: A/A+
- [ ] Mozilla Observatory score: 85+
- [ ] OWASP ZAP: 0 vulnerabilidades críticas
- [ ] Qualys SSL Labs: A+

---

## 🚨 Problemas Comuns & Soluções

### Problema 1: CSP bloqueando Google Fonts
**Solução:**
```typescript
// Em security-headers.ts, adicionar:
'Content-Security-Policy': "...; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; ..."
```

### Problema 2: Rate Limit muito restritivo
**Solução:**
```typescript
// Em rate-limiter.ts, ajustar:
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // Aumentar de 15 para 30 minutos
  maxRequests: 10, // Aumentar de 5 para 10 tentativas
});
```

### Problema 3: httpOnly Cookies não funcionam em localhost
**Solução (dev only):**
```typescript
// Em cookie-storage.ts, para desenvolvimento:
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // Permitir em localhost
  sameSite: 'Lax' as const, // Menos restritivo em dev
};
```

---

## 🎯 Resultado Final Esperado

Depois de implementar tudo:

```
┌─────────────────────────────────────────┐
│     SEGURANÇA: VERDE ✅                  │
├─────────────────────────────────────────┤
│ ✅ Tokens em httpOnly cookies           │
│ ✅ Rate limiting ativo (5 tentativas)  │
│ ✅ Security headers completos           │
│ ✅ CSP restritiva                       │
│ ✅ Proteção contra XSS                  │
│ ✅ Proteção contra CSRF                 │
│ ✅ Proteção contra Clickjacking         │
│ ✅ Proteção contra Força Bruta          │
│ ✅ HTTPS obrigatório (HSTS)             │
│ ✅ Score Security Headers: A/A+         │
│ ✅ Score Mozilla Observatory: 85+       │
└─────────────────────────────────────────┘
```

---

## 📞 Próximas Etapas

1. **Executar testes acima**
2. **Corrigir qualquer problema**
3. **Deploy em staging**
4. **Re-testar com ferramentas reais**
5. **Deploy em produção**

Quer ajuda com algum teste específico? 🚀
