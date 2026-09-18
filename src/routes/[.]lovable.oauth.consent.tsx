import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OAuthDetails = {
  client?: { name?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-screen place-items-center bg-ink p-6 font-mono text-[12px] text-[#ff0080]">
      ! Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink p-6">
      <div className="brutal-border-2 brutal-shadow-lg w-full max-w-md bg-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center bg-blue-deep brutal-border glow-blue">
            <Zap className="h-5 w-5 text-teal" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="font-display text-xl tracking-[0.18em] text-teal text-glow">
            DIAPOLAB
          </div>
        </div>
        <h1 className="font-display text-xl uppercase tracking-[0.2em] text-teal">
          // Connect {clientName}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-teal/70">
          &gt; {clientName} wants to use DiapoLab as you — read, create and delete your
          designs, and browse community templates.
        </p>
        {error && <p className="mt-3 font-mono text-[10px] text-[#ff0080]" role="alert">! {error}</p>}
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="brutal-border brutal-press flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-2.5 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} APPROVE
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="brutal-border brutal-press flex-1 bg-paper px-4 py-2.5 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50"
          >
            DENY
          </button>
        </div>
      </div>
    </main>
  );
}
