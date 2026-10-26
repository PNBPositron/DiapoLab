import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEditor, type Page } from "@/store/editor";
import { PresentationMode, requestPresentationFullscreen } from "@/components/editor/PresentationMode";
import { Loader2, Link2Off, Play, Sparkles } from "lucide-react";

export const Route = createFileRoute("/t/$id")({
  component: SharedTemplate,
  validateSearch: (search: Record<string, unknown>) => ({
    share: typeof search.share === "string" ? search.share : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shared deck — DiapoLab" },
      { name: "description", content: "View a deck shared publicly from DiapoLab, the neobrutalist design and presentation editor." },
      { property: "og:title", content: "Shared deck — DiapoLab" },
      { property: "og:description", content: "View a deck shared publicly from DiapoLab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SharedTemplate() {
  const { id } = Route.useParams();
  const { share } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const pageCount = useEditor((s) => s.pages.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (share) {
        const { data, error: rpcError } = await (supabase as any).rpc("get_shared_design", {
          p_design_id: id,
          p_token: share,
        });
        if (cancelled) return;
        if (rpcError) {
          // Distinguish a server that lacks the get_shared_design RPC from an
          // actually invalid/revoked token, so users aren't misled.
          setError(
            /^could not find|does not exist|function/i.test(rpcError.message)
              ? "Private links are not enabled on this server yet. The database function get_shared_design must be installed."
              : rpcError.message,
          );
          return;
        }
        if (!data) {
          setError("This private link is invalid or has been revoked.");
          return;
        }
        const shared = data as { name: string; canvas_w: number; canvas_h: number; pages: Page[] };
        const st = useEditor.getState();
        st.setCanvasSize(shared.canvas_w, shared.canvas_h);
        st.loadPages(shared.pages);
        st.setDesignMeta({ id: null, name: shared.name });
        setName(shared.name);
        setReady(true);
        return;
      }
      const { data, error: err } = await supabase
        .from("public_templates")
        .select("name, canvas_w, canvas_h, pages")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError("This shared deck doesn't exist or is no longer public.");
        return;
      }
      const st = useEditor.getState();
      st.setCanvasSize(data.canvas_w, data.canvas_h);
      st.loadPages(data.pages as unknown as Page[]);
      st.setDesignMeta({ id: null, name: data.name });
      setName(data.name);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      useEditor.getState().setPresenting(false);
    };
  }, [id, share]);

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-50 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_20%_-10%,rgba(99,102,241,0.18),transparent),radial-gradient(50rem_36rem_at_90%_110%,rgba(37,99,235,0.16),transparent)]"
      />
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/85 p-10 text-center shadow-[0_24px_70px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-[0_12px_28px_-10px_rgba(37,99,235,0.6)]">
          {error ? <Link2Off className="size-6" /> : <Sparkles className="size-6" />}
        </span>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
          {error ? "Link unavailable" : name || "Loading…"}
        </h1>
        {error ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{error}</p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-slate-700 active:scale-[0.98]"
            >
              Open DiapoLab
            </Link>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Shared deck</span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-600">View only</span>
              {ready && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{pageCount} pages</span>}
            </div>
            <button
              disabled={!ready}
              onClick={() => {
                requestPresentationFullscreen();
                useEditor.getState().setPresenting(true);
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_14px_32px_-10px_rgba(37,99,235,0.55)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {ready ? <Play className="size-4 fill-white" /> : <Loader2 className="size-4 animate-spin" />}
              {ready ? "Present" : "Preparing…"}
            </button>
          </>
        )}
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Made with DiapoLab</p>
      </div>
      <PresentationMode />
    </div>
  );
}
