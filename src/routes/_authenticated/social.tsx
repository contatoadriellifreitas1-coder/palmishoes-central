import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Instagram, Facebook, Linkedin, MessageCircle, RefreshCw, Calendar, CheckCircle2, CircleDashed, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SocialMention = {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp" | "linkedin";
  author: string;
  handle: string | null;
  message: string;
  sentiment: "positivo" | "neutro" | "negativo";
  occurred_at: string;
};

export const Route = createFileRoute("/_authenticated/social")({
  component: SocialPage,
});

const platformMeta: Record<SocialMention["platform"], { icon: typeof Instagram; className: string }> = {
  instagram: { icon: Instagram, className: "text-[oklch(0.6_0.22_10)]" },
  facebook: { icon: Facebook, className: "text-[oklch(0.5_0.18_255)]" },
  whatsapp: { icon: MessageCircle, className: "text-[oklch(0.6_0.16_150)]" },
  linkedin: { icon: Linkedin, className: "text-[oklch(0.5_0.14_240)]" },
};

const sentimentMeta: Record<SocialMention["sentiment"], string> = {
  positivo: "bg-success/15 text-success border-success/20",
  neutro: "bg-muted text-muted-foreground border-border",
  negativo: "bg-destructive/10 text-destructive border-destructive/20",
};

function SocialPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["social-data"],
    queryFn: async () => {
      const [mentionsRes, itemsRes, agendaRes] = await Promise.all([
        supabase.from("social_mentions").select("*").order("occurred_at", { ascending: false }),
        supabase.from("catalog_items").select("*").order("name"),
        supabase.from("agenda_events").select("*").order("event_date"),
      ]);
      if (mentionsRes.error) throw mentionsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (agendaRes.error) throw agendaRes.error;
      return { mentions: mentionsRes.data as SocialMention[], items: itemsRes.data, agenda: agendaRes.data };
    },
  });
  const items = data?.items ?? [];
  const mentions = data?.mentions ?? [];
  const agenda = data?.agenda ?? [];

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catalog_items").update({ synced_at: new Date().toISOString() }).is("synced_at", null);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["social-data"] }); toast.success("Catálogo sincronizado com sucesso."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao sincronizar catálogo"),
  });

  const pending = items.filter((i) => !i.synced_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mídias Sociais & Catálogo"
        description="Feed consolidado de menções e sincronização de componentes e agenda."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Social feed */}
        <Card className="shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Menções & Mensagens</h3>
              <p className="text-xs text-muted-foreground">Feed simulado das redes da marca</p>
            </div>
            <Badge variant="outline" className="bg-info/10 text-info border-info/20">Simulado</Badge>
          </div>
          <div className="divide-y divide-border">
            {isLoading ? <p className="p-5 text-sm text-muted-foreground">Carregando feed...</p> : mentions.map((m) => {
              const Meta = platformMeta[m.platform];
              return (
                <div key={m.id} className="flex gap-3 px-5 py-4 hover:bg-muted/40">
                  <span className={cn("mt-0.5 shrink-0", Meta.className)}><Meta.icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.author}</span>
                      <span className="text-xs text-muted-foreground">{m.handle}</span>
                      <Badge variant="outline" className={cn("ml-auto text-[10px]", sentimentMeta[m.sentiment])}>{m.sentiment}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{m.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(m.occurred_at))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Catalog sync + agenda */}
        <div className="space-y-5">
          <Card className="p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sincronização de Catálogo</h3>
                <p className="text-xs text-muted-foreground">Dados persistidos no Supabase</p>
              </div>
              <Button size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
                Sincronizar
              </Button>
            </div>
            {pending > 0 && <p className="mt-2 text-xs text-warning-foreground">{pending} item(ns) pendente(s) de sincronização</p>}
            <div className="mt-4 space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.sku} · {it.stock.toLocaleString("pt-BR")} un.</p>
                  </div>
                  {it.synced_at ? (
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-success" />
                  ) : (
                    <CircleDashed className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
            </div>
            <div className="space-y-3">
              {agenda.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(e.event_date))} · {e.event_type}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}