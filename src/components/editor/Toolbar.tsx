import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEditor } from "@/store/editor";
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Save,
  Cloud,
  LogOut,
  FilePlus,
  Loader2,
  User as UserIcon,
  ChevronDown,
  Share2,
  Upload,
  Settings,
  Info,
  Sparkles,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { saveDesign, publishAsTemplate } from "@/lib/designs";
import { PublishMetaDialog, type PublishMeta } from "./PublishMetaDialog";
import {
  exportPNG,
  exportPDF,
  exportPPTX,
  exportGIF,
  exportHTML,
  exportJSON,
  importJSONFile,
} from "@/lib/export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Petit hook réutilisable pour fermer au clic extérieur
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
  } = useEditor();

  const { user } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<null | "png" | "pdf" | "pptx" | "gif" | "html" | "json">(null);
  const [exportOpen, setExportOpen] = useState(false);

  const exportRef = useClickOutside<HTMLDivElement>(() => setExportOpen(false));
  const importRef = useRef<HTMLInputElement>(null);

  const runExport = async (kind: "png" | "pdf" | "pptx" | "gif" | "html" | "json") => {
    setExportOpen(false);
    setExporting(kind);
    try {
      const n = designName || "positron";
      if (kind === "png") await exportPNG(n);
      else if (kind === "pdf") await exportPDF(n);
      else if (kind === "pptx") await exportPPTX(n);
      else if (kind === "html") await exportHTML(n);
      else if (kind === "json") exportJSON(n);
      else await exportGIF(n);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const askAssistant = async (question = assistantInput) => {
    const page = pages[currentIndex];
    if (!question.trim() || !page || assistantBusy) return;
    setAssistantBusy(true);
    setAssistantError(null);
    setAssistantMessages((current) => [...current, { role: "user", text: question.trim() }]);
    setAssistantInput("");
    try {
      const response = await fetch("/api/slide-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, slideshow: pages, canEdit: true, question }),
      });
      const payload = (await response.json()) as {
        text?: string;
        error?: string;
        edits?: Array<{
          type: string;
          id?: string;
          patch?: Record<string, unknown>;
          text?: string;
          x?: number;
          y?: number;
        }>;
      };
      if (!response.ok || !payload.text)
        throw new Error(payload.error || "Could not analyze this slide.");

      if (payload.edits?.length) {
        const activeEdits = payload.edits.filter((edit) => edit.type === "addText" || edit.id);
        const nextPages = pages.map((slide, slideIndex) =>
          slideIndex !== currentIndex
            ? slide
            : {
                ...slide,
                elements: [
                  ...slide.elements.flatMap((element) => {
                    const edits = activeEdits.filter((edit) => edit.id === element.id);
                    if (edits.some((edit) => edit.type === "delete")) return [];
                    const update = edits.find((edit) => edit.type === "update");
                    return update?.patch ? [{ ...element, ...update.patch }] : [element];
                  }),
                  ...activeEdits
                    .filter((edit) => edit.type === "addText" && typeof edit.text === "string")
                    .map((edit) => ({
                      id: crypto.randomUUID(),
                      type: "text" as const,
                      text: edit.text!,
                      x: edit.x ?? 120,
                      y: edit.y ?? 120,
                      fontSize: 48,
                      color: "#0b1736",
                      rotation: 0,
                      opacity: 1,
                      width: 420,
                      height: 100,
                      align: "left" as const,
                      weight: 700,
                      shadow: "none",
                    })),
                ],
              }
        );
        loadPages(nextPages);
      }
      setAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.edits?.length
            ? `${payload.text}\n\nApplied ${payload.edits.length} requested change${
                payload.edits.length > 1 ? "s" : ""
              }.`
            : payload.text!,
        },
      ]);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : "Could not analyze this slide.");
    } finally {
      setAssistantBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      await importJSONFile(file);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    }
  };

  const handleSave = async () => {
    if (!user) return;
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
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
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
    <header className="relative z-30 flex min-h-[62px] items-center justify-between gap-3 border-b border-slate-200/60 bg-white/70 px-4 py-2 backdrop-blur-md">
      {/* Côté gauche : Logo + Nom du projet */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/polotno-JAeUumHqjSvGEic3tLQLr71QMjjUej.png"
            alt="DiapoLab flask logo"
            className="size-9 rounded-xl object-cover shadow-sm"
          />
          <div className="font-display text-lg tracking-[0.18em] text-slate-800">DIAPOLAB</div>
        </div>

        <div className="ml-2 hidden items-center gap-2 md:flex">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Untitled design"
            className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-700 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {savedAt && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600">
              ✓ saved
            </span>
          )}
        </div>
      </div>

      {/* Côté droit : Commandes + Actions + Hamburger Menu */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo groupés */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white/80 shadow-sm">
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="grid h-9 w-9 place-items-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 rounded-l-lg"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={redo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="grid h-9 w-9 place-items-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 rounded-r-lg"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Bouton Gemini Assistant */}
        <IconBtn
          onClick={() => setAssistantOpen(true)}
          title="Gemini AI Assistant"
          className="border-purple-200 bg-purple-50/50 text-purple-700 hover:border-purple-300 hover:bg-purple-100/50"
        >
          <Sparkles className="h-4 w-4 text-purple-600" strokeWidth={2.2} />
        </IconBtn>

        {/* Bouton Importation */}
        <IconBtn onClick={() => importRef.current?.click()} title="Import .json design">
          <Upload className="h-4 w-4" strokeWidth={2.2} />
        </IconBtn>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />

        {/* Sauvegarder ou Se connecter */}
        {user ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3.5 font-display text-[10px] uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white active:scale-95 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-600" strokeWidth={2.5} />
            )}
            Save
          </button>
        ) : (
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3.5 font-display text-[10px] uppercase tracking-[0.14em] text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
          >
            <Cloud className="h-3.5 w-3.5 text-blue-500" strokeWidth={2.5} /> Sign in
          </Link>
        )}

        {/* Dropdown Export */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 font-display text-[10px] uppercase tracking-[0.14em] text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {exporting ? exporting.toUpperCase() : "Export"}
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              strokeWidth={2.5}
            />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                Formats de sortie
              </div>
              {(["png", "pdf", "pptx", "html", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-display text-[11px] tracking-wide text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <span className="font-semibold">.{k.toUpperCase()}</span>
                  <span className="font-mono text-[9px] text-slate-400">
                    {k === "png"
                      ? "current slide"
                      : k === "gif"
                      ? "animated"
                      : k === "html"
                      ? "interactive"
                      : k === "json"
                      ? "source"
                      : "all slides"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu Utilisateur si connecté */}
        {user && <UserMenu email={user.email ?? ""} />}

        {/* Nouveau Menu Hamburger Moderne */}
        <ModernHamburgerMenu
          onSettings={() => navigate({ to: "/settings" })}
          onNewDesign={newDesign}
          onShare={handlePublish}
          onAbout={() => setAboutOpen(true)}
          onClear={clear}
          onAssistant={() => setAssistantOpen(true)}
          publishing={publishing}
          isAuthenticated={!!user}
        />
      </div>

      {/* Assistant Gemini Dialog */}
      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="max-w-lg border border-slate-200 bg-white text-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.14em] text-slate-800">
              <Sparkles className="size-4 text-purple-600" /> Gemini slide assistant
            </DialogTitle>
          </DialogHeader>
          <div className="font-mono text-[10px] text-slate-500">
            {pages[currentIndex]?.elements.length ?? 0} elements · {canvasW}×{canvasH}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Analyze this slide", "Improve hierarchy", "Make it more engaging"].map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void askAssistant(question)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-display text-[9px] uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-slate-100"
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {assistantMessages.length === 0 && (
              <p className="font-mono text-xs leading-relaxed text-slate-400">
                Ask for design suggestions, copy improvements, or layout ideas.
              </p>
            )}
            {assistantMessages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed ${
                  m.role === "user"
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-purple-100 bg-purple-50/60 text-slate-700"
                }`}
              >
                {m.text}
              </div>
            ))}
            {assistantError && (
              <p role="alert" className="font-mono text-xs text-red-500">
                {assistantError}
              </p>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void askAssistant();
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={assistantInput}
              onChange={(event) => setAssistantInput(event.target.value)}
              placeholder="Ask for a slide tweak…"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
            />
            <button
              type="submit"
              disabled={assistantBusy}
              className="rounded-lg bg-purple-600 px-4 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
            >
              {assistantBusy ? "…" : "Send"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Publication Template */}
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

      {/* Dialog About */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-sm rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-base tracking-[0.2em] text-slate-800">
              ABOUT DIAPOLAB
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] leading-relaxed text-slate-500">
              Next-generation presentation & canvas editor.
            </DialogDescription>
          </DialogHeader>
          <nav aria-label="About links" className="mt-2 flex flex-col gap-1.5">
            <a
              href="https://github.com/PNBPositron/positronstudio-project"
              target="_blank"
              rel="noreferrer"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 font-display text-[11px] tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-100"
            >
              GITHUB <span aria-hidden="true">↗</span>
            </a>
            <Link
              to="/privacypolicy"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 font-display text-[11px] tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-100"
            >
              PRIVACY POLICY <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/license"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 font-display text-[11px] tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-100"
            >
              LICENSE <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 font-display text-[11px] tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-100"
            >
              MARKETPLACE <span aria-hidden="true">→</span>
            </Link>
          </nav>
        </DialogContent>
      </Dialog>

      {/* Modal Partage / Publié */}
      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="font-display text-sm tracking-[0.2em] text-emerald-600">
              ✓ PUBLISHED · SHARE LINK
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-500">
              Anyone with this link can view your deck.
            </p>
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 select-all"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-700"
              >
                Copy link
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-slate-700 transition-colors hover:bg-slate-100"
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
 * Menu Hamburger Moderne et animé
 */
function ModernHamburgerMenu({
  onSettings,
  onNewDesign,
  onShare,
  onAbout,
  onClear,
  onAssistant,
  publishing,
  isAuthenticated,
}: {
  onSettings: () => void;
  onNewDesign: () => void;
  onShare: () => void;
  onAbout: () => void;
  onClear: () => void;
  onAssistant: () => void;
  publishing: boolean;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  // Fermeture automatique à la touche Escape
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
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle menu"
        title="Menu"
        className={`group relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 active:scale-95 ${
          open
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white"
        }`}
      >
        {/* Lignes animées du Hamburger */}
        <div className="relative flex h-3.5 w-4 flex-col justify-between">
          <span
            className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-in-out ${
              open ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-0.5 w-full rounded-full bg-current transition-all duration-200 ease-in-out ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ease-in-out ${
              open ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </div>
      </button>

      {/* Menu contextuel déroulant */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 origin-top-right rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
          {/* Section 1 : Document / Création */}
          <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Design
          </div>

          <MenuItem
            icon={FilePlus}
            label="New design"
            onClick={() => handleAction(onNewDesign)}
          />

          <MenuItem
            icon={Sparkles}
            label="AI Assistant"
            badge="Gemini"
            onClick={() => handleAction(onAssistant)}
          />

          {isAuthenticated && (
            <MenuItem
              icon={publishing ? Loader2 : Share2}
              label={publishing ? "Publishing..." : "Publish & Share"}
              disabled={publishing}
              onClick={() => handleAction(onShare)}
            />
          )}

          {/* Séparateur */}
          <div className="my-1.5 h-px bg-slate-100" />

          {/* Section 2 : Configuration & Options */}
          <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </div>

          {isAuthenticated && (
            <MenuItem
              icon={Settings}
              label="Settings"
              onClick={() => handleAction(onSettings)}
            />
          )}

          <MenuItem
            icon={Info}
            label="About DiapoLab"
            onClick={() => handleAction(onAbout)}
          />

          {/* Option de suppression / reset (utile particulièrement hors-connexion) */}
          <div className="my-1.5 h-px bg-slate-100" />
          <MenuItem
            icon={Trash2}
            label="Clear canvas"
            variant="destructive"
            onClick={() => handleAction(onClear)}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  badge,
  disabled,
  variant = "default",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
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
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:opacity-50 ${
        isDestructive
          ? "text-red-600 hover:bg-red-50 hover:text-red-700"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${isDestructive ? "text-red-500" : "text-slate-500"}`} />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700">
          {badge}
        </span>
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
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-100 px-2.5 py-2">
            <p className="text-[10px] text-slate-400 font-medium">Logged in as</p>
            <p className="font-mono text-[11px] text-slate-700 truncate">{email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}
