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
  ChevronDown,
  Share2,
  Upload,
  Settings,
  CheckCircle2,
  Sliders,
  Presentation,
  Puzzle,
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
import { CommandPalette } from "./CommandPalette";
import { importPPTXFile } from "@/lib/import-pptx";
import {
  exportPNG,
  exportJPG,
  exportPDF,
  exportPDFPrint,
  exportPPTX,
  exportGIF,
  exportMarkdown,
  exportJSON,
  importJSONFile,
} from "@/lib/export";

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
  } = useEditor();

  const { user } = useAuth();
  const navigate = useNavigate();
  const { appAccent, setAppAccent } = useSettings();
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);


  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<null | "png" | "jpg" | "pdf" | "pdf-print" | "pptx" | "gif" | "markdown" | "json">(null);
  const [exportOpen, setExportOpen] = useState(false);

  const exportRef = useClickOutside<HTMLDivElement>(() => setExportOpen(false));
  const importRef = useRef<HTMLInputElement>(null);

  const runExport = async (kind: "png" | "jpg" | "pdf" | "pdf-print" | "pptx" | "gif" | "markdown" | "json") => {
    setExportOpen(false);
    setExporting(kind);
    try {
      const n = designName || "positron";
      if (kind === "png") await exportPNG(n);
      else if (kind === "jpg") await exportJPG(n);
      else if (kind === "pdf") await exportPDF(n);
      else if (kind === "pdf-print") exportPDFPrint(n);
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
          <button
            type="button"
            aria-label="Customize app accent"
            aria-expanded={brandMenuOpen}
            onClick={() => setBrandMenuOpen((open) => !open)}
            className="group relative flex size-9 items-center justify-center rounded-xl bg-transparent transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <img
              src="/favicon.ico"
              alt="DiapoLab"
              className="size-8 rounded-lg object-contain drop-shadow-[0_2px_6px_rgba(15,23,42,0.18)]"
            />
          </button>
          <Link to="/" className="logo-wordmark text-base font-bold tracking-[0.2em] text-slate-800 transition-colors hover:text-blue-600">DIAPOLAB</Link>
          {brandMenuOpen && (
            <div className="toolbar-flyout absolute left-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)]">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">App appearance</div>
              <label className="flex items-center justify-between gap-3 text-xs text-slate-600">Accent <input type="color" value={appAccent} onChange={(event) => setAppAccent(event.target.value)} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" /></label>
            </div>
          )}
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
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700 animate-in fade-in">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Saved
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Tools, AI, Save, Export and Hamburger Menu */}
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200/60 bg-white/70 p-1 shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title="Search commands (Ctrl+K)"
          aria-label="Search commands and features"
          className="flex h-9 items-center gap-2 rounded-xl border border-transparent bg-transparent px-3 text-[11px] font-medium text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">SEARCH</span>
          <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-400 sm:inline">Ctrl K</kbd>
        </button>

        {/* Undo / Redo grouped macOS/Figma style */}
        <div className="flex items-center rounded-xl p-0.5">
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={redo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
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
        {/* Save / Sign-in button */}
        {user ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-9 items-center gap-2 rounded-xl border border-transparent bg-transparent px-3.5 font-display text-[11px] font-medium tracking-wider text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-100 active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-500" strokeWidth={2.4} />
            )}
            <span>SAVE</span>
          </button>
        ) : (
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 font-display text-[11px] font-medium tracking-wider text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
          >
            <Cloud className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.4} />
            <span>SIGN IN</span>
          </Link>
        )}

        {/* Modern gradient Export button */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="flex h-9 items-center gap-2 rounded-xl border border-transparent bg-transparent px-3.5 font-display text-[11px] font-semibold tracking-wider text-blue-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 active:scale-95 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            <span>{exporting ? exporting.toUpperCase() : "EXPORT"}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
            />
          </button>

          {exportOpen && (
            <div className="toolbar-flyout absolute right-0 top-11 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Document formats
              </div>
              {(["png", "jpg", "pdf-print", "pdf", "pptx", "markdown", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-display text-xs text-slate-700 transition-colors hover:bg-slate-100/90"
                >
                  <span className="font-semibold text-slate-800">.{k.toUpperCase()}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {k === "png"
                      ? "Current slide"
                      : k === "pdf-print"
                      ? "Vector · selectable"
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

        {/* User profile */}
        {user && <UserMenu email={user.email ?? ""} />}

        {/* NEW ENLARGED & ULTRA-STYLED HAMBURGER MENU */}
        <LargeModernHamburger
          onSettings={() => setSettingsDialogOpen(true)}
          onNewDesign={newDesign}
          onShare={handlePrivateShare}
          onPublish={handlePublish}
          onClear={clear}
          onAssistant={() => setTool("plugins")}
          publishing={publishing}
          isAuthenticated={!!user}
        />
      </div>


      {/* Settings dialog (moved from sidebar) — portaled to body so the
          sticky/backdrop-blur header does not become its containing block */}
      {settingsDialogOpen &&
        createPortal(<SettingsDialog onClose={() => setSettingsDialogOpen(false)} />, document.body)}


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
            <div className="flex items-center gap-2 font-display text-sm tracking-wider text-emerald-600">
              <CheckCircle2 className="size-5" /> PUBLISHED SUCCESSFULLY
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
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-display text-xs uppercase tracking-wider text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
              >
                Copy link
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-display text-xs uppercase tracking-wider text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}

/**
 * BIGGER, BETTER-LOOKING & STRUCTURED HAMBURGER MENU
 */
function LargeModernHamburger({
  onSettings,
  onNewDesign,
  onShare,
  onPublish,
  onClear,
  onAssistant,
  publishing,
  isAuthenticated,
}: {
  onSettings: () => void;
  onNewDesign: () => void;
  onShare: () => void;
  onPublish: () => void;
  onClear: () => void;
  onAssistant: () => void;
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
            <span className="size-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Create
            </span>
          </div>

          <MenuCardItem
            icon={FilePlus}
            title="New design"
            subtitle="Start a blank presentation"
            onClick={() => handleAction(onNewDesign)}
          />

          <MenuCardItem
            icon={Puzzle}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50 group-hover:bg-indigo-100/80"
            title="Plugins"
            subtitle="Import & manage widget packs"
            onClick={() => handleAction(onAssistant)}
          />

          {isAuthenticated && (
            <>
              <MenuCardItem
                icon={publishing ? Loader2 : Share2}
                title={publishing ? "Working…" : "Copy private link"}
                subtitle="Share this slideshow privately"
                disabled={publishing}
                onClick={() => handleAction(onShare)}
              />
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

          {/* WORKSPACE SECTION */}
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-1">
            <span className="size-1.5 rounded-full bg-slate-300" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </span>
          </div>

          <MenuCardItem
            icon={Settings}
            title="Settings"
            subtitle="Editing preferences & appearance"
            onClick={() => handleAction(onSettings)}
          />


            <MenuCardItem
            icon={Github}
            iconColor="text-slate-800"
            iconBg="bg-slate-100 group-hover:bg-slate-200/80"
            title="GitHub repository"
            subtitle="Source code · issues & contributions"
            onClick={() => handleAction(() => window.open("https://github.com/PNBPositron/DiapoLab", "_blank", "noopener,noreferrer"))}
          />

          {/* SEPARATOR */}
          <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* EXPLORE SECTION */}
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-1">
            <span className="size-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Explore
            </span>
          </div>

          <MenuCardItem
            icon={LayoutTemplate}
            iconColor="text-blue-600"
            iconBg="bg-blue-50 group-hover:bg-blue-100/80"
            title="Marketplace"
            subtitle="Community templates & plugins"
            onClick={() => handleAction(() => navigate({ to: "/marketplace" }))}
          />
          <MenuCardItem
            icon={BookOpen}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50 group-hover:bg-indigo-100/80"
            title="Wiki"
            subtitle="Guides, shortcuts & FAQ"
            onClick={() => handleAction(() => navigate({ to: "/wiki" }))}
          />
          <MenuCardItem
            icon={Scale}
            iconColor="text-amber-600"
            iconBg="bg-amber-50 group-hover:bg-amber-100/80"
            title="License"
            subtitle="Terms & usage rights"
            onClick={() => handleAction(() => navigate({ to: "/license" }))}
          />
          <MenuCardItem
            icon={ShieldCheck}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50 group-hover:bg-emerald-100/80"
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
        <span className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 px-2 py-0.5 text-[9px] font-bold text-purple-700 shadow-sm ring-1 ring-purple-200/60">
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

function UserMenu({ email }: { email: string }) {
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active account</p>
            <p className="truncate font-mono text-xs font-medium text-slate-800">{email}</p>
          </div>
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
