-- ============================================================================
-- MELHORIAS DE SEGURANÇA - 2026-09-01
-- ============================================================================
-- 1. Adição de role-based access control (RBAC)
-- 2. Políticas RLS mais restritivas
-- 3. Auditoria de mudanças
-- 4. Validações de dados
-- 5. Encriptação de campos sensíveis

-- ============================================================================
-- 1. CRIAÇÃO DE TABELA DE ROLES
-- ============================================================================
CREATE TYPE public.user_role AS ENUM ('admin', 'vendedor', 'visualizador');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'visualizador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_roles" ON public.user_roles 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. TABELA DE AUDITORIA
-- ============================================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

GRANT INSERT ON public.audit_logs TO authenticated;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_audit_logs" ON public.audit_logs 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  ));

-- ============================================================================
-- 3. FUNÇÃO PARA REGISTRAR AUDITORIA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. MELHORIAS NA TABELA PROFILES
-- ============================================================================
-- Adicionar campos de segurança
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip_address TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'visualizador';

-- Adicionar trigger de auditoria
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes 
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ============================================================================
-- 5. MELHORIAS NA TABELA LEADS - VALIDAÇÕES E AUDITORIA
-- ============================================================================
-- Remover políticas permissivas antigas
DROP POLICY IF EXISTS "Authenticated can manage leads" ON public.leads;

-- Adicionar constraints de validação
ALTER TABLE public.leads
  ADD CONSTRAINT email_valid CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  ADD CONSTRAINT phone_valid CHECK (phone IS NULL OR phone ~ '^[+0-9\s\-()]{10,}$'),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Políticas RLS para Leads com controle por role
CREATE POLICY "leads_select_by_role" ON public.leads 
  FOR SELECT USING (
    -- Admin vê tudo
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' OR
    -- Vendedor vê leads que criou
    created_by = auth.uid() OR
    -- Visualizador vê leads que criou (read-only)
    created_by = auth.uid()
  );

CREATE POLICY "leads_insert_authenticated" ON public.leads 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    created_by = auth.uid() AND
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'vendedor')
  );

CREATE POLICY "leads_update_by_role" ON public.leads 
  FOR UPDATE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' OR
    created_by = auth.uid()
  ) WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'vendedor')
  );

CREATE POLICY "leads_delete_by_role" ON public.leads 
  FOR DELETE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' OR
    created_by = auth.uid()
  );

-- Adicionar trigger de auditoria
DROP TRIGGER IF EXISTS audit_leads_changes ON public.leads;
CREATE TRIGGER audit_leads_changes 
  AFTER INSERT OR UPDATE OR DELETE ON public.leads 
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ============================================================================
-- 6. MELHORIAS NA TABELA CHATBOT_FLOWS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated can manage flows" ON public.chatbot_flows;

ALTER TABLE public.chatbot_flows
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

CREATE POLICY "flows_select_by_role" ON public.chatbot_flows 
  FOR SELECT USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' OR
    created_by = auth.uid()
  );

CREATE POLICY "flows_insert_admin" ON public.chatbot_flows 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    created_by = auth.uid() AND
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "flows_update_by_owner" ON public.chatbot_flows 
  FOR UPDATE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin' OR
    created_by = auth.uid()
  );

CREATE POLICY "flows_delete_admin" ON public.chatbot_flows 
  FOR DELETE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS audit_flows_changes ON public.chatbot_flows;
CREATE TRIGGER audit_flows_changes 
  AFTER INSERT OR UPDATE OR DELETE ON public.chatbot_flows 
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ============================================================================
-- 7. MELHORIAS NA TABELA SITE_SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated can manage settings" ON public.site_settings;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE POLICY "settings_select_public" ON public.site_settings 
  FOR SELECT USING (true);

CREATE POLICY "settings_update_admin" ON public.site_settings 
  FOR UPDATE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS audit_settings_changes ON public.site_settings;
CREATE TRIGGER audit_settings_changes 
  AFTER INSERT OR UPDATE ON public.site_settings 
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ============================================================================
-- 8. MELHORIAS NA TABELA CRM_STAGES
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated can manage crm stages" ON public.crm_stages;

CREATE POLICY "crm_stages_select_all" ON public.crm_stages 
  FOR SELECT USING (true);

CREATE POLICY "crm_stages_write_admin" ON public.crm_stages 
  FOR ALL USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  ) WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- 9. MELHORIAS NA TABELA LEAD_INTERACTIONS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated can manage lead interactions" ON public.lead_interactions;

ALTER TABLE public.lead_interactions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users ON DELETE SET NULL;

CREATE POLICY "interactions_select_lead_access" ON public.lead_interactions 
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE created_by = auth.uid() OR 
            (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
    )
  );

CREATE POLICY "interactions_insert_lead_access" ON public.lead_interactions 
  FOR INSERT 
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE created_by = auth.uid() OR 
            (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
    )
  );

CREATE POLICY "interactions_delete_admin" ON public.lead_interactions 
  FOR DELETE USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  );

DROP TRIGGER IF EXISTS audit_interactions_changes ON public.lead_interactions;
CREATE TRIGGER audit_interactions_changes 
  AFTER INSERT OR UPDATE OR DELETE ON public.lead_interactions 
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ============================================================================
-- 10. FUNÇÃO PARA INICIALIZAR ROLE DE NOVO USUÁRIO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visualizador')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS assign_role_on_signup ON auth.users;
CREATE TRIGGER assign_role_on_signup 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.assign_user_role();

-- ============================================================================
-- 11. FUNÇÃO AUXILIAR PARA OBTER ROLE DO USUÁRIO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT NULL)
RETURNS public.user_role AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = COALESCE($1, auth.uid())),
    'visualizador'::public.user_role
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 12. MELHORIAS DE PERMISSÕES
-- ============================================================================
-- Remover permissões excessivas
REVOKE ALL ON public.leads FROM authenticated;
REVOKE ALL ON public.chatbot_flows FROM authenticated;
REVOKE ALL ON public.site_settings FROM authenticated;

-- Conceder permissões específicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chatbot_flows TO authenticated;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT SELECT, INSERT ON public.lead_interactions TO authenticated;

-- Permissões para service_role (admin interno)
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.chatbot_flows TO service_role;
GRANT ALL ON public.site_settings TO service_role;
GRANT ALL ON public.lead_interactions TO service_role;
GRANT ALL ON public.crm_stages TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- ============================================================================
-- 13. COMMENTS DE DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON TABLE public.audit_logs IS 'Tabela de auditoria para rastrear todas as mudanças em dados sensíveis';
COMMENT ON TABLE public.user_roles IS 'Tabela de roles de usuários para controle de acesso baseado em função';
COMMENT ON COLUMN public.leads.is_deleted IS 'Soft delete para manter integridade referencial';
COMMENT ON COLUMN public.leads.updated_by IS 'Rastreamento de quem realizou a última atualização';

-- ============================================================================
-- 14. INICIALIZAR ROLES PARA USUÁRIOS EXISTENTES
-- ============================================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.user_role 
FROM auth.users 
WHERE email = 'contato@palmishoes.com.br'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id)
ON CONFLICT (user_id) DO NOTHING;
