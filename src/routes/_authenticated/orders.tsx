import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Loader2, Package2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

type OrderStatus = "pendente" | "em_producao" | "em_transito" | "entregue" | "cancelado";

type Order = {
  id: string;
  customer_name: string;
  company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  status: OrderStatus;
  notes: string | null;
  due_date: string | null;
  created_at: string;
};

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-muted text-muted-foreground border-border" },
  em_producao: { label: "Em Produção", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  em_transito: { label: "Em Trânsito", className: "bg-info/15 text-info border-info/20" },
  entregue: { label: "Entregue", className: "bg-success/15 text-success border-success/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);

const emptyForm = {
  customer_name: "",
  company: "",
  customer_email: "",
  customer_phone: "",
  product_name: "",
  quantity: "1",
  unit_price: "0",
  status: "pendente" as OrderStatus,
  due_date: "",
  notes: "",
};

function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = statusFilter === "todos" || order.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        order.customer_name.toLowerCase().includes(q) ||
        (order.company ?? "").toLowerCase().includes(q) ||
        (order.product_name ?? "").toLowerCase().includes(q) ||
        (order.customer_email ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const totalValue = Number(form.quantity || 0) * Number(form.unit_price || 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const quantity = Number(form.quantity || 0);
      const unitPrice = Number(form.unit_price || 0);

      const payload = {
        customer_name: form.customer_name.trim(),
        company: form.company.trim() || null,
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        product_name: form.product_name.trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
        total_value: Number.isFinite(quantity * unitPrice) ? quantity * unitPrice : 0,
        status: form.status,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("orders").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").insert({ ...payload, created_by: userData.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success(editing ? "Pedido atualizado." : "Pedido adicionado.");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao salvar pedido"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Pedido removido.");
      setDeleteId(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao remover pedido"),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (order: Order) => {
    setEditing(order);
    setForm({
      customer_name: order.customer_name,
      company: order.company ?? "",
      customer_email: order.customer_email ?? "",
      customer_phone: order.customer_phone ?? "",
      product_name: order.product_name,
      quantity: String(order.quantity),
      unit_price: String(order.unit_price),
      status: order.status,
      due_date: order.due_date ? new Date(order.due_date).toISOString().slice(0, 10) : "",
      notes: order.notes ?? "",
    });
    setDialogOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (!form.product_name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos & Produção"
        description="Controle de pedidos, faturamento e status operacional da produção."
        actions={<Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo pedido</Button>}
      />

      <Card className="shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, empresa ou produto..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_producao">Em Produção</SelectItem>
              <SelectItem value="em_transito">Em Trânsito</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {orders.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="px-5 py-3 font-medium">Qtd.</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    {orders.length === 0 ? "Nenhum pedido cadastrado. Adicione um novo pedido." : "Nenhum pedido corresponde aos filtros."}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.company ?? "—"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{order.product_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_email ?? "—"}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">{order.quantity}</td>
                    <td className="px-5 py-3 tabular-nums">{brl(Number(order.total_value ?? 0))}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusMeta[order.status].className}>{statusMeta[order.status].label}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(order)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(order.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pedido" : "Novo pedido"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="customer_name">Cliente *</Label>
                <Input id="customer_name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_email">E-mail</Label>
                <Input id="customer_email" type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_phone">Telefone</Label>
                <Input id="customer_phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product_name">Produto *</Label>
                <Input id="product_name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as OrderStatus })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_producao">Em Produção</SelectItem>
                    <SelectItem value="em_transito">Em Trânsito</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input id="quantity" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unit_price">Preço unitário</Label>
                <Input id="unit_price" type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date">Data de entrega</Label>
                <Input id="due_date" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="total_value">Valor total estimado</Label>
                <Input id="total_value" value={brl(totalValue)} readOnly disabled className="bg-muted/50" />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package2 className="mr-2 h-4 w-4" />}
                {editing ? "Salvar alterações" : "Salvar pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove o pedido do banco e não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
