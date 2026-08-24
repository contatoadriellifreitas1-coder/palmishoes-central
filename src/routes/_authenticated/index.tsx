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
import { DollarSign, AlertTriangle, UserPlus, Bot, ArrowRight } from "lucide-react";
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

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const [leadsRes, flowsRes] = await Promise.all([
        supabase.from("leads").select("id,name,company,status,estimated_value,created_at").order("created_at", { ascending: false }),
        supabase.from("chatbot_flows").select("id,status"),
      ]);
      const [salesRes, errorsRes] = await Promise.all([
        supabase.from("sales_metrics").select("month,sales,target").order("month", { ascending: true }),
        supabase.from("error_metrics").select("error_type,occurrences").order("occurrences", { ascending: false }),
      ]);
      const leads = leadsRes.data ?? [];
      const flows = flowsRes.data ?? [];
      return {
        leads,
        salesTrend: (salesRes.data ?? []).map((item) => ({
          month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${item.month}T12:00:00`)),
          vendas: Number(item.sales),
          meta: Number(item.target),
        })),
        errorsByType: (errorsRes.data ?? []).map((item) => ({ tipo: item.error_type, qtd: item.occurrences })),
        newLeads: leads.filter((l) => l.status === "novo").length,
        pipeline: leads.filter((l) => l.status !== "fechado").reduce((s, l) => s + Number(l.estimated_value ?? 0), 0),
        activeFlows: flows.filter((f) => f.status === "active").length,
        totalFlows: flows.length,
      };
    },
  });

  const recentLeads = (data?.leads ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="Indicadores operacionais em tempo real do negócio."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Volume de Vendas (mês)" value={brl(data?.salesTrend.at(-1)?.vendas ?? 0)} icon={DollarSign} loading={isLoading} trendLabel="último período registrado" />
        <StatCard label="Taxa de Erros / Logística" value="2,4%" icon={AlertTriangle} trend={-0.8} trendLabel="vs. mês anterior" />
        <StatCard label="Leads Recentes" value={String(data?.newLeads ?? 0)} icon={UserPlus} loading={isLoading} trend={data?.newLeads ? 12 : 0} trendLabel="novos aguardando" />
        <StatCard label="Status do Chatbot" value={`${data?.activeFlows ?? 0} ativas`} icon={Bot} loading={isLoading} trendLabel={`${data?.totalFlows ?? 0} campanhas totais`} />
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
    </div>
  );
}