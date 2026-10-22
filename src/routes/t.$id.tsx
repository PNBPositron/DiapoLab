import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEditor, type Page } from "@/store/editor";
import { PresentationMode } from "@/components/editor/PresentationMode";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (share) {
        const { data, error: rpcError } = await supabase.rpc("get_shared_design", {
          p_design_id: id,
          p_token: share,
        });
        if (cancelled) return;
        if (rpcError || !data) {
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
    <div className="grid min-h-screen place-items-center bg-ink p-8">
      <div className="brutal-border-2 max-w-lg bg-surface p-8 text-center">
        <h1 className="font-display text-2xl tracking-[0.2em] text-teal text-glow">
          {error ? "NOT FOUND" : name || "LOADING…"}
        </h1>
        {error ? (
          <p className="mt-4 font-mono text-xs text-teal/70">{error}</p>
        ) : (
          <>
            <p className="mt-4 font-mono text-xs text-teal/70">Shared deck · view only</p>
            <button
              disabled={!ready}
              onClick={() => useEditor.getState().setPresenting(true)}
              className="brutal-border brutal-press mt-6 bg-blue px-5 py-2 font-display text-xs tracking-[0.2em] text-ink disabled:opacity-50"
            >
              ▶ PRESENT
            </button>
          </>
        )}
        <div className="mt-6">
          <Link to="/" className="font-mono text-[11px] text-teal/60 underline">
            open DiapoLab
          </Link>
        </div>
      </div>
      <PresentationMode />
    </div>
  );
}
