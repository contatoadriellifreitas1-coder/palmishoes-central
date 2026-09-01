import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Database, Loader2, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { sampleLeads } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

type StageOption = {
  id: string;
  name: string;
  sort_order: number;
};

type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  product_interest: string | null;
  status: "novo" | "em_contato" | "fechado";
  stage_id?: string | null;
  value?: number | null;
  estimated_value: number | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
};

type LeadInteraction = {
  id: string;
  lead_id: string;
  type: string;
  description: string;
  interaction_date: string;
};

const statusMeta: Record<string, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-info/15 text-info border-info/20" },
  em_contato: { label: "Em Contato", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  fechado: { label: "Fechado", className: "bg-success/15 text-success border-success/20" },
};

const funnelStages = [
  { key: "novo", label: "Novo", description: "Leads em cadastro" },
  { key: "em_contato", label: "Em Contato", description: "Em prospecção" },
  { key: "fechado", label: "Fechado", description: "Vendas concluídas" },
] as const;

const getStatusFromStageName = (stageName?: string | null): Lead["status"] => {
  switch (stageName) {
    case "Novo Lead":
      return "novo";
    case "Em Contato":
    case "Proposta Enviada":
    case "Negociação":
      return "em_contato";
    case "Ganho":
    case "Perdido":
      return "fechado";
    default:
      return "novo";
  }
};

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const emptyForm = {
  name: "", company: "", email: "", phone: "",
  product_interest: "", status: "novo" as Lead["status"], stage_id: "", estimated_value: "", notes: "",
};

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<string>("recentes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [interactionType, setInteractionType] = useState("Ligação");
  const [interactionText, setInteractionText] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_stages").select("id,name,sort_order").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const activeLeadId = historyLead?.id ?? detailLead?.id;

  const { data: interactions = [], isLoading: historyLoading } = useQuery({
    queryKey: ["lead-interactions", activeLeadId],
    queryFn: async () => {
      if (!activeLeadId) return [] as LeadInteraction[];
      const { data, error } = await supabase
        .from("lead_interactions")
        .select("*")
        .eq("lead_id", activeLeadId)
        .order("interaction_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadInteraction[];
    },
    enabled: !!activeLeadId,
  });

  const stageMutation = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const selectedStage = stages.find((stage) => stage.id === stageId);
      const nextStatus = getStatusFromStageName(selectedStage?.name);
      const { error } = await supabase.from("leads").update({
        stage_id: stageId,
        status: nextStatus,
      }).eq("id", leadId);
      if (error) throw error;
      return { leadId, stageId, status: nextStatus };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Etapa do lead atualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar etapa"),
  });

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = statusFilter === "todos" || l.status === statusFilter;
      const matchStage = stageFilter === "todos"
        || (stageFilter === "sem_estagio" ? !l.stage_id : l.stage_id === stageFilter);
      const q = search.toLowerCase();
      const matchSearch = !q ||
        l.name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q);
      return matchStatus && matchStage && matchSearch;
    });
  }, [leads, search, statusFilter, stageFilter]);

  const priorityOrder: Record<Lead["status"], number> = {
    em_contato: 0,
    novo: 1,
    fechado: 2,
  };

  const sortedLeads = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sortBy === "valor_desc") {
        return Number(b.estimated_value ?? 0) - Number(a.estimated_value ?? 0);
      }
      if (sortBy === "valor_asc") {
        return Number(a.estimated_value ?? 0) - Number(b.estimated_value ?? 0);
      }
      if (sortBy === "prioridade") {
        const priorityDelta = priorityOrder[a.status] - priorityOrder[b.status];
        if (priorityDelta !== 0) return priorityDelta;
        return Number(b.estimated_value ?? 0) - Number(a.estimated_value ?? 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [filtered, sortBy]);

  const funnel = useMemo(() => {
    const total = Math.max(leads.length, 1);
    return funnelStages.map((stage) => {
      const items = leads.filter((lead) => lead.status === stage.key);
      const value = items.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 0), 0);
      const pct = Math.round((items.length / total) * 100);
      return {
        ...stage,
        count: items.length,
        value,
        pct,
      };
    });
  }, [leads]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        product_interest: form.product_interest.trim() || null,
        status: form.status,
        stage_id: form.stage_id || null,
        value: form.estimated_value ? Number(form.estimated_value) : 0,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leads").insert({ ...payload, created_by: userData.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(editing ? "Lead atualizado." : "Lead adicionado.");
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Lead removido.");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  const interactionMutation = useMutation({
    mutationFn: async () => {
      if (!historyLead || !interactionText.trim()) throw new Error("Informe a descrição da interação.");
      const { error } = await supabase.from("lead_interactions").insert({
        lead_id: historyLead.id,
        type: interactionType,
        description: interactionText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-interactions", historyLead?.id] });
      toast.success("Interação adicionada.");
      setInteractionText("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar interação"),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const rows = sampleLeads.map((l) => ({
        ...l,
        status: l.status as Lead["status"],
        created_by: userData.user?.id,
      }));
      const { error } = await supabase.from("leads").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Leads de exemplo importados.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao importar"),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (l: Lead) => {
    setEditing(l);
    setForm({
      name: l.name, company: l.company ?? "", email: l.email ?? "", phone: l.phone ?? "",
      product_interest: l.product_interest ?? "", status: l.status, stage_id: l.stage_id ?? "",
      estimated_value: l.estimated_value ? String(l.estimated_value) : "", notes: l.notes ?? "",
    });
    setDialogOpen(true);
  };
  const openHistory = (lead: Lead) => {
    setDetailLead(null);
    setHistoryLead(lead);
    setHistoryOpen(true);
    setInteractionType("Ligação");
    setInteractionText("");
  };

  const openDetails = (lead: Lead) => {
    setHistoryLead(null);
    setDetailLead(lead);
    setDetailOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do lead."); return; }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads & CRM"
        description="Triagem de clientes interessados em componentes calçadistas."
        actions={
          <>
            {leads.length === 0 && (
              <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Database className="mr-1.5 h-4 w-4" />}
                Importar exemplos
              </Button>
            )}
            <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo lead</Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {funnel.map((stage) => (
          <Card key={stage.key} className="shadow-[var(--shadow-card)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stage.description}</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{stage.label}</h3>
              </div>
              <Badge variant="outline" className={statusMeta[stage.key].className}>{stage.count}</Badge>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${stage.pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{stage.pct}% do total</span>
              <span>{brl(stage.value)}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, empresa ou e-mail..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_contato">Em Contato</SelectItem>
              <SelectItem value="fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estágios</SelectItem>
              <SelectItem value="sem_estagio">Sem estágio</SelectItem>
              {stages.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Mais recentes</SelectItem>
              <SelectItem value="valor_desc">Maior valor</SelectItem>
              <SelectItem value="valor_asc">Menor valor</SelectItem>
              <SelectItem value="prioridade">Maior prioridade</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">{sortedLeads.length} de {leads.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Contato</th>
                <th className="px-5 py-3 font-medium">Interesse</th>
                <th className="px-5 py-3 font-medium">Valor Est.</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Etapa CRM</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Carregando leads...</td></tr>
              ) : sortedLeads.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  {leads.length === 0 ? "Nenhum lead cadastrado. Adicione um novo ou importe exemplos." : "Nenhum lead corresponde aos filtros."}
                </td></tr>
              ) : (
                sortedLeads.map((l) => {
                  const stage = stages.find((item) => item.id === l.stage_id);
                  const isPriorityLead = l.status === "em_contato" || Number(l.estimated_value ?? 0) >= 5000;
                  return (
                    <tr
                      key={l.id}
                      className={`border-b border-border/60 last:border-0 hover:bg-muted/40 ${isPriorityLead ? "bg-primary/[0.03]" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-foreground">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.company ?? "—"}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <div>{l.email ?? "—"}</div>
                        <div className="text-xs">{l.phone ?? ""}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{l.product_interest ?? "—"}</td>
                      <td className="px-5 py-3 tabular-nums">{brl(Number(l.estimated_value ?? 0))}</td>
                      <td className="px-5 py-3"><Badge variant="outline" className={statusMeta[l.status].className}>{statusMeta[l.status].label}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-2">
                          {stage ? (
                            <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20">{stage.name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem estágio</span>
                          )}
                          {stages.length > 0 ? (
                            <Select
                              value={l.stage_id ?? ""}
                              onValueChange={(value) => stageMutation.mutate({ leadId: l.id, stageId: value })}
                              disabled={stageMutation.isPending}
                            >
                              <SelectTrigger className="h-9 w-40">
                                <SelectValue placeholder="Estágio" />
                              </SelectTrigger>
                              <SelectContent>
                                {stages.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(l)} title="Detalhes"><Database className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(l)} title="Histórico"><MessageSquareText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="interest">Interesse</Label>
                <Input id="interest" value={form.product_interest} onChange={(e) => setForm({ ...form, product_interest: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">Valor estimado (R$)</Label>
                <Input id="value" type="number" min="0" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Lead["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em Contato</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {stages.length > 0 && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Estágio do CRM</Label>
                  <Select value={form.stage_id || ""} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o estágio" /></SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notes">Histórico / Notas</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailLead(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do lead</DialogTitle>
          </DialogHeader>

          {detailLead ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="mt-1 font-semibold text-foreground">{detailLead.name}</p>
                  <p className="text-sm text-muted-foreground">{detailLead.company ?? "Empresa não informada"}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor estimado</p>
                  <p className="mt-1 font-semibold text-foreground">{brl(Number(detailLead.estimated_value ?? 0))}</p>
                  <p className="text-sm text-muted-foreground">Status: {statusMeta[detailLead.status]?.label ?? detailLead.status}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Contato</p>
                  <p className="mt-1 text-sm text-foreground">{detailLead.email ?? "E-mail não informado"}</p>
                  <p className="text-sm text-foreground">{detailLead.phone ?? "Telefone não informado"}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Etapa CRM</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {stages.find((item) => item.id === detailLead.stage_id)?.name ?? "Sem etapa definida"}
                  </p>
                  <p className="text-sm text-muted-foreground">Criado em {new Date(detailLead.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Interesse</p>
                <p className="mt-1 text-sm text-foreground">{detailLead.product_interest ?? "Não informado"}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Interações recentes</h4>
                {historyLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : interactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p>
                ) : (
                  interactions.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Badge variant="outline" className="bg-info/10 text-info border-info/20">{item.type}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(item.interaction_date).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum lead selecionado.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={(open) => { setHistoryOpen(open); if (!open) setHistoryLead(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Histórico de {historyLead?.name ?? "lead"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[140px_1fr]">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={interactionType} onValueChange={setInteractionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ligação">Ligação</SelectItem>
                    <SelectItem value="E-mail">E-mail</SelectItem>
                    <SelectItem value="Reunião">Reunião</SelectItem>
                    <SelectItem value="Nota">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={interactionText}
                  onChange={(e) => setInteractionText(e.target.value)}
                  placeholder="Descreva a interação com o lead..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => interactionMutation.mutate()} disabled={interactionMutation.isPending || !interactionText.trim()}>
                {interactionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar interação"}
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Interações anteriores</h4>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma interação registrada para este lead.</p>
              ) : (
                interactions.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="bg-info/10 text-info border-info/20">{item.type}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(item.interaction_date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{item.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}