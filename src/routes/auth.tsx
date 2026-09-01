import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { secureLogin, secureSignup } from "@/integrations/supabase/secure-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/palmishoes-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso Corporativo — Painel Palmishoes" },
      { name: "description", content: "Área restrita da equipe Palmishoes. Faça login para acessar o painel de gestão interna." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "A senha deve ter ao menos 6 caracteres" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        // ✅ SECURITY: Use secure login with rate limiting
        const result = await secureLogin(parsed.data.email, parsed.data.password);
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success("Acesso liberado. Bem-vindo!");
        navigate({ to: "/", replace: true });
      } else {
        // ✅ SECURITY: Use secure signup with rate limiting
        const result = await secureSignup(parsed.data.email, parsed.data.password, fullName);
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success("Conta criada. Você já pode acessar o painel.");
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha na autenticação";
      toast.error(
        message.includes("Invalid login credentials") ? "E-mail ou senha incorretos" : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-[image:var(--gradient-primary)] p-12 text-primary-foreground lg:flex">
        <img src={logo} alt="Palmishoes" className="h-8 w-auto brightness-0 invert" width={1536} height={512} />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Gestão interna, centralizada.</h2>
          <p className="mt-4 text-primary-foreground/80">
            Vendas, leads, chatbot e monitoramento de mídias — tudo em um único painel para os
            tomadores de decisão da Palmishoes.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Área restrita · Uso interno · © Palmishoes</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm p-8 shadow-[var(--shadow-elevated)]">
          <img src={logo} alt="Palmishoes" className="mb-6 h-7 w-auto lg:hidden" width={1536} height={512} />
          <h1 className="text-xl font-semibold text-foreground">
            {mode === "login" ? "Acesso corporativo" : "Criar acesso"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Entre com suas credenciais internas." : "Cadastre um novo membro da equipe."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João Silva" />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@palmishoes.com.br" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            {mode === "login" ? "Não tem acesso? Criar conta" : "Já tem acesso? Entrar"}
          </button>
        </Card>
      </div>
    </div>
  );
}