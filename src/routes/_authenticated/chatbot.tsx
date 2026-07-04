import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Save, Send, Bot, Zap, MessageSquare, RotateCcw, Loader2, Power,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chatbot")({
  component: ChatbotPage,
});

type Step = { id: string; trigger: string; response: string };
type Flow = {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active";
  steps: Step[];
};
type ChatMsg = { from: "bot" | "user"; text: string };

const greeting = "Olá! 👋 Sou o assistente da Palmishoes. Como posso ajudar com nossos componentes calçadistas?";
const fallback = "Desculpe, não entendi. Posso ajudar com: palmilhas, prazos, orçamento ou amostras.";

const newStep = (): Step => ({ id: crypto.randomUUID(), trigger: "", response: "" });

const defaultSteps: Step[] = [
  { id: crypto.randomUUID(), trigger: "preço, orçamento, valor", response: "Trabalhamos com orçamentos sob medida! Qual o produto e a quantidade estimada de pares?" },
  { id: crypto.randomUUID(), trigger: "prazo, entrega", response: "Nosso prazo médio de entrega é de 10 a 15 dias úteis, dependendo do volume do pedido." },
  { id: crypto.randomUUID(), trigger: "amostra", response: "Podemos enviar amostras! Informe o CNPJ e o endereço para prepararmos o envio." },
];

function ChatbotPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Flow | null>(null);

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chatbot_flows").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((f) => ({ ...f, steps: (f.steps as Step[]) ?? [] })) as Flow[];
    },
  });

  // Keep local draft in sync with selection
  useEffect(() => {
    if (selectedId === null && flows.length > 0) setSelectedId(flows[0].id);
  }, [flows, selectedId]);

  useEffect(() => {
    const f = flows.find((x) => x.id === selectedId);
    if (f) setDraft(JSON.parse(JSON.stringify(f)));
  }, [selectedId, flows]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("chatbot_flows").insert({
        name: "Nova campanha",
        description: "Campanha automatizada de atendimento",
        status: "draft",
        steps: defaultSteps as any,
        created_by: userData.user?.id,
      }).select().single();
      if (error) throw error;
      return data as unknown as Flow;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setSelectedId(f.id);
      toast.success("Campanha criada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const saveMutation = useMutation({
    mutationFn: async (flow: Flow) => {
      const { error } = await supabase.from("chatbot_flows").update({
        name: flow.name.trim() || "Sem título",
        description: flow.description,
        status: flow.status,
        steps: flow.steps as any,
      }).eq("id", flow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast.success("Fluxo salvo com sucesso.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chatbot_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      setSelectedId(null);
      setDraft(null);
      toast.success("Campanha removida.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulador de Chatbot"
        description="Construa fluxos de campanha (Gatilho → Resposta) e teste o comportamento em tempo real."
        actions={<Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Nova campanha
        </Button>}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_1fr_360px]">
        {/* Campaign list */}
        <Card className="h-fit p-2 shadow-[var(--shadow-card)]">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campanhas</div>
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
          ) : flows.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Nenhuma campanha. Crie a primeira.</div>
          ) : (
            <div className="space-y-1">
              {flows.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selectedId === f.id ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate font-medium">{f.name}</span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", f.status === "active" ? "bg-success" : "bg-muted-foreground/40")} />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Builder */}
        {draft ? (
          <FlowBuilder
            key={draft.id}
            draft={draft}
            onChange={setDraft}
            onSave={() => saveMutation.mutate(draft)}
            onDelete={() => deleteMutation.mutate(draft.id)}
            saving={saveMutation.isPending}
          />
        ) : (
          <Card className="flex min-h-80 items-center justify-center p-8 text-center shadow-[var(--shadow-card)]">
            <div>
              <Bot className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">Selecione ou crie uma campanha para começar a construir o fluxo.</p>
            </div>
          </Card>
        )}

        {/* Live preview */}
        <ChatPreview steps={draft?.steps ?? []} title={draft?.name ?? "Pré-visualização"} />
      </div>
    </div>
  );
}

function FlowBuilder({
  draft, onChange, onSave, onDelete, saving,
}: {
  draft: Flow;
  onChange: (f: Flow) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const update = (patch: Partial<Flow>) => onChange({ ...draft, ...patch });
  const updateStep = (id: string, patch: Partial<Step>) =>
    onChange({ ...draft, steps: draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <Card className="p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            className="h-auto border-0 border-b border-transparent px-0 text-lg font-semibold focus-visible:border-primary focus-visible:ring-0 shadow-none"
            placeholder="Nome da campanha"
          />
          <Textarea
            value={draft.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Descrição da campanha..."
            rows={2}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Power className={cn("h-4 w-4", draft.status === "active" ? "text-success" : "text-muted-foreground")} />
          <span className="text-sm font-medium">Campanha {draft.status === "active" ? "ativa" : "em rascunho"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="status-switch" className="text-sm text-muted-foreground">Ativar</Label>
          <Switch id="status-switch" checked={draft.status === "active"} onCheckedChange={(c) => update({ status: c ? "active" : "draft" })} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fluxo de mensagens</div>
        {draft.steps.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Adicione o primeiro gatilho para iniciar o fluxo.
          </p>
        )}
        {draft.steps.map((step, i) => (
          <div key={step.id} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Passo {i + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => update({ steps: draft.steps.filter((s) => s.id !== step.id) })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><Zap className="h-3.5 w-3.5 text-warning-foreground" /> Gatilho (palavras-chave)</Label>
                <Input value={step.trigger} onChange={(e) => updateStep(step.id, { trigger: e.target.value })} placeholder="ex: preço, orçamento" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs"><MessageSquare className="h-3.5 w-3.5 text-info" /> Resposta do bot</Label>
                <Textarea value={step.response} onChange={(e) => updateStep(step.id, { response: e.target.value })} placeholder="Resposta automática..." rows={2} />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full border-dashed" onClick={() => update({ steps: [...draft.steps, newStep()] })}>
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar passo
        </Button>
      </div>

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Excluir campanha
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar fluxo
        </Button>
      </div>
    </Card>
  );
}

function ChatPreview({ steps, title }: { steps: Step[]; title: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([{ from: "bot", text: greeting }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const respond = (text: string) => {
    const lower = text.toLowerCase();
    const match = steps.find((s) =>
      s.trigger.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).some((kw) => lower.includes(kw)),
    );
    return match?.response?.trim() || fallback;
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);
    setTimeout(() => setMessages((m) => [...m, { from: "bot", text: respond(text) }]), 450);
  };

  const reset = () => setMessages([{ from: "bot", text: greeting }]);

  return (
    <Card className="flex h-[540px] flex-col overflow-hidden shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20"><Bot className="h-4.5 w-4.5" /></span>
          <div>
            <p className="text-sm font-semibold leading-none">{title || "Assistente"}</p>
            <p className="mt-1 text-xs text-primary-foreground/75">Teste simulado · online</p>
          </div>
        </div>
        <button onClick={reset} title="Reiniciar conversa" className="rounded-md p-1.5 transition-colors hover:bg-primary-foreground/15">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
              m.from === "user"
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : "rounded-bl-sm bg-card text-card-foreground shadow-[var(--shadow-card)]",
            )}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-card p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Digite uma mensagem de teste..."
        />
        <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}