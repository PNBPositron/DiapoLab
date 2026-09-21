import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined }),
  head: () => ({ meta: [{ title: "Sign in — DiapoLab" }, { name: "description", content: "Sign in to DiapoLab to save and sync your designs." }], links: [{ rel: "canonical", href: "https://diapolab.lovable.app/auth" }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!user) return; if (next) window.location.replace(next); else navigate({ to: "/" }); }, [user, navigate, next]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(null); try { const result = mode === "signup" ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: next ? window.location.origin + next : window.location.origin, data: { display_name: name || email.split("@")[0] } } }) : await supabase.auth.signInWithPassword({ email, password }); if (result.error) throw result.error; } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setLoading(false); } };
  return <div className="flex min-h-screen items-center justify-center bg-ink scanlines p-6"><div className="brutal-border-2 brutal-shadow-lg relative w-full max-w-md bg-surface p-6"><Link to="/" className="mb-5 flex items-center gap-3"><img src="/favicon.ico" alt="DiapoLab" className="h-10 w-10 rounded-lg border border-teal/20 object-contain" /><div className="font-display text-xl tracking-[0.18em] text-teal text-glow">DIAPOLAB</div></Link><h1 className="font-display text-2xl uppercase tracking-[0.2em] text-teal">{mode === "signin" ? "// Sign in" : "// Create account"}</h1><p className="mt-1 font-mono text-[11px] text-teal/60">&gt; cloud sync · save your designs · pick up anywhere</p><form onSubmit={submit} className="mt-5 space-y-3">{mode === "signup" && <Field label="Display name"><input value={name} onChange={(e) => setName(e.target.value)} className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal" /></Field>}<Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal" /></Field><Field label="Password"><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="brutal-border-2 w-full bg-ink px-3 py-2 font-mono text-sm text-teal" /></Field>{error && <p className="font-mono text-[11px] text-[#ff0080]">! {error}</p>}<button type="submit" disabled={loading} className="brutal-border brutal-shadow-sm brutal-press flex w-full items-center justify-center gap-2 bg-blue px-4 py-2.5 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "signin" ? "SIGN IN →" : "CREATE ACCOUNT →"}</button></form><button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} className="mt-4 w-full font-mono text-[11px] text-teal/70">{mode === "signin" ? "&gt; no account yet? sign_up_" : "&gt; already have an account? sign_in_"}</button></div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ {label}</span>{children}</label>; }
