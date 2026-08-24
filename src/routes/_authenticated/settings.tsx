import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Info, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SystemLog = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Settings = {
  id: string;
  brand_name: string;
  tagline: string | null;
  about_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

const logMeta: Record<SystemLog["level"], { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-info" },
  warn: { icon: AlertTriangle, className: "text-warning-foreground" },
  error: { icon: XCircle, className: "text-destructive" },
};

function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as SystemLog[];
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase.from("site_settings").update({
        brand_name: s.brand_name.trim() || "Palmishoes",
        tagline: s.tagline,
        about_text: s.about_text,
        contact_email: s.contact_email,
        contact_phone: s.contact_phone,
      }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("Configurações salvas com sucesso.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações do Site" description="Informações da marca, textos institucionais e logs do sistema." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Identidade da Marca</h3>
          <p className="mb-5 text-xs text-muted-foreground">Dados exibidos institucionalmente.</p>

          {isLoading || !form ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Nome da marca</Label>
                  <Input id="brand" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Slogan</Label>
                  <Input id="tagline" value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} maxLength={160} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail de contato</Label>
                  <Input id="email" type="email" value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={form.contact_phone ?? ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} maxLength={40} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="about">Texto institucional</Label>
                <Textarea id="about" value={form.about_text ?? ""} onChange={(e) => setForm({ ...form, about_text: e.target.value })} maxLength={1000} rows={4} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar alterações
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-sm font-semibold text-foreground">Logs do Sistema</h3>
          <p className="mb-4 text-xs text-muted-foreground">Eventos recentes da plataforma</p>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
            ) : logs.map((log) => {
              const M = logMeta[log.level];
              return (
                <div key={log.id} className="flex gap-3">
                  <M.icon className={cn("mt-0.5 h-4 w-4 shrink-0", M.className)} />
                  <div>
                    <p className="text-sm text-foreground">{log.message}</p>
                    <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.created_at))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}