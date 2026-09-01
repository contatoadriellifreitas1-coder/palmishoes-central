
-- Enums
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_contato', 'fechado');
CREATE TYPE public.flow_status AS ENUM ('draft', 'active');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  product_interest TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  estimated_value NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chatbot flows
CREATE TABLE public.chatbot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status public.flow_status NOT NULL DEFAULT 'draft',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_flows TO authenticated;
GRANT ALL ON public.chatbot_flows TO service_role;
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flows" ON public.chatbot_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_flows_updated_at BEFORE UPDATE ON public.chatbot_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site settings (single shared row)
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL DEFAULT 'Palmishoes',
  tagline TEXT,
  about_text TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage settings" ON public.site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRM stages
CREATE TABLE public.crm_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage crm stages" ON public.crm_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lead interaction history
CREATE TABLE public.lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_interactions TO authenticated;
GRANT ALL ON public.lead_interactions TO service_role;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage lead interactions" ON public.lead_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add CRM fields to existing leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS stage_id UUID,
  ADD COLUMN IF NOT EXISTS value NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.leads
  ADD CONSTRAINT IF NOT EXISTS fk_leads_stage
  FOREIGN KEY (stage_id) REFERENCES public.crm_stages(id) ON DELETE SET NULL;

INSERT INTO public.crm_stages (name, sort_order)
VALUES
  ('Novo Lead', 1),
  ('Em Contato', 2),
  ('Proposta Enviada', 3),
  ('Negociação', 4),
  ('Ganho', 5),
  ('Perdido', 6)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.site_settings (brand_name, tagline, about_text, contact_email, contact_phone)
VALUES ('Palmishoes', 'Soluções em palmilhas de alta qualidade', 'Desde 2012, oferecemos soluções em palmilhas de alta qualidade com excelente custo-benefício, fabricadas com matérias-primas de primeira linha e sob medida para fábricas de calçados.', 'contato@palmishoes.com.br', '+55 18 99636-7930');
