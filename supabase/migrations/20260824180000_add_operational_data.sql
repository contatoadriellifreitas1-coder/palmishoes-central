-- Operational data used by the dashboard, social feed and site logs.
CREATE TABLE public.sales_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL UNIQUE,
  sales NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sales >= 0),
  target NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (target >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.error_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  error_type TEXT NOT NULL CHECK (length(trim(error_type)) > 0),
  occurrences INTEGER NOT NULL DEFAULT 0 CHECK (occurrences >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, error_type)
);

CREATE TABLE public.social_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('email', 'whatsapp')),
  author TEXT NOT NULL,
  handle TEXT,
  message TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutro' CHECK (sentiment IN ('positivo', 'neutro', 'negativo')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('reunião', 'entrega', 'feira', 'produção')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_metrics, public.error_metrics,
  public.social_mentions, public.catalog_items, public.agenda_events, public.system_logs TO authenticated;
GRANT ALL ON public.sales_metrics, public.error_metrics, public.social_mentions,
  public.catalog_items, public.agenda_events, public.system_logs TO service_role;

ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sales metrics" ON public.sales_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage error metrics" ON public.error_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage social mentions" ON public.social_mentions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage catalog items" ON public.catalog_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage agenda events" ON public.agenda_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage system logs" ON public.system_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_sales_metrics_updated_at BEFORE UPDATE ON public.sales_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_error_metrics_updated_at BEFORE UPDATE ON public.error_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agenda_events_updated_at BEFORE UPDATE ON public.agenda_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sales_metrics (month, sales, target) VALUES
  ('2026-01-01', 128000, 120000), ('2026-02-01', 142500, 130000),
  ('2026-03-01', 137800, 135000), ('2026-04-01', 165200, 145000),
  ('2026-05-01', 158900, 150000), ('2026-06-01', 189400, 160000),
  ('2026-07-01', 203100, 175000);

INSERT INTO public.error_metrics (month, error_type, occurrences) VALUES
  ('2026-07-01', 'Logística', 14), ('2026-07-01', 'Produção', 8),
  ('2026-07-01', 'Faturamento', 5), ('2026-07-01', 'Qualidade', 3),
  ('2026-07-01', 'Estoque', 6);

INSERT INTO public.catalog_items (name, sku, category, stock, synced_at) VALUES
  ('Palmilha Pré-Pronta EVA', 'PP-EVA-001', 'Pré-Prontas', 12400, now()),
  ('Palmilha Personalizada Couro', 'PC-CR-014', 'Personalizadas', 3200, now()),
  ('Palmilha Anatômica Premium', 'PA-PR-007', 'Anatômicas', 850, NULL),
  ('Palmilha Infantil Antibacteriana', 'PI-AB-022', 'Infantil', 6700, now()),
  ('Palmilha Esportiva Gel', 'PE-GEL-009', 'Esportivas', 1980, NULL);

INSERT INTO public.social_mentions (platform, author, handle, message, sentiment, occurred_at) VALUES
  ('whatsapp', 'Calçados Bella', '+55 18 99123-4567', 'Vocês têm palmilhas pré-prontas para tênis infantil em pronta entrega?', 'neutro', now() - interval '4 minutes'),
  ('email', 'Ana Ferreira', 'ana@afcalcados.com.br', 'Recebi a amostra das palmilhas personalizadas, acabamento impecável!', 'positivo', now() - interval '22 minutes'),
  ('email', 'Indústria Passo Firme', 'compras@passofirme.com', 'Qual o prazo mínimo de entrega para pedidos de 5.000 pares?', 'neutro', now() - interval '1 hour'),
  ('whatsapp', 'Marcos Lima', '+55 47 99999-0011', 'O último lote veio com atraso de 3 dias, precisamos ajustar isso.', 'negativo', now() - interval '2 hours'),
  ('email', 'Grupo Ortopé', 'parcerias@ortope.com.br', 'Interesse em parceria para linha de palmilhas anatômicas premium.', 'positivo', now() - interval '5 hours');

INSERT INTO public.agenda_events (title, event_date, event_type) VALUES
  ('Entrega — Passo Firme (5.000 pares)', '2026-07-08 09:00:00-03', 'entrega'),
  ('Reunião comercial — Grupo Ortopé', '2026-07-09 14:30:00-03', 'reunião'),
  ('Início produção lote PA-PR-007', '2026-07-10 07:00:00-03', 'produção'),
  ('Feira Couromoda — estande B12', '2026-07-15 10:00:00-03', 'feira');

INSERT INTO public.system_logs (level, message, created_at) VALUES
  ('info', 'Sincronização de catálogo concluída (5 itens).', now() - interval '1 day'),
  ('warn', 'Item PA-PR-007 com estoque abaixo do mínimo.', now() - interval '1 day' + interval '17 minutes'),
  ('info', 'Campanha de chatbot Boas-vindas ativada.', now() - interval '2 days'),
  ('error', 'Falha temporária na integração de WhatsApp (reconectado).', now() - interval '2 days' + interval '3 hours'),
  ('info', 'Novo lead importado do formulário do site.', now() - interval '2 days' + interval '5 hours');