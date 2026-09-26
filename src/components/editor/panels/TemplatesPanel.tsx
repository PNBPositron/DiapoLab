import { useEffect, useState } from "react";
import { Loader2, Heart, LayoutGrid, Search, SlidersHorizontal, Users } from "lucide-react";
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
  const [styleFilter, setStyleFilter] = useState("all");
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

  const filteredCommunity = filterTemplates(community, {
    query,
    style: styleFilter,
    creator: creatorFilter,
    license: licenseFilter,
  });

  const toggleLike = async (id: string) => {
    if (!user) {
      setError("Sign in to like templates");
      return;
    }
    const isLiked = likedIds.has(id);
    // optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? -1 : 1)),
    }));
    try {
      if (isLiked) await unlikeTemplate(id);
      else await likeTemplate(id);
    } catch (e) {
      // revert
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(id);
        else next.delete(id);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [id]: Math.max(0, (prev[id] ?? 0) + (isLiked ? 1 : -1)),
      }));
      setError(e instanceof Error ? e.message : "Like failed");
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Templates" />

      {error && (
        <div className="mx-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Search + filtres */}
      <div className="space-y-3 px-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or creator"
            className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["Style", styleFilter, setStyleFilter, ["all", "editorial", "bold", "minimal"]],
              ["Creator", creatorFilter, setCreatorFilter, ["all", "community"]],
              ["License", licenseFilter, setLicenseFilter, ["all", "CC0", "community"]],
            ] as const
          ).map(([label, value, setter, options]) => (
            <label key={label} className="block">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label === "Style" && <SlidersHorizontal className="size-2.5" />}
                {label === "Creator" && <Users className="size-2.5" />}
                {label}
              </span>
              <select
                value={value}
                onChange={(event) => (setter as (v: string) => void)(event.target.value)}
                className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500"
              >
                {(options as readonly string[]).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3 px-4">
        {communityLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="size-5 animate-spin text-blue-500" />
            <span className="text-xs">Loading templates…</span>
          </div>
        ) : community.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600">No community templates yet</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Be the first — sign in and hit the share icon in the toolbar.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {sortTemplates(filteredCommunity, likeCounts, "likes")
              .slice(0, 8)
              .map((c) => (
                <TemplateCard
                  key={c.id}
                  template={c}
                  likeCount={likeCounts[c.id] ?? 0}
                  liked={likedIds.has(c.id)}
                  canLike={!!user}
                  onLike={() => toggleLike(c.id)}
                  onLoad={() => {
                    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                    useEditor.getState().loadPages(c.pages as Page[]);
                    useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                  }}
                />
              ))}
          </div>
        )}
      </div>

      <div className="px-4">
        <button
          onClick={() => setShowAll(true)}
          disabled={community.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
        >
          <LayoutGrid className="size-3.5" /> Show all templates
        </button>
      </div>

      <AllTemplatesDialog
        open={showAll}
        onOpenChange={setShowAll}
        templates={filteredCommunity}
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

/* ------------ Carte de template, style clair moderne ------------ */
function TemplateCard({
  template: c,
  likeCount,
  liked,
  canLike,
  onLike,
  onLoad,
}: {
  template: PublicTemplate;
  likeCount: number;
  liked: boolean;
  canLike: boolean;
  onLike: () => void;
  onLoad: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_10px_28px_rgba(37,99,235,0.12)]">
      <button onClick={onLoad} className="block w-full text-left" title={`Load ${c.name}`}>
        <div className="w-full overflow-hidden border-b border-slate-100">
          {c.pages?.[0] ? (
            <SlideThumbnail
              page={c.pages[0] as Page}
              canvasW={c.canvas_w}
              canvasH={c.canvas_h}
              className="w-full min-h-[130px] transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#f1f5f9" }} />
          )}
        </div>
        <div className="px-3 py-2.5">
          <div className="truncate text-xs font-semibold text-slate-800" title={c.name}>
            {c.name}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {c.pages?.length ?? 0} slides
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        disabled={!canLike}
        title={canLike ? (liked ? "Unlike" : "Like") : "Sign in to like"}
        className={`absolute right-2 top-2 flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold backdrop-blur transition-all active:scale-95 ${
          liked
            ? "border-rose-200 bg-rose-50 text-rose-500"
            : "border-slate-200 bg-white/90 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
        } ${!canLike ? "opacity-60" : ""}`}
      >
        <Heart className="size-3" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
        {likeCount}
      </button>
    </div>
  );
}

/* ------------ Logique de filtrage / tri (inchangée) ------------ */
function filterTemplates(
  templates: PublicTemplate[],
  filters: { query: string; style: string; creator: string; license: string },
) {
  const query = filters.query.trim().toLowerCase();
  return templates.filter((template) => {
    const creator = template.creator ?? (template.user_id === "builtin" ? "builtin" : "community");
    const style = template.style ?? inferTemplateStyle(template);
    const license = template.license ?? (template.user_id === "builtin" ? "CC0" : "community");
    return (
      (!query || `${template.name} ${creator} ${style} ${license}`.toLowerCase().includes(query)) &&
      (filters.style === "all" || style === filters.style) &&
      (filters.creator === "all" || creator === filters.creator) &&
      (filters.license === "all" || license === filters.license)
    );
  });
}

function inferTemplateStyle(template: PublicTemplate) {
  const text = `${template.name} ${JSON.stringify(template.pages)}`.toLowerCase();
  if (text.includes("quote") || text.includes("editorial")) return "editorial";
  if (text.includes("launch") || text.includes("bold")) return "bold";
  return "minimal";
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

/* ------------ Dialog "Show all" modernisée ------------ */
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
      <DialogContent className="flex max-h-[88vh] max-w-5xl flex-col overflow-hidden border-slate-200 bg-slate-50 p-0">
        <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4">
          <DialogTitle className="text-sm font-semibold uppercase tracking-wide text-slate-800">
            All templates
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              {templates.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            {(["likes", "recent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                  sortBy === s
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-sslate-400">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((c) => (
              <TemplateCard
                key={c.id}
                template={c}
                likeCount={likeCounts[c.id] ?? 0}
                liked={likedIds.has(c.id)}
                canLike={canLike}
                onLike={() => toggleLike(c.id)}
                onLoad={() => {
                  if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
                  useEditor.getState().loadPages(c.pages as Page[]);
                  useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
