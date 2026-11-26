import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useEditor, type Page } from "@/store/editor";
import { PresentationMode, requestPresentationFullscreen } from "@/components/editor/PresentationMode";
import { SlideThumbnail } from "@/components/editor/SlideThumbnail";
import { formatTransitionLabel, isThreeTransition } from "@/lib/motion-catalog";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LayoutGrid,
  Link2Off,
  Loader2,
  Lock,
  Maximize2,
  MonitorPlay,
  Moon,
  Pause,
  Play,
  QrCode,
  Rows3,
  Sun,
} from "lucide-react";

export const Route = createFileRoute("/t/$id")({
  component: SharedTemplate,
  validateSearch: (search: Record<string, unknown>) => ({
    share: typeof search.share === "string" ? search.share : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shared deck — DiapoLab" },
      {
        name: "description",
        content: "View a deck shared privately or publicly from DiapoLab, a focused presentation workspace.",
      },
      { property: "og:title", content: "Shared deck — DiapoLab" },
      { property: "og:description", content: "View a shared presentation deck on DiapoLab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
    ],
  }),
});

function formatAspectRatio(w: number, h: number): string {
  if (!w || !h) return "16:9";
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.04) return "16:9";
  if (Math.abs(r - 9 / 16) < 0.04) return "9:16";
  if (Math.abs(r - 4 / 3) < 0.04) return "4:3";
  if (Math.abs(r - 4 / 5) < 0.04) return "4:5";
  if (Math.abs(r - 1) < 0.04) return "1:1";
  if (Math.abs(r - 1240 / 1754) < 0.04) return "A4";
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(Math.round(w), Math.round(h));
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

function SharedTemplate() {
  const { id } = Route.useParams();
  const { share } = Route.useSearch();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"stage" | "grid">("stage");
  const [stageTone, setStageTone] = useState<"light" | "dark">("light");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(true);

  const pages = useEditor((s) => s.pages);
  const currentIndex = useEditor((s) => s.currentIndex);
  const setCurrentPage = useEditor((s) => s.setCurrentPage);
  const presenting = useEditor((s) => s.presenting);
  const canvasW = useEditor((s) => s.canvasW);
  const canvasH = useEditor((s) => s.canvasH);

  const isPrivateShare = Boolean(share);

  // Exclude slides marked hiddenInPresent (falling back to all slides if all are hidden)
  const visibleSlides = useMemo(() => {
    const shown = pages
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => !page.hiddenInPresent);
    return shown.length > 0 ? shown : pages.map((page, index) => ({ page, index }));
  }, [pages]);

  const activeVisiblePos = useMemo(() => {
    const pos = visibleSlides.findIndex((item) => item.index === currentIndex);
    return pos >= 0 ? pos : 0;
  }, [visibleSlides, currentIndex]);

  const activeEntry = visibleSlides[activeVisiblePos];
  const hiddenSlideCount = pages.length - visibleSlides.length;
  const hasThreeD = useMemo(
    () => visibleSlides.some(({ page }) => isThreeTransition(page.transition)),
    [visibleSlides],
  );

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setAutoAdvance(false);

    (async () => {
      if (share) {
        type SharedRpc = (
          fn: string,
          args: { p_design_id: string; p_token: string },
        ) => Promise<{
          data: { name: string; canvas_w: number; canvas_h: number; pages: Page[] } | null;
          error: { message: string } | null;
        }>;
        const { data, error: rpcError } = await (supabase.rpc as unknown as SharedRpc)(
          "get_shared_design",
          { p_design_id: id, p_token: share },
        );
        if (cancelled) return;
        if (rpcError) {
          setError(
            /^could not find|does not exist|function/i.test(rpcError.message)
              ? "Private links are not enabled on this server yet. The database function get_shared_design must be installed."
              : rpcError.message,
          );
          return;
        }
        if (!data) {
          setError("This private link is invalid or has been revoked by the owner.");
          return;
        }
        const shared = data as { name: string; canvas_w: number; canvas_h: number; pages: Page[] };
        const st = useEditor.getState();
        st.setCanvasSize(shared.canvas_w, shared.canvas_h);
        st.loadPages(shared.pages);
        const firstVis = shared.pages.findIndex((p) => !p.hiddenInPresent);
        if (firstVis > 0) st.setCurrentPage(firstVis);
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
      const loadedPages = data.pages as unknown as Page[];
      const st = useEditor.getState();
      st.setCanvasSize(data.canvas_w, data.canvas_h);
      st.loadPages(loadedPages);
      const firstVis = loadedPages.findIndex((p) => !p.hiddenInPresent);
      if (firstVis > 0) st.setCurrentPage(firstVis);
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

  useEffect(() => {
    if (!name) return;
    const previousTitle = document.title;
    document.title = `${name} — DiapoLab`;
    return () => {
      document.title = previousTitle;
    };
  }, [name]);

  // Inline keyboard navigation when not in fullscreen PresentationMode
  useEffect(() => {
    if (!ready || error || presenting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (activeVisiblePos < visibleSlides.length - 1) {
          e.preventDefault();
          setCurrentPage(visibleSlides[activeVisiblePos + 1].index);
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (activeVisiblePos > 0) {
          e.preventDefault();
          setCurrentPage(visibleSlides[activeVisiblePos - 1].index);
        }
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setViewMode((v) => (v === "stage" ? "grid" : "stage"));
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void requestPresentationFullscreen();
        useEditor.getState().setPresenting(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, error, presenting, activeVisiblePos, visibleSlides, setCurrentPage]);

  // Inline auto-advance preview
  useEffect(() => {
    if (!ready || !autoAdvance || presenting || visibleSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      const nextPos = (activeVisiblePos + 1) % visibleSlides.length;
      setCurrentPage(visibleSlides[nextPos].index);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [ready, autoAdvance, presenting, activeVisiblePos, visibleSlides, setCurrentPage]);

  const startPresentation = (slideIndex?: number) => {
    if (!ready) return;
    setAutoAdvance(false);
    if (typeof slideIndex === "number") {
      setCurrentPage(slideIndex);
    } else if (activeEntry) {
      setCurrentPage(activeEntry.index);
    }
    void requestPresentationFullscreen();
    useEditor.getState().setPresenting(true);
  };

  const handleCopyLink = async () => {
    const urlToCopy = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored in restricted frames
    }
  };

  const handleOpenCopyInEditor = () => {
    const st = useEditor.getState();
    st.setCanvasSize(canvasW, canvasH);
    st.loadPages(structuredClone(pages));
    st.setDesignMeta({ id: null, name: `${name || "Shared deck"} (Copy)` });
    navigate({ to: "/" });
  };

  const stepPrev = () => {
    if (activeVisiblePos > 0) {
      setCurrentPage(visibleSlides[activeVisiblePos - 1].index);
    }
  };

  const stepNext = () => {
    if (activeVisiblePos < visibleSlides.length - 1) {
      setCurrentPage(visibleSlides[activeVisiblePos + 1].index);
    }
  };

  const ratioLabel = formatAspectRatio(canvasW, canvasH);
  const aspect = (canvasW / Math.max(1, canvasH)).toFixed(4);
  const stageMaxWidthStyle = { maxWidth: `min(100%, calc(62vh * ${aspect}))` };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      {/* Three-zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-8 px-6 lg:px-10">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-base font-semibold tracking-tight text-slate-950"
          >
            <img src="/favicon.svg" alt="" className="size-6 shrink-0 rounded-md object-contain" />
            <span>DiapoLab</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link
              to="/marketplace"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
            >
              Marketplace
            </Link>
            <Link
              to="/wiki"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
            >
              Documentation
            </Link>
            <Link
              to="/"
              className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-4"
            >
              Workspace
            </Link>
          </nav>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              disabled={!ready || Boolean(error)}
              onClick={() => startPresentation()}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-45"
            >
              {ready ? (
                <Play className="size-3.5 fill-white" />
              ) : error ? (
                <MonitorPlay className="size-3.5" />
              ) : (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              <span>{ready ? "Present deck" : error ? "Unavailable" : "Loading"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-6 py-8 lg:px-10 lg:py-10">
        {error ? (
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_36px_-18px_rgba(15,23,42,0.12)] sm:p-10">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Link2Off className="size-5" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 [text-wrap:balance]">
              Shared link unavailable
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{error}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Open workspace
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Browse templates
              </Link>
            </div>
          </div>
        ) : !ready ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200/80" />
              <div className="h-4 w-56 animate-pulse rounded bg-slate-200/60" />
            </div>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="aspect-video w-full animate-pulse rounded-2xl border border-slate-200 bg-white" />
              <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        ) : (
          <>
            {/* Editorial Title & Clean Unboxed Metadata */}
            <section className="mb-8 flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-6 md:flex-row md:items-end">
              <div className="min-w-0">
                <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight text-slate-950 [text-wrap:balance]">
                  {name || "Untitled deck"}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    {isPrivateShare && <Lock className="size-3.5 text-slate-500" aria-hidden="true" />}
                    {isPrivateShare ? "Private link" : "Public template"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{isPrivateShare ? "View only" : "Community remixable"}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {visibleSlides.length} {visibleSlides.length === 1 ? "slide" : "slides"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {canvasW}×{canvasH} ({ratioLabel})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-slate-500" />}
                  <span>{copied ? "Link copied" : "Copy link"}</span>
                </button>
                {!isPrivateShare && (
                  <button
                    type="button"
                    onClick={handleOpenCopyInEditor}
                    className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <ExternalLink className="size-3.5 text-slate-500" />
                    <span>Open copy in editor</span>
                  </button>
                )}
              </div>
            </section>

            {/* Primary Viewer Split */}
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Left: Dominant Interactive Stage + Filmstrip / Grid */}
              <div className="min-w-0 space-y-5">
                {viewMode === "stage" && activeEntry ? (
                  <>
                    <div
                      className={`group relative flex min-h-[300px] items-center justify-center rounded-2xl border p-4 transition-colors duration-200 sm:p-8 ${
                        stageTone === "dark"
                          ? "border-slate-800 bg-[#0b0f19]"
                          : "border-slate-200 bg-[#f1f3f5]"
                      }`}
                    >
                      <div
                        className="relative w-full overflow-hidden rounded-xl shadow-[0_20px_56px_-18px_rgba(15,23,42,0.28)] ring-1 ring-black/10"
                        style={stageMaxWidthStyle}
                        onDoubleClick={() => startPresentation(activeEntry.index)}
                      >
                        <SlideThumbnail
                          page={activeEntry.page}
                          canvasW={canvasW}
                          canvasH={canvasH}
                          hidePresentElements
                          className="w-full"
                        />
                      </div>

                      {visibleSlides.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={stepPrev}
                            disabled={activeVisiblePos === 0}
                            aria-label="Previous slide"
                            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-md transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-0 sm:left-5"
                          >
                            <ChevronLeft className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={stepNext}
                            disabled={activeVisiblePos >= visibleSlides.length - 1}
                            aria-label="Next slide"
                            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-md transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-0 sm:right-5"
                          >
                            <ChevronRight className="size-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Stage Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={stepPrev}
                          disabled={activeVisiblePos === 0}
                          aria-label="Previous slide"
                          className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-35"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="min-w-[4.5rem] text-center font-mono text-xs font-medium tabular-nums text-slate-700">
                          {String(activeVisiblePos + 1).padStart(2, "0")} /{" "}
                          {String(visibleSlides.length).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={stepNext}
                          disabled={activeVisiblePos >= visibleSlides.length - 1}
                          aria-label="Next slide"
                          className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:opacity-35"
                        >
                          <ChevronRight className="size-4" />
                        </button>

                        {visibleSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setAutoAdvance((v) => !v)}
                            className={`ml-1 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition-colors ${
                              autoAdvance
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                          >
                            {autoAdvance ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                            <span>{autoAdvance ? "Pause preview" : "Auto-advance"}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Stage Backdrop Switch */}
                        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => setStageTone("light")}
                            aria-label="Light stage background"
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              stageTone === "light"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Sun className="size-3.5" />
                            <span>Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStageTone("dark")}
                            aria-label="Dark stage background"
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                              stageTone === "dark"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Moon className="size-3.5" />
                            <span>Dark</span>
                          </button>
                        </div>

                        {/* View Mode Switch */}
                        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => setViewMode("stage")}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-2xs"
                          >
                            <Rows3 className="size-3.5" />
                            <span>Stage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode("grid")}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
                          >
                            <LayoutGrid className="size-3.5" />
                            <span>Grid</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => startPresentation(activeEntry.index)}
                          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-300 hover:text-blue-600"
                        >
                          <Maximize2 className="size-3.5" />
                          <span>Fullscreen from #{activeVisiblePos + 1}</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Filmstrip */}
                    {visibleSlides.length > 1 && (
                      <div className="overflow-x-auto pb-2">
                        <div className="flex gap-3">
                          {visibleSlides.map(({ page, index }, visIdx) => {
                            const selected = index === activeEntry.index;
                            return (
                              <div
                                key={page.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setCurrentPage(index)}
                                onDoubleClick={() => startPresentation(index)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setCurrentPage(index);
                                  }
                                }}
                                aria-label={`Go to slide ${visIdx + 1}`}
                                aria-current={selected ? "true" : undefined}
                                className="group shrink-0 cursor-pointer text-left focus-visible:outline-none"
                              >
                                <div
                                  className={`w-36 overflow-hidden rounded-xl border bg-white transition-all sm:w-40 ${
                                    selected
                                      ? "border-blue-600 ring-2 ring-blue-600/25"
                                      : "border-slate-200 opacity-85 hover:border-slate-300 hover:opacity-100"
                                  }`}
                                >
                                  <SlideThumbnail
                                    page={page}
                                    canvasW={canvasW}
                                    canvasH={canvasH}
                                    hidePresentElements
                                    className="w-full"
                                  />
                                </div>
                                <div className="mt-1.5 flex items-center justify-between px-0.5 text-[11px] tabular-nums">
                                  <span className={selected ? "font-semibold text-blue-600" : "font-mono text-slate-500"}>
                                    {String(visIdx + 1).padStart(2, "0")}
                                  </span>
                                  {page.transition && page.transition !== "none" && (
                                    <span className="truncate text-[10px] text-slate-400">
                                      {formatTransitionLabel(page.transition)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Grid Overview Mode */
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                      <span className="text-xs font-medium text-slate-600 tabular-nums">
                        All {visibleSlides.length} {visibleSlides.length === 1 ? "slide" : "slides"} · Click to inspect or double-click to present
                      </span>
                      <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode("stage")}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
                        >
                          <Rows3 className="size-3.5" />
                          <span>Stage</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("grid")}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-2xs"
                        >
                          <LayoutGrid className="size-3.5" />
                          <span>Grid</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleSlides.map(({ page, index }, visIdx) => {
                        const selected = index === activeEntry?.index;
                        return (
                          <div
                            key={page.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentPage(index);
                              setViewMode("stage");
                            }}
                            onDoubleClick={() => startPresentation(index)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setCurrentPage(index);
                                setViewMode("stage");
                              }
                            }}
                            className="group cursor-pointer text-left focus-visible:outline-none"
                          >
                            <div
                              className={`overflow-hidden rounded-xl border bg-white transition-all duration-150 ${
                                selected
                                  ? "border-blue-600 ring-2 ring-blue-600/20"
                                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                              }`}
                            >
                              <SlideThumbnail
                                page={page}
                                canvasW={canvasW}
                                canvasH={canvasH}
                                hidePresentElements
                                className="w-full"
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between px-0.5 text-xs text-slate-500">
                              <span className="font-mono font-medium tabular-nums text-slate-800">
                                Slide {String(visIdx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {page.transition && page.transition !== "none"
                                  ? formatTransitionLabel(page.transition)
                                  : "Standard"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Rail: Deck Summary & Mobile QR Handoff */}
              <aside className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-950">Deck overview</h2>
                  <button
                    type="button"
                    onClick={() => setQrExpanded((v) => !v)}
                    aria-expanded={qrExpanded}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <QrCode className="size-3.5" />
                    <span>{qrExpanded ? "Hide QR" : "Show QR"}</span>
                  </button>
                </div>

                <dl className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Access</dt>
                    <dd className="font-medium text-slate-900">
                      {isPrivateShare ? "Private link · View only" : "Public · View & remix"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Slides</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900">
                      {visibleSlides.length}
                      {hiddenSlideCount > 0 ? ` (${hiddenSlideCount} hidden)` : ""}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Format</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900">
                      {canvasW}×{canvasH} · {ratioLabel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Transitions</dt>
                    <dd className="font-medium text-slate-900">
                      {hasThreeD ? "Interactive 3D & motion" : "Slide motion"}
                    </dd>
                  </div>
                </dl>

                {qrExpanded && shareUrl && (
                  <div className="mt-5 border-t border-slate-100 pt-5 text-center">
                    <div className="mx-auto inline-block rounded-xl border border-slate-200 bg-white p-3">
                      <QRCodeSVG value={shareUrl} size={120} level="M" marginSize={1} />
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
                      Scan to open this presentation on your phone or tablet.
                    </p>
                  </div>
                )}

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-slate-500" />}
                    <span>{copied ? "Link copied to clipboard" : "Copy share link"}</span>
                  </button>
                  {!isPrivateShare && (
                    <button
                      type="button"
                      onClick={handleOpenCopyInEditor}
                      className="flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                    >
                      <ExternalLink className="size-3.5 text-slate-500" />
                      <span>Open copy in editor</span>
                    </button>
                  )}
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                  <p className="font-medium text-slate-700">Shortcuts</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span>Navigate slides</span>
                      <span className="font-mono text-slate-700">← / →</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fullscreen present</span>
                      <span className="font-mono text-slate-700">F</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Toggle slide grid</span>
                      <span className="font-mono text-slate-700">G</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto mt-10 flex max-w-[1360px] items-center justify-between border-t border-slate-200/80 px-6 py-6 text-xs text-slate-500 lg:px-10">
        <span>
          Shared via{" "}
          <Link to="/" className="font-medium text-slate-700 hover:text-blue-600">
            DiapoLab
          </Link>
        </span>
        <span className="flex items-center gap-4">
          <Link to="/marketplace" className="hover:text-slate-900">
            Marketplace
          </Link>
          <Link to="/wiki" className="hover:text-slate-900">
            Documentation
          </Link>
        </span>
      </footer>

      <PresentationMode />
    </div>
  );
}
