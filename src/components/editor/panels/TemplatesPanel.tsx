import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Heart, LayoutGrid, Search, Users, Download, Layers, SlidersHorizontal, FilePlus2, FileUp, Presentation, X } from "lucide-react";
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
import { ensureFontsForPages } from "@/lib/fontLoader";
import { importPPTXFile } from "@/lib/import-pptx";

/* ------------------------------------------------------------------ */
/* Style definitions                                                    */
/* ------------------------------------------------------------------ */

export const TEMPLATE_STYLES = ["cyber", "glass", "neobrutalist", "minimal", "corporate"] as const;
export type TemplateStyle = (typeof TEMPLATE_STYLES)[number];

const STYLE_META: Record<TemplateStyle, { label: string; dot: string }> = {
  cyber: { label: "Cyber", dot: "#22d3ee" },
  glass: { label: "Glass", dot: "#bfdbfe" },
  neobrutalist: { label: "Brutal", dot: "#ffd84a" },
  minimal: { label: "Minimal", dot: "#e2e8f0" },
  corporate: { label: "Corporate", dot: "#3b82f6" },
};

/* Legacy styles stored in Supabase before the rename */
const LEGACY_STYLES: Record<string, TemplateStyle> = {
  editorial: "minimal",
  bold: "neobrutalist",
};

function normalizeStyle(raw?: string | null): TemplateStyle {
  if (!raw) return "minimal";
  const clean = raw.trim().toLowerCase();
  if ((TEMPLATE_STYLES as readonly string[]).includes(clean)) return clean as TemplateStyle;
  return LEGACY_STYLES[clean] ?? "minimal";
}

function inferTemplateStyle(template: PublicTemplate): TemplateStyle {
  const text = `${template.name} ${JSON.stringify(template.pages)}`.toLowerCase();

  if (
    text.includes("cyber") || text.includes("neon") || text.includes("glitch") ||
    text.includes("synthwave") || /\b(orbitron|zen dots|rampart|unbounded|major mono)\b/i.test(text)
  ) return "cyber";

  if (
    text.includes("glass") || text.includes("frosted") || text.includes("liquid") ||
    text.includes("translucent") || text.includes("blur")
  ) return "glass";

  if (
    text.includes("brutal") || text.includes("loud") || text.includes("poster") ||
    text.includes("sticker") || /\b(archivo black|anton|bungee|shrikhand|tilt prism)\b/i.test(text)
  ) return "neobrutalist";

  if (
    text.includes("corporate") || text.includes("business") || text.includes("report") ||
    text.includes("pitch") || text.includes("professional") || text.includes("deck")
  ) return "corporate";

  return "minimal";
}

function getStyle(template: PublicTemplate): TemplateStyle {
  const raw = template.style;
  if (!raw) return inferTemplateStyle(template);
  return normalizeStyle(raw);
}

/* ------------------------------------------------------------------ */
/* Panel                                                                */
/* ------------------------------------------------------------------ */

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
  const [importingPptx, setImportingPptx] = useState(false);
  const [styleFilter, setStyleFilter] = useState<"all" | TemplateStyle>("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [licenseFilter, setLicenseFilter] = useState("all");

  useEffect(() => {
    setCommunityLoading(true);
    setError(null);
    listPublicTemplates()
      .then(async (tpls) => {
        setCommunity(tpls);
        // Preload every font family referenced by the templates' slides so
        // thumbnails render with the correct fonts instead of fallbacks.
        tpls.forEach((t) => ensureFontsForPages(t.pages as never));
        const ids = tpls.map((t) => t.id);
        const [counts, mine] = await Promise.all([
          listTemplateLikeCounts(ids).catch(() => ({} as Record<string, number>)),
          listMyLikedTemplateIds().catch(() => new Set<string>()),
        ]);
        setLikeCounts(counts);
        setLikedIds(mine);
      })
      .catch((e) => {
        const msg =
          e instanceof Error
            ? e.message
            : typeof (e as { message?: unknown })?.message === "string"
              ? (e as { message: string }).message
              : "Failed to load templates";
        setError(msg);
      })
      .finally(() => setCommunityLoading(false));
  }, [user?.id]);

  const importPptx = async (file: File) => {
    setImportingPptx(true);
    try {
      await importPPTXFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PPTX import failed");
    } finally {
      setImportingPptx(false);
    }
  };

  const loadTemplate = (c: PublicTemplate) => {
    if (!window.confirm(`Load "${c.name}" — this replaces your current pages.`)) return;
    useEditor.getState().loadPages(c.pages as Page[]);
    useEditor.getState().setCanvasSize(c.canvas_w, c.canvas_h);
  };

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

  const activeFilters =
    (styleFilter !== "all" ? 1 : 0) +
    (creatorFilter !== "all" ? 1 : 0) +
    (licenseFilter !== "all" ? 1 : 0);

  return (
    <div className="panel-content flex flex-col gap-4">
      <PanelHeader kicker="Home" title="Start from a deck" description="Create from scratch, import PowerPoint, or pick a template." icon={LayoutGrid} />

      {/* ── Quick start ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => useEditor.getState().newDesign()}
          className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-3 text-center transition-colors hover:border-blue-300 hover:bg-white"
        >
          <span className="grid size-8 place-items-center rounded-md bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <FilePlus2 className="size-4" />
          </span>
          <span className="text-[11px] font-semibold tracking-tight text-slate-700">Blank deck</span>
        </button>

        <label className={`group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-3 text-center transition-colors hover:border-blue-300 hover:bg-white ${importingPptx ? "pointer-events-none opacity-60" : ""}`}>
          <span className="grid size-8 place-items-center rounded-md bg-slate-100 text-slate-700 transition-colors group-hover:bg-slate-900 group-hover:text-white">
            {importingPptx ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          </span>
          <span className="text-[11px] font-semibold tracking-tight text-slate-700">{importingPptx ? "Importing…" : "Import PPTX"}</span>
          <input
            type="file"
            accept=".pptx"
            className="sr-only"
            disabled={importingPptx}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPptx(file);
              event.target.value = "";
            }}
          />
        </label>

        <button
          onClick={() => useEditor.getState().setPresenting(true)}
          className="group flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-3 text-center transition-colors hover:border-blue-300 hover:bg-white"
        >
          <span className="grid size-8 place-items-center rounded-md bg-slate-100 text-slate-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Presentation className="size-4" />
          </span>
          <span className="text-[11px] font-semibold tracking-tight text-slate-700">Present</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-600">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="shrink-0 font-semibold text-rose-400 transition hover:text-rose-600"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Search + filters */}
      <div className="relative z-30 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/15">
          <Search className="size-3.5 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates or creators…"
            className="min-w-0 flex-1 !border-0 !bg-transparent py-2 text-xs text-slate-800 outline-none !shadow-none placeholder:text-slate-400 focus:!ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid size-5 shrink-0 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Style filters */}
        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <SlidersHorizontal className="size-3 text-slate-400" />
            Style
          </span>
          <div className="flex flex-wrap gap-1.5">
            <StyleChip
              active={styleFilter === "all"}
              onClick={() => setStyleFilter("all")}
              label="All"
              count={community.length}
            />
            {TEMPLATE_STYLES.map((s) => (
              <StyleChip
                key={s}
                active={styleFilter === s}
                onClick={() => setStyleFilter(styleFilter === s ? "all" : s)}
                label={STYLE_META[s].label}
                dot={STYLE_META[s].dot}
                count={community.filter((t) => getStyle(t) === s).length}
              />
            ))}
          </div>
        </div>

        {/* Creator & License compact rows */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Users className="size-3 text-slate-400" />
              Creator
            </span>
            <div className="flex flex-wrap gap-1">
              {["all", "builtin", "community"].map((o) => (
                <button
                  key={o}
                  onClick={() => setCreatorFilter(o)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                    creatorFilter === o
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Layers className="size-3 text-slate-400" />
              License
            </span>
            <div className="flex flex-wrap gap-1">
              {["all", "CC0", "community"].map((o) => (
                <button
                  key={o}
                  onClick={() => setLicenseFilter(o)}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                    licenseFilter === o
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => {
              setStyleFilter("all");
              setCreatorFilter("all");
              setLicenseFilter("all");
            }}
            className="text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            Reset {activeFilters} filter{activeFilters > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {communityLoading ? (
          <TemplateSkeleton />
        ) : community.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 py-12 text-center">
            <div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <LayoutGrid className="size-5" />
            </div>
            <div className="px-4">
              <p className="text-xs font-semibold text-slate-700">No community templates yet</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Sign in and publish your deck from the top menu to share it here.
              </p>
            </div>
          </div>
        ) : filteredCommunity.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-10 text-center">
            <Search className="size-4 text-slate-300" />
            <p className="text-xs font-medium text-slate-500">No template matches your filters</p>
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
                  onLoad={() => loadTemplate(c)}
                />
              ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAll(true)}
        disabled={community.length === 0}
        className="group flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-40"
      >
        <LayoutGrid className="size-3.5" />
        <span>Show all templates</span>
        <span className="font-mono text-[11px] tabular-nums text-blue-100">
          · {filteredCommunity.length}
        </span>
      </button>

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
        loadTemplate={loadTemplate}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Style chip — minimal, colored dot, live count                       */
/* ------------------------------------------------------------------ */

function StyleChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {dot && <span className="size-1.5 rounded-sm" style={{ backgroundColor: dot }} />}
      <span>{label}</span>
      <span className={`font-mono text-[10px] tabular-nums ${active ? "text-blue-100" : "text-slate-400"}`}>
        {count}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                     */
/* ------------------------------------------------------------------ */

function TemplateSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="aspect-video min-h-[130px] animate-pulse bg-slate-100" />
          <div className="space-y-1.5 px-3.5 py-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-slate-400">
        <Loader2 className="size-3.5 animate-spin text-blue-500" />
        Loading templates…
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Template card                                                        */
/* ------------------------------------------------------------------ */

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
  const slides = c.pages?.length ?? 0;
  const style = getStyle(c);
  const meta = STYLE_META[style];
  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300">
      <button onClick={onLoad} className="block w-full !rounded-none text-left" title={`Load ${c.name}`}>
        <div className="relative w-full overflow-hidden border-b border-slate-100">
          {c.pages?.[0] ? (
            <SlideThumbnail
              page={c.pages[0] as Page}
              canvasW={c.canvas_w}
              canvasH={c.canvas_h}
              className="w-full min-h-[132px]"
            />
          ) : (
            <div style={{ aspectRatio: `${c.canvas_w} / ${c.canvas_h}`, background: "#f1f5f9" }} />
          )}
          {/* Hover overlay with CTA */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity duration-150 group-hover:bg-slate-950/25 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
              <Download className="size-3.5 text-blue-600" /> Use template
            </span>
          </div>
        </div>
      </button>

      {/* Like — top-right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        disabled={!canLike}
        title={canLike ? (liked ? "Unlike" : "Like") : "Sign in to like"}
        className={`absolute right-2 top-2 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums shadow-xs transition-colors ${
          liked
            ? "border-rose-200 bg-rose-50 text-rose-600"
            : "border-slate-200 bg-white/95 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        } ${!canLike ? "opacity-75" : ""}`}
      >
        <Heart className="size-3" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
        {likeCount}
      </button>

      {c.creator_profile?.username && (
        <Link
          to="/profile/$username" params={{ username: c.creator_profile.username }}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2 text-left transition-colors hover:bg-slate-50/80"
          title={`View ${c.creator_profile.display_name || c.creator_profile.username}'s profile`}
        >
          {c.creator_profile.avatar_url ? (
            <img src={c.creator_profile.avatar_url} alt="" className="size-5 rounded-full object-cover" />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
              {(c.creator_profile.display_name || c.creator_profile.username).slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 truncate text-[11px] font-medium text-slate-600">
            {c.creator_profile.display_name || `@${c.creator_profile.username}`}
          </span>
        </Link>
      )}

      {/* Footer — crisp title + unboxed single-line metadata */}
      <div className="px-3.5 py-2.5">
        <div className="truncate text-[13px] font-semibold tracking-tight text-slate-900" title={c.name}>
          {c.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
          <span className="size-1.5 shrink-0 rounded-sm" style={{ backgroundColor: meta.dot }} />
          <span>{meta.label}</span>
          <span className="text-slate-300">·</span>
          <span>{slides} slide{slides === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filtrage / tri                                                       */
/* ------------------------------------------------------------------ */

function filterTemplates(
  templates: PublicTemplate[],
  filters: { query: string; style: string; creator: string; license: string },
) {
  const query = filters.query.trim().toLowerCase();
  return templates.filter((template) => {
    const creator = template.creator ?? (template.user_id === "builtin" ? "builtin" : "community");
    const style = getStyle(template);
    const license = template.license ?? (template.user_id === "builtin" ? "CC0" : "community");
    return (
      (!query || `${template.name} ${creator} ${style} ${license}`.toLowerCase().includes(query)) &&
      (filters.style === "all" || style === filters.style) &&
      (filters.creator === "all" || creator === filters.creator) &&
      (filters.license === "all" || license === filters.license)
    );
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

/* ------------------------------------------------------------------ */
/* Dialog "Show all"                                                    */
/* ------------------------------------------------------------------ */

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
  loadTemplate,
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
  loadTemplate: (c: PublicTemplate) => void;
}) {
  const sorted = sortTemplates(templates, likeCounts, sortBy);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-5xl flex-col overflow-hidden rounded-xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-xl">
        <DialogHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <span>All templates</span>
            <span className="font-mono text-xs font-normal tabular-nums text-slate-400">
              · {templates.length}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
            {(["likes", "recent"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                  sortBy === s
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s === "likes" ? "Most liked" : "Recent"}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            {templates.length} template{templates.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-6">
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
                  loadTemplate(c);
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

