import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Eye, EyeOff, ArrowRight, Cloud, Palette, MonitorSmartphone } from "lucide-react";
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
      { property: "og:title", content: "Sign in — DiapoLab" },
      { property: "og:description", content: "Sign in to save and sync your DiapoLab projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 sm:p-6">
      <div className="mb-4 flex w-full max-w-4xl items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
        >
          <ArrowLeft className="size-3.5" /> Back to editor
        </Link>
        <Link
          to="/wiki"
          className="text-xs font-medium text-slate-500 transition hover:text-slate-900 hover:underline hover:underline-offset-4"
        >
          Documentation
        </Link>
      </div>

      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_44px_-18px_rgba(15,23,42,0.12)] lg:grid-cols-2">
        {/* Left panel — brand & highlights */}
        <div className="hidden flex-col justify-between border-r border-slate-200 bg-slate-50/70 p-10 text-slate-900 lg:flex">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.ico" alt="DiapoLab" className="size-9 rounded-xl object-contain" />
            <span className="font-display text-base font-semibold tracking-tight text-slate-900">
              DiapoLab
            </span>
          </Link>

          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold text-blue-600">Presentation studio</p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-slate-900">
                Design slides that{" "}
                <span className="text-blue-600">feel alive.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Build decks with shapes, morph transitions, live polls, and clean exports.
              </p>
            </div>

            <ul className="space-y-3.5">
              {[
                { icon: Cloud, text: "Save your designs and pick up on any device" },
                { icon: Palette, text: "40+ shape effects, liquid glass, themes" },
                { icon: MonitorSmartphone, text: "Present fullscreen with laser & annotation tools" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-xs font-medium text-slate-700">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            DiapoLab · Design &amp; presentation editor
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-col justify-center bg-white p-6 sm:p-10">
          <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
            <img src="/favicon.ico" alt="DiapoLab" className="size-8 rounded-lg object-contain" />
            <span className="font-display text-base font-semibold tracking-tight text-slate-900">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-xs text-slate-500 transition hover:text-slate-900"
            >
              {mode === "signin" ? (
                <>
                  No account yet? <span className="font-semibold text-blue-600 hover:underline">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="font-semibold text-blue-600 hover:underline">Sign in</span>
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
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
