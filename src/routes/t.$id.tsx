import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
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
      { name: "description", content: "View a deck shared publicly from DiapoLab, a focused design and presentation workspace." },
      { property: "og:title", content: "Shared deck — DiapoLab" },
      { property: "og:description", content: "View a deck shared publicly from DiapoLab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
    ],
  }),
});

function SharedTemplate() {
  const { id } = Route.useParams();
  const { share } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
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
        setShareUrl(window.location.href);
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
      setShareUrl(window.location.href);
    })();
    return () => {
      cancelled = true;
      useEditor.getState().setPresenting(false);
    };
  }, [id, share]);

  return (
    <div className="grid min-h-screen place-items-center bg-white p-6 text-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_56px_-20px_rgba(15,23,42,0.12)] sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
          {error ? <Link2Off className="size-5" /> : <Sparkles className="size-5" />}
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-slate-900">
          {error ? "Link unavailable" : name || "Loading…"}
        </h1>
        {error ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{error}</p>
            <Link
              to="/"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Open DiapoLab
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-xs font-medium tabular-nums text-slate-500">
              Shared deck · <span className="text-blue-600">View only</span>
              {ready ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
            </p>
            <button
              disabled={!ready}
              onClick={() => {
                requestPresentationFullscreen();
                useEditor.getState().setPresenting(true);
              }}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {ready ? <Play className="size-4 fill-white" /> : <Loader2 className="size-4 animate-spin" />}
              {ready ? "Present" : "Preparing…"}
            </button>
            {ready && shareUrl && (
              <div className="mt-7 flex flex-col items-center gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <QRCodeSVG value={shareUrl} size={92} level="M" marginSize={1} />
                </div>
                <span className="text-xs text-slate-500">
                  Scan to open this deck on your phone
                </span>
              </div>
            )}
          </>
        )}
        <p className="mt-8 text-xs text-slate-400">
          Made with <Link to="/" className="font-medium text-slate-600 hover:text-blue-600">DiapoLab</Link>
        </p>
      </div>
      <PresentationMode />
    </div>
  );
}
