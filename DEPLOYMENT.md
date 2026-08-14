# 🚀 Guia de Deploy - Palmishoes Central

## ✅ Build Concluído

A aplicação foi compilada com sucesso. Todos os arquivos estão em `.output/`

---

## 📦 Opções de Deploy

### 1️⃣ **VERCEL** (Recomendado - Mais Fácil)

**Vantagens:**
- Deploy automático via Git
- Suporta SSR nativamente
- Suporte ao TanStack Start
- Domínio gratuito

**Passos:**

```bash
# 1. Instale Vercel CLI
npm i -g vercel

# 2. Faça login
vercel login

# 3. Deploy
vercel --prod

# ou via Web
# Acesse https://vercel.com/new
# Conecte seu repositório Git
```

**Variáveis de Ambiente no Vercel:**
```
VITE_SUPABASE_URL=seu-url-aqui
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

---

### 2️⃣ **NETLIFY**

**Vantagens:**
- Interface gráfica amigável
- Build preview para PRs
- Suporte a functions serverless

**Passos:**

```bash
# 1. Instale Netlify CLI
npm i -g netlify-cli

# 2. Faça login
netlify login

# 3. Deploy
netlify deploy --prod

# ou via Web
# Acesse https://app.netlify.com/sites
# Conecte seu repositório Git
```

**Arquivo netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = ".output/public"

[functions]
  directory = ".output/server"

[[redirects]]
  from = "/*"
  to = "/"
  status = 200
```

---

### 3️⃣ **CLOUDFLARE PAGES** (Mais Barato)

**Vantagens:**
- Suporte a Edge Functions
- CDN rápido globalmente
- Suporte nativo para preset cloudflare-module (já configurado!)

**Passos:**

```bash
# 1. Instale Wrangler
npm i -g @cloudflare/wrangler

# 2. Faça login
wrangler login

# 3. Deploy
wrangler pages deploy .output/public
```

**Arquivo wrangler.toml:**
```toml
name = "palmishoes-central"
type = "javascript"
account_id = "seu-account-id"
workers_dev = true

[env.production]
vars = { SUPABASE_URL = "seu-url", SUPABASE_KEY = "sua-chave" }
```

---

### 4️⃣ **SEU PRÓPRIO SERVIDOR** (Node.js/Linux)

**Vantagens:**
- Controle total
- Sem dependência de plataformas externas

**Passos:**

```bash
# 1. SSH no servidor
ssh user@seu-servidor.com

# 2. Instale Node.js (se não tiver)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone o repositório
git clone seu-repo
cd palmishoes-central

# 4. Instale dependências
npm install

# 5. Build
npm run build

# 6. Rode em produção (opção A: direto)
npm run preview

# 6. Ou use PM2 para gerenciamento (opção B: recomendado)
npm i -g pm2
pm2 start npm --name "palmishoes" -- run preview
pm2 save
```

**Proxy reverso (Nginx):**
```nginx
server {
    listen 80;
    server_name palmishoes.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔐 Configuração do Supabase

1. **Pegue as credenciais do Supabase:**
   - Acesse [supabase.com](https://supabase.com)
   - Vá em Project Settings > API
   - Copie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

2. **Crie um `.env.local` com as credenciais:**
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. **As tabelas já existem:**
   - ✅ profiles
   - ✅ leads
   - ✅ chatbot_flows
   - ✅ site_settings

---

## 📝 Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído (`npm run build`)
- [ ] Tested localmente (`npm run preview`)
- [ ] Domínio apontando para o servidor
- [ ] SSL/HTTPS habilitado
- [ ] Backup do banco de dados configurado
- [ ] Monitoramento/logs configurados

---

## 🛠️ Troubleshooting

**Erro: "Cannot find module"**
```bash
npm install
npm run build
```

**Erro: "Database connection failed"**
- Verifique as variáveis de ambiente
- Confirme que Supabase está online
- Teste a conexão: `curl VITE_SUPABASE_URL/health`

**Performance lenta**
- Verifique os logs do servidor
- Use o CloudFlare Analytics (se usando CF)
- Considere cache/CDN

---

## 📞 Suporte

Para dúvidas sobre deploy, consulte:
- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Cloudflare Docs: https://developers.cloudflare.com/pages
- TanStack Start: https://tanstack.com/start
