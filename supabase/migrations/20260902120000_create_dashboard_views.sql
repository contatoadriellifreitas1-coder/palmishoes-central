CREATE OR REPLACE FUNCTION public.calculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_value = NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS calculate_order_total_before_write ON public.orders;
CREATE TRIGGER calculate_order_total_before_write
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.calculate_order_total();

REVOKE ALL ON FUNCTION public.calculate_order_total() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.dashboard_order_summary
WITH (security_invoker = true) AS
SELECT
  status,
  COUNT(*)::INTEGER AS order_count,
  COALESCE(SUM(quantity), 0)::BIGINT AS item_count,
  COALESCE(SUM(total_value), 0)::NUMERIC(14,2) AS total_value
FROM public.orders
GROUP BY status;

CREATE OR REPLACE VIEW public.dashboard_lead_funnel
WITH (security_invoker = true) AS
SELECT
  COALESCE(s.name, 'Sem etapa') AS stage_name,
  COUNT(l.id)::INTEGER AS lead_count,
  COALESCE(SUM(l.estimated_value), 0)::NUMERIC(14,2) AS estimated_value
FROM public.leads AS l
LEFT JOIN public.crm_stages AS s ON s.id = l.stage_id
WHERE COALESCE(l.is_deleted, false) = false
GROUP BY s.id, s.name, s.sort_order
ORDER BY s.sort_order NULLS LAST, stage_name;

CREATE OR REPLACE VIEW public.dashboard_inventory_status
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  sku,
  category,
  stock,
  CASE
    WHEN stock = 0 THEN 'sem_estoque'
    WHEN stock < 1000 THEN 'baixo'
    ELSE 'normal'
  END AS stock_status,
  synced_at,
  updated_at
FROM public.catalog_items;

CREATE OR REPLACE VIEW public.dashboard_monthly_sales
WITH (security_invoker = true) AS
SELECT
  month,
  sales,
  target,
  CASE
    WHEN target = 0 THEN NULL
    ELSE ROUND((sales / target) * 100, 2)
  END AS target_completion_percent,
  sales - target AS variance
FROM public.sales_metrics
ORDER BY month;

GRANT SELECT ON public.dashboard_order_summary,
  public.dashboard_lead_funnel,
  public.dashboard_inventory_status,
  public.dashboard_monthly_sales TO authenticated, service_role;