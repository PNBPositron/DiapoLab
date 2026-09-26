import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Eye, EyeOff, ArrowRight, Sparkles, Cloud, Palette, MonitorSmartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
        ? s.next
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — DiapoLab" },
      { name: "description", content: "Sign in to DiapoLab to save and sync your designs." },
    ],
    links: [
      { rel: "canonical", href: "https://diapolab.lovable.app/auth" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const user = useAuthStore((s) => s.user);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (next) window.location.replace(next);
    else navigate({ to: "/" });
  }, [user, navigate, next]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: next ? window.location.origin + next : window.location.origin,
                data: { display_name: name || email.split("@")[0] },
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 sm\:p-6">
      {/* Décor de fond : dégradés doux façon aurora */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.10),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(124,91,214,0.10),transparent_40%)]" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] lg\:grid-cols-2">
        {/* Panneau gauche — branding */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg\:flex">
          <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 size-80 rounded-full bg-indigo-500/25 blur-3xl" />

          <Link to="/" className="relative flex items-center gap-3">
            <img src="/favicon.ico" alt="DiapoLab" className="size-10 rounded-xl object-contain" />
            <span className="font-display text-lg font-semibold uppercase tracking-[0.22em]">
              DiapoLab
            </span>
          </Link>

          <div className="relative space-y-8">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
                Design slides that
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  feel alive.
                </span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The futuristic presentation editor — shapes, morphs, transitions and more.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                { icon: Cloud, text: "Save your designs and pick up on any device" },
                { icon: Palette, text: "40+ shape effects, liquid glass, themes" },
                { icon: MonitorSmartphone, text: "Present fullscreen with laser & annotation tools" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <Icon className="size-4 text-blue-400" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            ▶ diapolab · design & presentation editor
          </p>
        </div>

        {/* Panneau droit — formulaire */}
        <div className="flex flex-col justify-center p-6 sm\:p-10">
          <Link to="/" className="mb-6 flex items-center gap-2.5 lg\:hidden">
            <img src="/favicon.ico" alt="DiapoLab" className="size-8 rounded-lg object-contain" />
            <span className="font-display text-base font-semibold uppercase tracking-[0.18em] text-slate-800">
              DiapoLab
            </span>
          </Link>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {mode === "signin"
              ? "Sign in to sync your designs across devices."
              : "Sign up to save and share your presentations."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <Field label="Display name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder\:text-slate-400 outline-none transition focus\:border-blue-500 focus\:bg-white focus\:ring-4 focus:ring-blue-500/10"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder\:text-slate-400 outline-none transition focus\:border-blue-500 focus\:bg-white focus\:ring-4 focus\:ring-blue-500/10"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder\:text-slate-400 outline-none transition focus\:border-blue-500 focus\:bg-white focus\:ring-4 focus\:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover\:text-slate-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover\:bg-blue-700 hover\:shadow-[0_10px_28px_rgba(37,99,235,0.35)] active\:scale-[0.98] disabled\:pointer-events-none disabled\:opacity-60"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {mode === "signin" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight className="size-4 transition-transform group-hover\:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-sm text-slate-500 transition hover\:text-slate-800"
            >
              {mode === "signin" ? (
                <>
                  No account yet? <span className="font-semibold text-blue-600 hover\:underline">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="font-semibold text-blue-600 hover\:underline">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
