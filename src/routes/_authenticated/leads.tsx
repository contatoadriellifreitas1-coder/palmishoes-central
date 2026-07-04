import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Database, Loader2 } from "lucide-react";
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

type Lead = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  product_interest: string | null;
  status: "novo" | "em_contato" | "fechado";
  estimated_value: number | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
};

const statusMeta: Record<string, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-info/15 text-info border-info/20" },
  em_contato: { label: "Em Contato", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  fechado: { label: "Fechado", className: "bg-success/15 text-success border-success/20" },
};

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const emptyForm = {
  name: "", company: "", email: "", phone: "",
  product_interest: "", status: "novo" as Lead["status"], estimated_value: "", notes: "",
};

function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchStatus = statusFilter === "todos" || l.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        l.name.toLowerCase().includes(q) ||
        (l.company ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [leads, search, statusFilter]);

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
      product_interest: l.product_interest ?? "", status: l.status,
      estimated_value: l.estimated_value ? String(l.estimated_value) : "", notes: l.notes ?? "",
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
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
          <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {leads.length}</span>
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
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Carregando leads...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  {leads.length === 0 ? "Nenhum lead cadastrado. Adicione um novo ou importe exemplos." : "Nenhum lead corresponde aos filtros."}
                </td></tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
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
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
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