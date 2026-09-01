import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DollarSign, AlertTriangle, UserPlus, Bot, ArrowRight, Package2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const statusMeta: Record<string, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-info/15 text-info border-info/20" },
  em_contato: { label: "Em Contato", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  fechado: { label: "Fechado", className: "bg-success/15 text-success border-success/20" },
};

const orderStatusMeta: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-muted text-muted-foreground border-border" },
  em_producao: { label: "Em Produção", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  em_transito: { label: "Em Trânsito", className: "bg-info/15 text-info border-info/20" },
  entregue: { label: "Entregue", className: "bg-success/15 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const [leadsRes, flowsRes, ordersRes, stagesRes, interactionsRes, profilesRes] = await Promise.all([
        supabase.from("leads").select("id,name,company,status,estimated_value,created_at,stage_id,created_by").order("created_at", { ascending: false }),
        supabase.from("chatbot_flows").select("id,status"),
        supabase.from("orders").select("id,customer_name,product_name,status,total_value,created_at").order("created_at", { ascending: false }),
        supabase.from("crm_stages").select("id,name,sort_order").order("sort_order", { ascending: true }),
        supabase.from("lead_interactions").select("id,lead_id,type,description,interaction_date").order("interaction_date", { ascending: false }).limit(6),
        supabase.from("profiles").select("id,full_name,email"),
      ]);
      const [salesRes, errorsRes] = await Promise.all([
        supabase.from("sales_metrics").select("month,sales,target").order("month", { ascending: true }),
        supabase.from("error_metrics").select("error_type,occurrences").order("occurrences", { ascending: false }),
      ]);
      const leads = leadsRes.data ?? [];
      const flows = flowsRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const stages = stagesRes.data ?? [];
      const stageMap = new Map((stages as Array<{ id: string; name: string; sort_order: number }>).map((stage) => [stage.id, stage]));
      const orderStatusBreakdown = ["pendente", "em_producao", "em_transito", "entregue", "cancelado"].map((status) => ({
        status,
        label: orderStatusMeta[status]?.label ?? status,
        qtd: orders.filter((order) => order.status === status).length,
        valor: orders.filter((order) => order.status === status).reduce((sum, order) => sum + Number(order.total_value ?? 0), 0),
      }));

      const stageNames = ["Novo Lead", "Em Contato", "Proposta Enviada", "Negociação", "Ganho", "Perdido"];
      const crmFunnel = stageNames.map((name) => {
        const items = leads.filter((lead) => stageMap.get(lead.stage_id ?? "")?.name === name || (
          !lead.stage_id && name === "Novo Lead" && lead.status === "novo"
        ));
        const totalValue = items.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);
        const avgValue = items.length ? totalValue / items.length : 0;
        const probabilityMap: Record<string, number> = {
          "Novo Lead": 0.12,
          "Em Contato": 0.28,
          "Proposta Enviada": 0.46,
          "Negociação": 0.7,
          "Ganho": 1,
          "Perdido": 0,
        };
        const forecast = totalValue * (probabilityMap[name] ?? 0);
        return {
          name,
          count: items.length,
          value: totalValue,
          avgValue,
          conversion: leads.length ? Math.round((items.length / leads.length) * 100) : 0,
          forecast,
        };
      });
      const stageValueChart = crmFunnel.map((stage) => ({
        name: stage.name,
        valor: stage.value,
      }));
      const highPotentialLeads = [...leads]
        .filter((lead) => Number(lead.estimated_value ?? 0) > 0)
        .sort((a, b) => Number(b.estimated_value ?? 0) - Number(a.estimated_value ?? 0))
        .slice(0, 5)
        .map((lead) => ({
          id: lead.id,
          name: lead.name,
          value: Number(lead.estimated_value ?? 0),
          status: lead.status,
          stage: stageMap.get(lead.stage_id ?? "")?.name ?? "Sem estágio",
        }));

      const lastInteractionByLead = new Map<string, string>();
      for (const interaction of interactionsRes.data ?? []) {
        const current = lastInteractionByLead.get(interaction.lead_id);
        if (!current || new Date(interaction.interaction_date).getTime() > new Date(current).getTime()) {
          lastInteractionByLead.set(interaction.lead_id, interaction.interaction_date);
        }
      }

      const urgentLeads = [...leads]
        .filter((lead) => ["novo", "em_contato"].includes(lead.status))
        .map((lead) => {
          const lastTouch = lastInteractionByLead.get(lead.id) ?? lead.created_at;
          const daysWithoutContact = Math.max(0, Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86400000));
          return {
            id: lead.id,
            name: lead.name,
            value: Number(lead.estimated_value ?? 0),
            stage: stageMap.get(lead.stage_id ?? "")?.name ?? "Sem estágio",
            days: daysWithoutContact,
            priority: daysWithoutContact >= 7 || lead.status === "novo" ? "alta" : "média",
          };
        })
        .filter((lead) => lead.days >= 3 || lead.priority === "alta")
        .sort((a, b) => {
          if (b.days !== a.days) return b.days - a.days;
          return b.value - a.value;
        })
        .slice(0, 5);

      const riskLeads = [...leads]
        .filter((lead) => lead.status !== "fechado")
        .map((lead) => {
          const lastTouch = lastInteractionByLead.get(lead.id) ?? lead.created_at;
          const daysWithoutContact = Math.max(0, Math.floor((Date.now() - new Date(lastTouch).getTime()) / 86400000));
          const stageName = stageMap.get(lead.stage_id ?? "")?.name ?? "Sem estágio";
          const stageRisk = {
            "Novo Lead": 12,
            "Em Contato": 28,
            "Proposta Enviada": 42,
            "Negociação": 58,
            "Ganho": 0,
            "Perdido": 0,
            "Sem estágio": 18,
          }[stageName] ?? 20;
          const score = Math.min(100, Math.round(daysWithoutContact * 4 + stageRisk + (Number(lead.estimated_value ?? 0) / 1000) * 0.6));
          return {
            id: lead.id,
            name: lead.name,
            value: Number(lead.estimated_value ?? 0),
            stage: stageName,
            days: daysWithoutContact,
            score,
            risk: score >= 75 ? "alto" : score >= 45 ? "médio" : "baixo",
          };
        })
        .filter((lead) => lead.score >= 30)
        .sort((a, b) => b.score - a.score || b.value - a.value)
        .slice(0, 5);

      const wonLeads = leads.filter((lead) => lead.status === "fechado").length;
      const conversionRate = leads.length ? Math.round((wonLeads / leads.length) * 100) : 0;

      const stageMetrics = stageNames.map((stageName, idx) => {
        const currentStageLeads = leads.filter((lead) => stageMap.get(lead.stage_id ?? "")?.name === stageName || (!lead.stage_id && stageName === "Novo Lead" && lead.status === "novo"));
        const nextStageName = stageNames[idx + 1];
        const nextStageLeads = nextStageName ? leads.filter((lead) => stageMap.get(lead.stage_id ?? "")?.name === nextStageName) : [];
        const currentCount = currentStageLeads.length;
        const nextCount = nextStageLeads.length;
        const convRate = currentCount > 0 ? Math.round((nextCount / currentCount) * 100) : 0;
        const avgDealSize = currentCount > 0 ? Math.round(currentStageLeads.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0) / currentCount) : 0;
        return {
          name: stageName,
          count: currentCount,
          avgDealSize,
          conversionRate: convRate,
          health: convRate >= 60 ? "bom" : convRate >= 30 ? "normal" : "ruim",
        };
      });

      const recentInteractions = (interactionsRes.data ?? []).map((interaction) => ({
        ...interaction,
        leadName: leads.find((lead) => lead.id === interaction.lead_id)?.name ?? "Lead",
      }));

      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const sellerMetrics = Array.from(
        leads.reduce((acc, lead) => {
          const sellerId = lead.created_by;
          if (!sellerId) return acc;
          if (!acc.has(sellerId)) {
            acc.set(sellerId, { leads: [], closedCount: 0 });
          }
          const seller = acc.get(sellerId)!;
          seller.leads.push(lead);
          if (lead.status === "fechado") seller.closedCount++;
          return acc;
        }, new Map<string, any>())
      )
        .map(([sellerId, data]) => {
          const profile = profileMap.get(sellerId);
          const totalLeads = data.leads.length;
          const closedLeads = data.closedCount;
          const convRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
          const totalValue = data.leads.reduce((sum: number, l: any) => sum + Number(l.estimated_value ?? 0), 0);
          const avgDealValue = totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0;
          return {
            id: sellerId,
            name: profile?.full_name ?? "Sem nome",
            leads: totalLeads,
            closed: closedLeads,
            conversionRate: convRate,
            totalValue,
            avgDealValue,
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10);

      return {
        leads,
        orders,
        salesTrend: (salesRes.data ?? []).map((item) => ({
          month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${item.month}T12:00:00`)),
          vendas: Number(item.sales),
          meta: Number(item.target),
        })),
        errorsByType: (errorsRes.data ?? []).map((item) => ({ tipo: item.error_type, qtd: item.occurrences })),
        orderStatusBreakdown,
        crmFunnel,
        stageValueChart,
        stageMetrics,
        sellerMetrics,
        highPotentialLeads,
        urgentLeads,
        riskLeads,
        recentInteractions,
        forecastValue: crmFunnel.reduce((sum, stage) => sum + stage.forecast, 0),
        totalPipelineValue: leads.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0),
        conversionRate,
        newLeads: leads.filter((l) => l.status === "novo").length,
        pipeline: leads.filter((l) => l.status !== "fechado").reduce((s, l) => s + Number(l.estimated_value ?? 0), 0),
        activeFlows: flows.filter((f) => f.status === "active").length,
        totalFlows: flows.length,
        totalOrderValue: orders.reduce((s, o) => s + Number(o.total_value ?? 0), 0),
        activeOrders: orders.filter((o) => ["pendente", "em_producao", "em_transito"].includes(o.status)).length,
        deliveredOrders: orders.filter((o) => o.status === "entregue").length,
      };
    },
  });

  const recentLeads = (data?.leads ?? []).slice(0, 5);
  const recentOrders = (data?.orders ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="Indicadores operacionais em tempo real do negócio."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Volume de Vendas (mês)" value={brl(data?.salesTrend.at(-1)?.vendas ?? 0)} icon={DollarSign} loading={isLoading} trendLabel="último período registrado" />
        <StatCard label="Faturamento em Pedidos" value={brl(data?.totalOrderValue ?? 0)} icon={Package2} loading={isLoading} trendLabel={`${data?.activeOrders ?? 0} pedidos ativos`} />
        <StatCard label="Pipeline CRM" value={brl(data?.totalPipelineValue ?? 0)} icon={UserPlus} loading={isLoading} trendLabel={`${data?.newLeads ?? 0} novos em ciclo`} />
        <StatCard label="Previsão de Fechamento" value={brl(data?.forecastValue ?? 0)} icon={DollarSign} loading={isLoading} trendLabel="valor provável no funil" />
        <StatCard label="Status do Chatbot" value={`${data?.activeFlows ?? 0} ativas`} icon={Bot} loading={isLoading} trendLabel={`${data?.totalFlows ?? 0} campanhas totais`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard label="Pedidos Ativos" value={String(data?.activeOrders ?? 0)} icon={Truck} loading={isLoading} trendLabel={`${data?.deliveredOrders ?? 0} entregues`} />
        <StatCard label="Taxa de Conversão" value={`${data?.conversionRate ?? 0}%`} icon={AlertTriangle} trend={data?.conversionRate ? 1.8 : 0} trendLabel="fechados sobre total" />
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] xl:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Resumo de Pedidos</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{brl(data?.totalOrderValue ?? 0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Valor total em todos os pedidos cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tendência de Vendas</h3>
              <p className="text-xs text-muted-foreground">Últimos 7 meses (R$)</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.salesTrend ?? []} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#fillVendas)" />
                <Area type="monotone" dataKey="meta" name="Meta" stroke="var(--color-chart-3)" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Erros por Tipo</h3>
            <p className="text-xs text-muted-foreground">Ocorrências no mês</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.errorsByType ?? []} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="tipo" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={72} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="qtd" name="Ocorrências" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Funil CRM</h3>
          <p className="text-xs text-muted-foreground">Volume de leads por etapa do pipeline</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.crmFunnel ?? []).map((stage) => (
            <div key={stage.name} className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{stage.name}</span>
                <Badge variant="outline" className="bg-info/10 text-info border-info/20">{stage.count}</Badge>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min((stage.count / Math.max(data?.leads.length ?? 1, 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{brl(stage.value)} em valor estimado</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Média {brl(stage.avgValue)} · {stage.conversion}% do total</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Valor por Etapa</h3>
            <p className="text-xs text-muted-foreground">Comparativo de oportunidade por fase do funil</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stageValueChart ?? []} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(value: number) => brl(value)}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="valor" name="Valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Previsão de Fechamento</h3>
            <p className="text-xs text-muted-foreground">Receita provável em cada etapa do funil</p>
          </div>
          <div className="space-y-3">
            {(data?.crmFunnel ?? []).map((stage) => (
              <div key={stage.name} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{stage.name}</span>
                  <span className="text-sm font-semibold text-foreground">{brl(stage.forecast)}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${Math.min((stage.forecast / Math.max(data?.forecastValue ?? 1, 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Probabilidade estimada: {(stage.conversion || 0)}%</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Saúde do Pipeline por Etapa</h3>
              <p className="text-xs text-muted-foreground">Taxa de conversão e tamanho médio por fase</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Etapa</th>
                  <th className="px-5 py-3 font-medium">Volume</th>
                  <th className="px-5 py-3 font-medium">Valor Médio</th>
                  <th className="px-5 py-3 font-medium">Conv. Próxima</th>
                  <th className="px-5 py-3 font-medium">Saúde</th>
                </tr>
              </thead>
              <tbody>
                {(data?.stageMetrics ?? []).map((stage) => (
                  <tr key={stage.name} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-foreground">{stage.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{stage.count} leads</td>
                    <td className="px-5 py-3 text-muted-foreground">{brl(stage.avgDealSize)}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{stage.conversionRate}%</td>
                    <td className="px-5 py-3">
                      <Badge 
                        variant="outline" 
                        className={stage.health === "bom" ? "bg-success/15 text-success border-success/20" : stage.health === "normal" ? "bg-warning/20 text-warning-foreground border-warning/30" : "bg-destructive/10 text-destructive border-destructive/20"}
                      >
                        {stage.health === "bom" ? "Bom" : stage.health === "normal" ? "Normal" : "Ruim"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Oportunidades de Maior Potencial</h3>
              <p className="text-xs text-muted-foreground">Leads com maior valor no pipeline</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Etapa</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(data?.highPotentialLeads ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{lead.stage}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusMeta[lead.status]?.className ?? "bg-muted text-muted-foreground border-border"}>
                        {statusMeta[lead.status]?.label ?? lead.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{brl(lead.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ações Urgentes</h3>
              <p className="text-xs text-muted-foreground">Leads que precisam de follow-up</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Estágio</th>
                  <th className="px-5 py-3 font-medium">Sem contato</th>
                  <th className="px-5 py-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(data?.urgentLeads ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhuma ação urgente no momento.</td></tr>
                ) : (
                  (data?.urgentLeads ?? []).map((lead) => (
                    <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{lead.stage}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={lead.days >= 7 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/20 text-warning-foreground border-warning/30"}>
                          {lead.days} dias
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{brl(lead.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Risco de Perda</h3>
              <p className="text-xs text-muted-foreground">Leads que exigem atenção para não perder valor</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Etapa</th>
                  <th className="px-5 py-3 font-medium">Risco</th>
                  <th className="px-5 py-3 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {(data?.riskLeads ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhuma oportunidade em risco na pipeline.</td></tr>
                ) : (
                  (data?.riskLeads ?? []).map((lead) => (
                    <tr key={lead.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{lead.stage}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${lead.risk === "alto" ? "bg-destructive" : lead.risk === "médio" ? "bg-warning" : "bg-success"}`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground">{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{brl(lead.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Atividades Recentes</h3>
              <p className="text-xs text-muted-foreground">Últimas interações do CRM</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leads">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="space-y-3 p-5">
            {(data?.recentInteractions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma interação recente registrada.</p>
            ) : (
              (data?.recentInteractions ?? []).map((interaction) => (
                <div key={interaction.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-info/10 text-info border-info/20">{interaction.type}</Badge>
                      <span className="text-sm font-medium text-foreground">{interaction.leadName}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(interaction.interaction_date).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{interaction.description}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Pedidos por Status</h3>
            <p className="text-xs text-muted-foreground">Volume operacional por etapa</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.orderStatusBreakdown ?? []} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={86} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  formatter={(value: number) => [String(value), "Pedidos"]}
                  contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="qtd" name="Pedidos" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pedidos Recentes</h3>
              <p className="text-xs text-muted-foreground">Últimos registros de faturamento e produção</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/orders">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhum pedido ainda. Adicione em Pedidos.</td></tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium text-foreground">{order.customer_name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{order.product_name}</td>
                      <td className="px-5 py-3 tabular-nums">{brl(Number(order.total_value ?? 0))}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={orderStatusMeta[order.status]?.className}>{orderStatusMeta[order.status]?.label}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Leads Recentes</h3>
            <p className="text-xs text-muted-foreground">Últimos interessados em componentes</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/leads">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Valor Estimado</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : recentLeads.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Nenhum lead ainda. Adicione em Leads & CRM.</td></tr>
              ) : (
                recentLeads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-foreground">{l.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{l.company ?? "—"}</td>
                    <td className="px-5 py-3 tabular-nums">{brl(Number(l.estimated_value ?? 0))}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusMeta[l.status]?.className}>{statusMeta[l.status]?.label}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Desempenho por Vendedor</h3>
            <p className="text-xs text-muted-foreground">Métricas de pipeline e conversão por pessoa</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Vendedor</th>
                <th className="px-5 py-3 font-medium">Leads</th>
                <th className="px-5 py-3 font-medium">Fechados</th>
                <th className="px-5 py-3 font-medium">Conv.</th>
                <th className="px-5 py-3 font-medium">Valor Médio</th>
                <th className="px-5 py-3 font-medium text-right">Pipeline Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : (data?.sellerMetrics ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Nenhum vendedor com leads ainda.</td></tr>
              ) : (
                (data?.sellerMetrics ?? []).map((seller) => (
                  <tr key={seller.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-foreground">{seller.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{seller.leads}</td>
                    <td className="px-5 py-3 text-muted-foreground">{seller.closed}</td>
                    <td className="px-5 py-3">
                      <Badge 
                        variant="outline" 
                        className={seller.conversionRate >= 40 ? "bg-success/15 text-success border-success/20" : seller.conversionRate >= 20 ? "bg-warning/20 text-warning-foreground border-warning/30" : "bg-muted text-muted-foreground border-border"}
                      >
                        {seller.conversionRate}%
                      </Badge>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{brl(seller.avgDealValue)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">{brl(seller.totalValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}