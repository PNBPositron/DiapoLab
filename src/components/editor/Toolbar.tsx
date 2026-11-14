import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { newText, useEditor } from "@/store/editor";
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Save,
  Cloud,
  LogOut,
  FilePlus,
  Github,
  Loader2,
  User as UserIcon,
  UserRound,
  ChevronDown,
  Share2,
  Upload,
  Settings,
  CheckCircle2,
  Sliders,
  Presentation,
  Play,
  LayoutTemplate,
  BookOpen,
  Scale,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useSettings } from "@/store/settings";
import { saveDesign, publishAsTemplate, createPrivateShare } from "@/lib/designs";
import { PublishMetaDialog, type PublishMeta } from "./PublishMetaDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ProfileDialog } from "./ProfileDialog";
import { requestPresentationFullscreen } from "./PresentationMode";
import { importPPTXFile } from "@/lib/import-pptx";
import {
  exportPNG,
  exportJPG,
  exportPPTX,
  exportPDF,
  exportGIF,
  exportMarkdown,
  exportJSON,
  importJSONFile,
} from "@/lib/export";

/**
 * DiapoLab logo (official brand SVG): gradient icon + two-tone wordmark.
 */
export function DiapoLabLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 502 128" className={className} role="img" aria-label="DiapoLab">
      <defs>
        <linearGradient id="dl-bgl" x1="12" y1="6" x2="116" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F8BFF" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="dl-sll" x1="47" y1="72" x2="81" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill="url(#dl-bgl)" />
      <path d="M0 30a30 30 0 0 1 30-30h68a30 30 0 0 1 30 30v10C90 20 40 36 0 60z" fill="#fff" opacity=".10" />
      <rect x="51" y="21" width="26" height="9" rx="4.5" fill="#fff" />
      <path fill="#fff" d="M56 29V52L33 90a9 9 0 0 0 7.7 13.5H87.3A9 9 0 0 0 95 90L72 52V29z" />
      <rect x="47" y="72" width="34" height="20" rx="4.5" fill="url(#dl-sll)" />
      <path d="M60.5 76.8v10.4a1 1 0 0 0 1.5.85l8.3-5.2a1 1 0 0 0 0-1.7l-8.3-5.2a1 1 0 0 0-1.5.85z" fill="#fff" />
      <circle cx="90" cy="35" r="4.2" fill="#BAE6FD" />
      <circle cx="100" cy="23" r="2.6" fill="#BAE6FD" opacity=".85" />
      <path d="M155.32 88.0V33.28H173.028Q173.674 33.28 175.688 33.318Q177.702 33.356 179.564 33.584Q186.176 34.382 190.774 38.182Q195.372 41.982 197.76600000000002 47.834Q200.16 53.686 200.16 60.64Q200.16 67.594 197.76600000000002 73.446Q195.372 79.298 190.774 83.098Q186.176 86.898 179.564 87.696Q177.702 87.924 175.688 87.962Q173.674 88.0 173.028 88.0ZM165.808 78.272H173.028Q174.054 78.272 175.80200000000002 78.215Q177.55 78.158 178.956 77.892Q182.528 77.17 184.789 74.548Q187.05 71.926 188.133 68.24000000000001Q189.216 64.554 189.216 60.64Q189.216 56.536 188.095 52.85Q186.974 49.164 184.694 46.618Q182.414 44.072 178.956 43.388Q177.55 43.084 175.80200000000002 43.04600000000001Q174.054 43.008 173.028 43.008H165.808Z M208.52 41.26V32.14H218.856V41.26ZM208.52 88.0V46.96H218.856V88.0Z M240.136 89.14Q235.728 89.14 232.66899999999998 87.449Q229.60999999999999 85.758 228.033 82.92699999999999Q226.456 80.096 226.456 76.676Q226.456 73.826 227.32999999999998 71.47Q228.204 69.114 230.161 67.309Q232.118 65.504 235.424 64.288Q237.704 63.452 240.858 62.806Q244.012 62.16 248.002 61.571Q251.992 60.982 256.78 60.260000000000005L253.05599999999998 62.312Q253.05599999999998 58.664 251.308 56.954Q249.56 55.244 245.456 55.244Q243.176 55.244 240.706 56.346000000000004Q238.236 57.448 237.248 60.260000000000005L227.9 57.296Q229.458 52.204 233.752 49.012Q238.046 45.82 245.456 45.82Q250.89 45.82 255.108 47.492000000000004Q259.326 49.164 261.492 53.268Q262.70799999999997 55.548 262.936 57.828Q263.164 60.108000000000004 263.164 62.92V88.0H254.12V79.564L255.412 81.312Q252.41 85.454 248.933 87.297Q245.456 89.14 240.136 89.14ZM242.34 81.008Q245.19 81.008 247.147 80.001Q249.10399999999998 78.994 250.26299999999998 77.702Q251.422 76.41 251.84 75.536Q252.638 73.864 252.77100000000002 71.641Q252.904 69.418 252.904 67.936L255.944 68.696Q251.346 69.456 248.49599999999998 69.969Q245.646 70.482 243.898 70.9Q242.15 71.318 240.82 71.812Q239.3 72.42 238.369 73.12299999999999Q237.438 73.826 237.00099999999998 74.662Q236.564 75.498 236.564 76.524Q236.564 77.93 237.267 78.93700000000001Q237.97 79.944 239.262 80.476Q240.554 81.008 242.34 81.008Z M291.664 89.14Q285.546 89.14 281.442 86.28999999999999Q277.338 83.44 275.26700000000005 78.538Q273.196 73.636 273.196 67.48Q273.196 61.324 275.24800000000005 56.422Q277.3 51.52 281.29 48.67Q285.28000000000003 45.82 291.132 45.82Q297.022 45.82 301.392 48.632000000000005Q305.762 51.444 308.175 56.327Q310.588 61.21 310.588 67.48Q310.588 73.636 308.213 78.538Q305.838 83.44 301.582 86.28999999999999Q297.326 89.14 291.664 89.14ZM271.448 106.24V46.96H280.568V75.08H281.86V106.24ZM289.992 79.944Q293.336 79.944 295.464 78.27199999999999Q297.592 76.6 298.618 73.769Q299.644 70.938 299.644 67.48Q299.644 64.06 298.58000000000004 61.229Q297.516 58.397999999999996 295.293 56.706999999999994Q293.07 55.016 289.612 55.016Q286.382 55.016 284.387 56.574Q282.392 58.132000000000005 281.48 60.944Q280.568 63.756 280.568 67.48Q280.568 71.20400000000001 281.48 74.016Q282.392 76.828 284.46299999999997 78.386Q286.534 79.944 289.992 79.944Z M335.896 89.14Q329.702 89.14 325.028 86.366Q320.354 83.592 317.751 78.709Q315.148 73.826 315.148 67.48Q315.148 61.058 317.808 56.175Q320.468 51.292 325.14200000000005 48.556Q329.81600000000003 45.82 335.896 45.82Q342.09000000000003 45.82 346.783 48.594Q351.476 51.368 354.098 56.251000000000005Q356.72 61.134 356.72 67.48Q356.72 73.864 354.079 78.747Q351.438 83.63 346.745 86.38499999999999Q342.052 89.14 335.896 89.14ZM335.896 79.488Q340.874 79.488 343.32500000000005 76.125Q345.776 72.762 345.776 67.48Q345.776 62.007999999999996 343.28700000000003 58.739999999999995Q340.798 55.472 335.896 55.472Q332.514 55.472 330.348 56.992000000000004Q328.182 58.512 327.137 61.21Q326.092 63.908 326.092 67.48Q326.092 72.99 328.581 76.239Q331.07 79.488 335.896 79.488Z" fill="#0F172A" />
      <path d="M364.32 88.0V33.28H374.656V78.348H398.216V88.0Z M414.55600000000004 89.14Q410.148 89.14 407.08900000000006 87.449Q404.03000000000003 85.758 402.45300000000003 82.92699999999999Q400.87600000000003 80.096 400.87600000000003 76.676Q400.87600000000003 73.826 401.75 71.47Q402.624 69.114 404.581 67.309Q406.538 65.504 409.844 64.288Q412.124 63.452 415.278 62.806Q418.432 62.16 422.422 61.571Q426.41200000000003 60.982 431.2 60.260000000000005L427.476 62.312Q427.476 58.664 425.728 56.954Q423.98 55.244 419.87600000000003 55.244Q417.596 55.244 415.126 56.346000000000004Q412.656 57.448 411.668 60.260000000000005L402.32 57.296Q403.878 52.204 408.172 49.012Q412.466 45.82 419.87600000000003 45.82Q425.31 45.82 429.528 47.492000000000004Q433.746 49.164 435.91200000000003 53.268Q437.12800000000004 55.548 437.356 57.828Q437.584 60.108000000000004 437.584 62.92V88.0H428.54V79.564L429.832 81.312Q426.83000000000004 85.454 423.35300000000007 87.297Q419.87600000000003 89.14 414.55600000000004 89.14ZM416.76 81.008Q419.61 81.008 421.567 80.001Q423.524 78.994 424.683 77.702Q425.842 76.41 426.26 75.536Q427.058 73.864 427.19100000000003 71.641Q427.324 69.418 427.324 67.936L430.36400000000003 68.696Q425.766 69.456 422.91600000000005 69.969Q420.06600000000003 70.482 418.318 70.9Q416.57 71.318 415.24 71.812Q413.72 72.42 412.789 73.12299999999999Q411.858 73.826 411.42100000000005 74.662Q410.98400000000004 75.498 410.98400000000004 76.524Q410.98400000000004 77.93 411.687 78.93700000000001Q412.39 79.944 413.682 80.476Q414.974 81.008 416.76 81.008Z M466.084 89.14Q459.966 89.14 455.862 86.28999999999999Q451.75800000000004 83.44 449.687 78.538Q447.61600000000004 73.636 447.61600000000004 67.48Q447.61600000000004 61.324 449.668 56.422Q451.72 51.52 455.71000000000004 48.67Q459.70000000000005 45.82 465.552 45.82Q471.442 45.82 475.812 48.632000000000005Q480.182 51.444 482.595 56.327Q485.00800000000004 61.21 485.00800000000004 67.48Q485.00800000000004 73.636 482.63300000000004 78.538Q480.25800000000004 83.44 476.00200000000007 86.28999999999999Q471.74600000000004 89.14 466.084 89.14ZM445.86800000000005 88.0V33.28H456.28000000000003V59.879999999999995H454.988V88.0ZM464.41200000000003 79.944Q467.75600000000003 79.944 469.884 78.27199999999999Q472.012 76.6 473.038 73.769Q474.064 70.938 474.064 67.48Q474.064 64.06 473.0 61.229Q471.93600000000004 58.397999999999996 469.713 56.706999999999994Q467.49 55.016 464.03200000000004 55.016Q460.802 55.016 458.807 56.574Q456.812 58.132000000000005 455.9 60.944Q454.988 63.756 454.988 67.48Q454.988 71.20400000000001 455.9 74.016Q456.812 76.828 458.88300000000004 78.386Q460.954 79.944 464.41200000000003 79.944Z" fill="#2563EB" />
    </svg>
  );
}

// Hook to close menus on outside click
function useClickOutside<T extends HTMLElement>(handler: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);
  return ref;
}

export function Toolbar() {
  const {
    undo,
    redo,
    clear,
    history,
    future,
    designId,
    designName,
    setDesignName,
    setDesignMeta,
    newDesign,
    pages,
    currentIndex,
    canvasW,
    canvasH,
    loadPages,
    setTool,
    setPresenting,
  } = useEditor();

  const { user } = useAuth();
  const navigate = useNavigate();
  const { appAccent } = useSettings();

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);


  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<null | "png" | "jpg" | "pdf" | "pptx" | "gif" | "markdown" | "json">(null);
  const [exportOpen, setExportOpen] = useState(false);

  const exportRef = useClickOutside<HTMLDivElement>(() => setExportOpen(false));
  const importRef = useRef<HTMLInputElement>(null);

  const runExport = async (kind: "png" | "jpg" | "pdf" | "pptx" | "gif" | "markdown" | "json") => {
    setExportOpen(false);
    setExporting(kind);
    try {
      const n = designName || "positron";
      if (kind === "png") await exportPNG(n);
      else if (kind === "jpg") await exportJPG(n);
      else if (kind === "pdf") await exportPDF(n);
      else if (kind === "pptx") await exportPPTX(n);
      else if (kind === "markdown") exportMarkdown(n);
      else if (kind === "json") exportJSON(n);
      else await exportGIF(n);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (file: File) => {
    try {
      if (/\.pptx$/i.test(file.name)) {
        await importPPTXFile(file);
        return;
      }
      await importJSONFile(file);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  };


  const handleSave = async (): Promise<string | null> => {
    if (!user) return null;
    setSaving(true);
    try {
      const { pages, canvasW, canvasH } = useEditor.getState();
      const saved = await saveDesign({
        id: designId,
        name: designName || "Untitled design",
        canvas_w: canvasW,
        canvas_h: canvasH,
        pages,
      });
      setDesignMeta({ id: saved.id, name: saved.name });
      setSavedAt(Date.now());
      return saved.id;
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePrivateShare = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      let id = useEditor.getState().designId;
      if (!id) {
        id = await handleSave();
      }
      if (!id) throw new Error("Could not save the design");
      const token = await createPrivateShare(id);
      const link = `${window.location.origin}/t/${encodeURIComponent(id)}?share=${encodeURIComponent(token)}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link).catch(() => {});
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to create the private link");
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = () => {
    if (!user || publishing) return;
    setPublishError(null);
    setPublishDialogOpen(true);
  };

  const submitPublish = async (meta: PublishMeta) => {
    setPublishing(true);
    setPublishError(null);
    try {
      const { pages, canvasW, canvasH } = useEditor.getState();
      const tpl = await publishAsTemplate({
        name: meta.name,
        canvas_w: canvasW,
        canvas_h: canvasH,
        pages,
      });
      setPublishDialogOpen(false);
      const link = `${window.location.origin}/t/${tpl.id}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link).catch(() => {});
    } catch (e) {
      console.error(e);
      setPublishError(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4">
      {/* LEFT: Logo + modern project name */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center gap-2.5">
          <Link to="/" className="flex items-center" aria-label="DiapoLab home">
            <DiapoLabLogo className="h-7 w-auto" />
          </Link>
        </div>

        {/* Decorative vertical divider */}
        <div className="hidden h-5 w-px bg-slate-200/70 md:block" />

        {/* Presentation name editing */}
        <div className="hidden items-center gap-2 md:flex">
          <div className="group relative flex items-center">
            <input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Untitled design"
              className="h-8 rounded-lg border border-transparent bg-transparent px-2.5 font-mono text-xs font-medium text-slate-700 transition-all hover:bg-slate-100/80 focus:border-slate-300 focus:bg-white focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {savedAt && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-blue-700 animate-in fade-in">
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Tools, AI, Save, Export and Hamburger Menu */}
      <div className="flex items-center gap-1 rounded-[1.25rem] border border-white/70 bg-white/60 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-16px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.03] backdrop-blur-2xl">
        {/* Undo / Redo grouped macOS/Figma style */}
        <div className="flex items-center rounded-xl p-0.5">
          <button
            onClick={undo}
            disabled={history.length === 0}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Import JSON */}
        <button
          onClick={() => importRef.current?.click()}
          title="Import .json design or .pptx deck"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Upload className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />
        {/* Find & replace */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("diapolab:open-find"))}
          title="Find & replace (Ctrl+F)"
          aria-label="Find & replace"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Search className="h-4 w-4" strokeWidth={2.2} />
        </button>

        {/* Save / Sign-in button */}
        {user ? (
          <button
            onClick={handleSave}
            disabled={saving}
            title="Save design"
            className="flex h-9 items-center gap-2 rounded-xl border border-transparent bg-transparent px-3.5 font-display text-[11px] font-medium tracking-wider text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-100 active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.4} />
            )}
            <span>Save</span>
          </button>
        ) : (
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 font-display text-[11px] font-medium tracking-wider text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Cloud className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.4} />
            <span>Sign in</span>
          </Link>
        )}

        {/* Modern gradient Export button */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 font-display text-[11px] font-semibold tracking-wider text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all hover:from-blue-400 hover:to-blue-500 active:scale-95 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            <span>{exporting ? exporting : "Export"}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
            />
          </button>

          {exportOpen && (
            <div className="toolbar-flyout absolute right-0 top-11 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[9px] font-bold tracking-wider text-slate-400">
                Document formats
              </div>
              {(["png", "jpg", "pdf", "pptx", "markdown", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-display text-xs text-slate-700 transition-colors hover:bg-slate-100/90"
                >
                  <span className="font-semibold text-slate-800">.{k.toUpperCase()}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {k === "png"
                      ? "Current slide"
                      : k === "gif"
                      ? "Animated"
                      : k === "json"
                      ? "Source file"
                      : "All slides"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Present */}
        <button
          onClick={async () => {
            const enteredFullscreen = await requestPresentationFullscreen();
            if (enteredFullscreen) setPresenting(true);
          }}
          title="Present"
          type="button"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 hover:shadow-[0_10px_28px_rgba(37,99,235,0.35)] active:scale-[0.98]"
        >
          <Play className="h-3.5 w-3.5 fill-white" /> Present
        </button>

        {/* GitHub repository */}
        <button
          onClick={() => window.open("https://github.com/PNBPositron/DiapoLab", "_blank", "noopener,noreferrer")}
          title="GitHub repository"
          aria-label="GitHub repository"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Github className="h-4 w-4" strokeWidth={2.2} />
        </button>

        {/* Private share */}
        {user && (
          <button
            onClick={handlePrivateShare}
            disabled={publishing}
            title="Copy private share link"
            aria-label="Copy private share link"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:opacity-60"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" strokeWidth={2.2} />}
          </button>
        )}

        {/* Settings */}
        <button
          onClick={() => setSettingsDialogOpen(true)}
          title="Settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <Settings className="h-4 w-4" strokeWidth={2.2} />
        </button>

        {/* User profile */}
        {user && <UserMenu email={user.email ?? ""} onEditProfile={() => setProfileDialogOpen(true)} />}

        {/* NEW ENLARGED & ULTRA-STYLED HAMBURGER MENU */}
        <LargeModernHamburger
          onNewDesign={newDesign}
          onPublish={handlePublish}
          onClear={clear}
          publishing={publishing}
          isAuthenticated={!!user}
        />
      </div>


      {/* Settings dialog (moved from sidebar) — portaled to body so the
          sticky/backdrop-blur header does not become its containing block */}
      {settingsDialogOpen &&
        createPortal(<SettingsDialog onClose={() => setSettingsDialogOpen(false)} />, document.body)}

      {/* Profile dialog — standalone, outside Settings */}
      {profileDialogOpen &&
        createPortal(<ProfileDialog onClose={() => setProfileDialogOpen(false)} />, document.body)}


      {/* Publish dialog */}
      <PublishMetaDialog
        open={publishDialogOpen}
        kind="template"
        defaultName={designName || "Untitled template"}
        defaultAuthor={user?.user_metadata?.full_name ?? user?.email ?? ""}
        busy={publishing}
        error={publishError}
        onCancel={() => setPublishDialogOpen(false)}
        onSubmit={submitPublish}
      />


      {/* Published link notification */}
      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 font-display text-sm tracking-wider text-blue-600">
              <CheckCircle2 className="size-5" /> Published successfully
            </div>
            <p className="mt-2 font-mono text-xs text-slate-500">
              Your presentation is now online. Anyone with this link can view it.
            </p>
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-700 select-all focus:outline-none"
            />
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-display text-xs tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                Copy link
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-display text-xs tracking-wider text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * BIGGER, BETTER-LOOKING & STRUCTURED HAMBURGER MENU
 */
function LargeModernHamburger({
  onNewDesign,
  onPublish,
  onClear,
  publishing,
  isAuthenticated,
}: {
  onNewDesign: () => void;
  onPublish: () => void;
  onClear: () => void;
  publishing: boolean;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button — soft ring on hover, filled slate when open */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle Navigation Menu"
        title="Menu"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
          open
            ? "border-slate-800 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
            : "border-slate-200/90 bg-white/80 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900 hover:ring-4 hover:ring-slate-900/[0.06]"
        }`}
      >
        {/* Animated 3-line hamburger → X */}
        <div className="relative flex h-4 w-4.5 flex-col justify-between">
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-[7px] rotate-45 bg-white" : "bg-current"
            }`}
          />
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-200 ${
              open ? "scale-x-0 opacity-0" : "opacity-100"
            } bg-current`}
          />
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "-translate-y-[7px] -rotate-45 bg-white" : "bg-current"
            }`}
          />
        </div>
      </button>

      {/* Expanded dropdown — fully opaque, wider, spring entrance */}
      {open && (
        <div className="toolbar-flyout absolute right-0 top-12 z-50 w-80 origin-top-right rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_24px_56px_-12px_rgba(15,23,42,0.24)] animate-in fade-in zoom-in-95 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]">
          {/* CREATE & AI SECTION */}
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
            <span className="size-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-[9px] font-bold tracking-wider text-slate-400">
              Create
            </span>
          </div>

          <MenuCardItem
            icon={FilePlus}
            title="New design"
            subtitle="Start a blank presentation"
            onClick={() => handleAction(onNewDesign)}
          />

          {isAuthenticated && (
            <>
              <MenuCardItem
                icon={publishing ? Loader2 : Upload}
                iconColor="text-blue-600"
                iconBg="bg-blue-50 group-hover:bg-blue-100/80"
                title={publishing ? "Publishing…" : "Publish template to community"}
                subtitle="Share this deck in the marketplace"
                disabled={publishing}
                onClick={() => handleAction(onPublish)}
              />
            </>
          )}

          {/* SEPARATOR */}
          <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* SEPARATOR */}
          <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* EXPLORE SECTION */}
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-1">
            <span className="size-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] font-bold tracking-wider text-slate-400">
              Explore
            </span>
          </div>

          <MenuCardItem
            icon={LayoutTemplate}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 group-hover:bg-blue-100/80"
            title="Marketplace"
            subtitle="Community templates & add-ons"
            onClick={() => handleAction(() => navigate({ to: "/marketplace" }))}
          />
          <MenuCardItem
            icon={BookOpen}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 group-hover:bg-blue-100/80"
            title="Wiki"
            subtitle="Guides, shortcuts & FAQ"
            onClick={() => handleAction(() => navigate({ to: "/wiki" }))}
          />
          <MenuCardItem
            icon={Scale}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 group-hover:bg-blue-100/80"
            title="License"
            subtitle="Terms & usage rights"
            onClick={() => handleAction(() => navigate({ to: "/license" }))}
          />
          <MenuCardItem
            icon={ShieldCheck}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 group-hover:bg-blue-100/80"
            title="Privacy policy"
            subtitle="How your data is handled"
            onClick={() => handleAction(() => navigate({ to: "/privacypolicy" }))}
          />

          {/* DANGER SECTION */}
          <MenuCardItem
            icon={Trash2}
            iconColor="text-red-600"
            iconBg="bg-red-50 group-hover:bg-red-100"
            title="Clear canvas"
            subtitle="Reset this slide to zero"
            variant="destructive"
            onClick={() => handleAction(onClear)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Modern card-style menu button — icon chip, arrow reveal on hover
 */
function MenuCardItem({
  icon: Icon,
  iconColor = "text-slate-600",
  iconBg = "bg-slate-100 group-hover:bg-slate-200/80",
  title,
  subtitle,
  badge,
  disabled,
  variant = "default",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle: string;
  badge?: string;
  disabled?: boolean;
  variant?: "default" | "destructive";
  onClick: () => void;
}) {
  const isDestructive = variant === "destructive";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center justify-between rounded-xl p-2 text-left transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
        isDestructive ? "hover:bg-red-50/70" : "hover:bg-slate-100/90"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-lg transition-all duration-150 group-hover:scale-105 ${iconBg}`}
        >
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xs font-semibold leading-tight ${
              isDestructive ? "text-red-700" : "text-slate-800"
            }`}
          >
            {title}
          </span>
          <span className="text-[10px] leading-tight text-slate-400">
            {subtitle}
          </span>
        </div>
      </div>

      {badge ? (
        <span className="rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 shadow-sm ring-1 ring-blue-200/60">
          {badge}
        </span>
      ) : (
        <svg
          className="size-3.5 -translate-x-1 text-slate-300 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      )}
    </button>
  );
}

function UserMenu({ email, onEditProfile }: { email: string; onEditProfile: () => void }) {
  const [open, setOpen] = useState(false);
  const userRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div className="relative" ref={userRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={email}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white active:scale-95"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2.2} />
      </button>
      {open && (
        <div className="toolbar-flyout absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-semibold tracking-wider text-slate-400">Active account</p>
            <p className="truncate font-mono text-xs font-medium text-slate-800">{email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); onEditProfile(); }}
            className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <UserRound className="h-4 w-4" />
            <span>Edit profile</span>
          </button>
          <button
            onClick={() => signOut()}
            className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

