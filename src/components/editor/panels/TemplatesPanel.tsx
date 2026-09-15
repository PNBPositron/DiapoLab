import { useEffect, useState } from "react";
import { Loader2, Heart, Grid3x3, Search } from "lucide-react";
import { useEditor, type Page } from "@/store/editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelHeader } from "./TextPanel";
import {
  listPublicTemplates,
  listTemplateLikeCounts,
  listMyLikedTemplateIds,
  likeTemplate,
  unlikeTemplate,
  type PublicTemplate,
} from "@/lib/designs";
import { SlideThumbnail } from "../SlideThumbnail";
import { useAuth } from "@/hooks/use-auth";

export function TemplatesPanel() {
  const [error, setError] = useState<string | null>(null);
  const [community, setCommunity] = useState<PublicTemplate[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<"likes" | "recent">("likes");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [licenseFilter, setLicenseFilter] = useState("all");

  useEffect(() => {
    setCommunityLoading(true);
    listPublicTemplates()
      .then(async (tpls) => {
        setCommunity(tpls);
        const ids = tpls.map((t) => t.id);
        const [counts, mine] = await Promise.all([
          listTemplateLikeCounts(ids),
          listMyLikedTemplateIds().catch(() => new Set<string>()),
        ]);
        setLikeCounts(counts);
        setLikedIds(mine);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setCommunityLoading(false));
  }, [user?.id]);

  const availableTags = Array.from(new Set(community.flatMap((template) => template.tags ?? []))).sort();
  const filteredCommunity = filterTemplates(community, { query, tag: tagFilter, creator: creatorFilter, license: licenseFilter });

  const toggleLike = async (id: string) => {
    if (!user) {
      setError("Sign in to like templates");
      return;
    }
    const isLiked = likedIds.has(id);
    // optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(id); else next.add(id);
      return next;
    });
    setLikeCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1)) }));
    try {
      if (isLiked) await unlikeTemplate(id);
      else await likeTemplate(id);
    } catch (e) {
      // revert
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(id); else next.delete(id);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)) }));
      setError(e instanceof Error ? e.message : "Like failed");
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Templates" />

      {error && <p className="font-mono text-[10px] text-[#ff0080]">! {error}</p>}

      <div className="font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">▸ Community templates</div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 brutal-border-2 bg-ink px-2 text-teal/70"><Search className="size-3.5" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or creator" className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[10px] text-teal outline-none placeholder:text-teal/35" /></label>
        <div className="grid grid-cols-3 gap-1.5">
          {[['tag', tagFilter, setTagFilter, ['all', ...availableTags]], ['creator', creatorFilter, setCreatorFilter, ['all', 'community']], ['license', licenseFilter, setLicenseFilter, ['all', 'CC0', 'community']]].map(([label, value, setter, options]) => <label key={label as string} className="font-mono text-[9px] uppercase text-teal/60">{label as string}<select value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="mt-1 w-full brutal-border bg-surface px-1 py-1 text-[9px] text-teal">{(options as string[]).map((option) => <option key={option}>{option}</option>)}</select></label>)}
        </div>
      </div>

      {communityLoading ? (
        <div className="flex items-center gap-2 font-mono text-[11px] text-teal/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
        </div>
      ) : community.length === 0 ? (
        <p className="font-mono text-[10px] text-teal/50">
          &gt; no community templates yet. Be the first — sign in and click the share icon in the toolbar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sortTemplates(filteredCommunity, likeCounts, "likes").slice(0, 8).map((c) => (
            <div
              key={c.id}
              className="brutal-border-2 group relative overflow-hidden bg-surface text-left hover:border-teal"
            >
              <button
                onClick={() => {
                  if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                  useEditor.getState().loadPages(c.pages as Page[]);
                  useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                }}
                className="block w-full text-left"
                title={`Load ${c.name}`}
              >
                <div className="w-full border-b border-teal/30">
                  {c.pages?.[0] ? (
                    <SlideThumbnail
                      page={c.pages[0] as Page}
                      canvasW={c.canvas_w}
                      canvasH={c.canvas_h}
                      className="w-full min-h-[150px]"
                    />
                  ) : (
                    <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#0a0f1f" }} />
                  )}
                </div>
                <div className="bg-ink px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-teal truncate">
                  {c.name}
                </div>
                <div className="bg-ink px-2 pb-1 font-mono text-[9px] text-teal/50">
                  {c.pages?.length ?? 0} slides
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(c.id); }}
                disabled={!user}
                title={user ? (likedIds.has(c.id) ? "Unlike" : "Like") : "Sign in to like"}
                className={`absolute right-1.5 top-1.5 flex items-center gap-1 border bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur transition ${
                  likedIds.has(c.id)
                    ? "border-[#ff0080] text-[#ff0080]"
                    : "border-teal/40 text-teal/80 hover:border-teal hover:text-teal"
                } ${!user ? "opacity-60" : ""}`}
              >
                <Heart
                  className="h-3 w-3"
                  fill={likedIds.has(c.id) ? "currentColor" : "none"}
                  strokeWidth={2}
                />
                {likeCounts[c.id] ?? 0}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAll(true)}
        disabled={community.length === 0}
        className="brutal-border-2 brutal-press flex w-full items-center justify-center gap-2 bg-surface px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal hover:border-teal disabled:opacity-40"
      >
        <Grid3x3 className="h-3.5 w-3.5" /> SHOW ALL TEMPLATES
      </button>

      <AllTemplatesDialog
        open={showAll}
        onOpenChange={setShowAll}
        templates={community}
        likeCounts={likeCounts}
        likedIds={likedIds}
        toggleLike={toggleLike}
        canLike={!!user}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </div>
  );
}

function filterTemplates(
  templates: PublicTemplate[],
  filters: { query: string; tag: string; creator: string; license: string },
) {
  const query = filters.query.trim().toLowerCase();
  return templates.filter((template) => {
    const creator = template.creator ?? (template.user_id === "builtin" ? "builtin" : "community");
    const tags = template.tags ?? [];
    const license = template.license ?? "community";
    return (!query || `${template.name} ${tags.join(" ")} ${creator} ${license}`.toLowerCase().includes(query))
      && (filters.tag === "all" || tags.includes(filters.tag))
      && (filters.creator === "all" || creator === filters.creator)
      && (filters.license === "all" || license === filters.license);
  });
}


function sortTemplates(
  tpls: PublicTemplate[],
  likes: Record<string, number>,
  sortBy: "likes" | "recent",
): PublicTemplate[] {
  const arr = [...tpls];
  if (sortBy === "likes") {
    arr.sort((a, b) => (likes[b.id] ?? 0) - (likes[a.id] ?? 0));
  } else {
    arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
  return arr;
}

function AllTemplatesDialog({
  open,
  onOpenChange,
  templates,
  likeCounts,
  likedIds,
  toggleLike,
  canLike,
  sortBy,
  setSortBy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: PublicTemplate[];
  likeCounts: Record<string, number>;
  likedIds: Set<string>;
  toggleLike: (id: string) => void;
  canLike: boolean;
  sortBy: "likes" | "recent";
  setSortBy: (s: "likes" | "recent") => void;
}) {
  const sorted = sortTemplates(templates, likeCounts, sortBy);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden border-teal bg-paper p-0 flex flex-col">
        <DialogHeader className="border-b border-teal/30 bg-ink px-5 py-3">
          <DialogTitle className="font-display text-sm uppercase tracking-[0.25em] text-teal">
            ▌ All community templates · {templates.length}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-teal/20 bg-surface px-5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/60">Sort by:</span>
          {(["likes", "recent"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`brutal-border-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                sortBy === s ? "bg-blue text-ink border-teal" : "bg-ink text-teal hover:border-teal"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((c) => (
              <div
                key={c.id}
                className="brutal-border-2 group relative overflow-hidden bg-surface hover:border-teal"
              >
                <button
                  onClick={() => {
                    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                    useEditor.getState().loadPages(c.pages as Page[]);
                    useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                    onOpenChange(false);
                  }}
                  className="block w-full text-left"
                  title={`Load ${c.name}`}
                >
                  <div className="w-full border-b border-teal/30">
                    {c.pages?.[0] ? (
                      <SlideThumbnail
                        page={c.pages[0] as Page}
                        canvasW={c.canvas_w}
                        canvasH={c.canvas_h}
                        className="w-full"
                      />
                    ) : (
                      <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#0a0f1f" }} />
                    )}
                  </div>
                  <div className="bg-ink px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em] text-teal truncate">
                    {c.name}
                  </div>
                  <div className="bg-ink px-2 pb-1 font-mono text-[9px] text-teal/50">
                    {c.pages?.length ?? 0} slides
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(c.id); }}
                  disabled={!canLike}
                  title={canLike ? (likedIds.has(c.id) ? "Unlike" : "Like") : "Sign in to like"}
                  className={`absolute right-1.5 top-1.5 flex items-center gap-1 border bg-ink/85 px-1.5 py-0.5 font-mono text-[10px] backdrop-blur transition ${
                    likedIds.has(c.id)
                      ? "border-[#ff0080] text-[#ff0080]"
                      : "border-teal/40 text-teal/80 hover:border-teal hover:text-teal"
                  } ${!canLike ? "opacity-60" : ""}`}
                >
                  <Heart
                    className="h-3 w-3"
                    fill={likedIds.has(c.id) ? "currentColor" : "none"}
                    strokeWidth={2}
                  />
                  {likeCounts[c.id] ?? 0}
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
