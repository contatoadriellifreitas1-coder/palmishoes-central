# 🔒 Melhorias de Segurança - Palmishoes

**Data:** 2026-09-01  
**Arquivo de Migração:** `20260901120000_improve_security.sql`

---

## 📋 Resumo das Melhorias

### ✅ 1. **Sistema de Roles (RBAC)**
- Criado tipo `user_role` com 3 níveis:
  - **admin**: Acesso total ao sistema
  - **vendedor**: Pode criar e gerenciar leads próprios
  - **visualizador**: Acesso apenas de leitura (padrão)
- Tabela `user_roles` para rastreamento de permissões

### ✅ 2. **Auditoria Completa**
- Tabela `audit_logs` registra:
  - Todas as mudanças em dados sensíveis
  - Quem realizou (user_id)
  - O quê (INSERT/UPDATE/DELETE)
  - Valores antigos e novos (JSONB)
  - Timestamp preciso
- Triggers automáticos em todas as tabelas críticas

### ✅ 3. **Row Level Security (RLS) Aprimorado**

#### Antes (INSEGURO):
```sql
CREATE POLICY "Authenticated can manage leads" ON public.leads 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ❌ Qualquer usuário via tudo e modificava tudo
```

#### Depois (SEGURO):
```sql
-- Usuário vê apenas leads que criou OU é admin
CREATE POLICY "leads_select_by_role" ON public.leads 
  FOR SELECT USING (
    (SELECT role...) = 'admin' OR 
    created_by = auth.uid()
  );

-- Apenas admins e vendedores podem criar
CREATE POLICY "leads_insert_authenticated" ON public.leads 
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND 
    role IN ('admin', 'vendedor')
  );
```

### ✅ 4. **Validações de Dados**
- **Email:** Validação de formato com regex
- **Telefone:** Validação de comprimento mínimo e caracteres válidos
- **Constraints:** CHECK para garantir integridade

### ✅ 5. **Soft Delete**
- Campo `is_deleted` em tabelas críticas
- Mantém integridade referencial
- Permite recuperação de dados

### ✅ 6. **Rastreamento de Auditoria**
Adicionados campos:
- `updated_by`: Quem fez a última alteração
- `deleted_at`: Quando foi deletado
- `last_login_at`: Último acesso (profiles)

### ✅ 7. **Permissões Granulares**
```sql
-- Antes: GRANT ALL ON public.leads TO authenticated;
-- Depois:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
REVOKE ALL ON public.leads FROM authenticated; -- Depois reconcedem apenas o necessário
```

---

## 🔐 Tabelas Afetadas

| Tabela | Mudanças |
|--------|----------|
| **profiles** | Added: `last_login_at`, `last_ip_address`, `is_active`, `two_factor_enabled`, `role` |
| **leads** | Fixed RLS policies, added email/phone validation, soft delete, audit trail |
| **chatbot_flows** | Restricted to admin + owner, added audit trail |
| **site_settings** | Admin-only updates, added audit trail |
| **crm_stages** | Admin-only modifications |
| **lead_interactions** | Access based on parent lead permissions |

### Tabelas Novas
- **user_roles**: Gerenciamento de permissões
- **audit_logs**: Rastreamento de mudanças

---

## 🚀 Como Aplicar

### 1. Aplicar a migração:
```bash
supabase migration up
```

### 2. Atualizar dados existentes (IMPORTANTE):
```bash
-- Usuário admin (opcional, se quiser promover alguém)
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'seu-user-id-aqui';
```

---

## 📊 Funções de Ajuda

### Obter role do usuário atual:
```sql
SELECT public.get_user_role();
```

### Ver histórico de mudanças:
```sql
SELECT * FROM public.audit_logs 
WHERE table_name = 'leads' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Usuários que modificaram um lead:
```sql
SELECT DISTINCT 
  user_id,
  operation,
  created_at
FROM public.audit_logs 
WHERE table_name = 'leads' 
  AND record_id = 'id-do-lead'
ORDER BY created_at DESC;
```

---

## ⚠️ Considerações Importantes

1. **Existir Usuários Sem Role**: 
   - A função `assign_user_role()` atribui automaticamente role `visualizador` para novos usuários
   - Usuários existentes serão consultados com fallback para `visualizador`

2. **Migração de Dados**:
   - As políticas antigas (permissivas) foram removidas
   - A migração usa `ON CONFLICT DO NOTHING` para evitar erros
   - Não há perda de dados, apenas aplicação de segurança

3. **Performance**:
   - Índices foram criados em `audit_logs` para queries rápidas
   - RLS policies são otimizadas (evitam subqueries pesadas onde possível)

4. **Senhas e Tokens**:
   - Mantidos seguros no módulo `auth.users` do Supabase
   - Nunca armazenar em campo público

---

## 🔍 Verificação de Segurança

### Checklist pós-implementação:
- [ ] Migração aplicada com sucesso
- [ ] Roles dos usuários configurados (`admin`, `vendedor`, `visualizador`)
- [ ] Audit logs mostrando mudanças
- [ ] RLS policies funcionando (usuário só vê seus dados)
- [ ] Validações de email/phone funcionando
- [ ] Permissões granulares em efeito

---

## 📝 Próximos Passos Recomendados

1. **Adicionar 2FA** (Two-Factor Authentication)
2. **Rate Limiting** nas APIs de leads
3. **Encriptação** de campos sensíveis (2FA secret, dados bancários futuros)
4. **Backup Automático** de audit logs
5. **Notificações** de atividades suspeitas
6. **Política de Retenção** de audit logs (ex: 90 dias)

---

## 📞 Suporte

Se precisar de mais melhorias ou tiver dúvidas sobre as configurações, estou disponível!
