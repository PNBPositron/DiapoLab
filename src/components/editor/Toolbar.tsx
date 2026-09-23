import { useEffect, useRef, useState } from "react";
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
  ExternalLink,
  CheckCircle2,
  Sliders,
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

// Hook pour fermer les menus au clic extérieur
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
    const t = setTimeout(() => setSavedAt(null), 3000);
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
      {/* GAUCHE : Logo + Nom du projet moderne */}
      <div className="flex items-center gap-3">
        <Link to="/" className="group flex items-center gap-2.5 transition-transform active:scale-95">
          <div className="relative overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 transition-all group-hover:shadow-indigo-500/20 group-hover:ring-indigo-500/30">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/polotno-JAeUumHqjSvGEic3tLQLr71QMjjUej.png"
              alt="DiapoLab flask logo"
              className="size-9 object-cover"
            />
          </div>
          <span className="font-display text-base font-bold tracking-[0.2em] text-slate-800 transition-colors group-hover:text-blue-600">
            DIAPOLAB
          </span>
        </Link>

        {/* Barre verticale décorative */}
        <div className="hidden h-5 w-px bg-slate-200 md:block" />

        {/* Édition du nom de la présentation */}
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

      {/* DROITE : Outils, IA, Enregistrement, Export et Menu Hamburger */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo groupés façon macOS/Figma */}
        <div className="flex items-center rounded-xl border border-slate-200/90 bg-white/70 p-0.5 shadow-sm">
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          >
            <Undo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <button
            onClick={redo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-90"
          >
            <Redo2 className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Bouton IA Gemini (Accents Violet / Gradient) */}
        <button
          onClick={() => setAssistantOpen(true)}
          title="Gemini Slide Assistant"
          className="group flex h-9 items-center gap-2 rounded-xl border border-purple-200/90 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50 px-3 text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:shadow-purple-500/10 active:scale-95"
        >
          <Sparkles className="h-4 w-4 text-purple-600 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" strokeWidth={2.2} />
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-purple-800">
            Assistant
          </span>
        </button>

        {/* Import JSON */}
        <button
          onClick={() => importRef.current?.click()}
          title="Import .json design"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 active:scale-95"
        >
          <Upload className="h-4 w-4" strokeWidth={2.2} />
        </button>
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

        {/* Bouton Save / Sign-in */}
        {user ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 font-display text-[11px] font-medium tracking-wider text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-60"
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

        {/* Bouton Export Moderne avec dégradé */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 font-display text-[11px] font-semibold tracking-wider text-white shadow-md shadow-blue-500/20 transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
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
            <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Formats de document
              </div>
              {(["png", "pdf", "pptx", "html", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-display text-xs text-slate-700 transition-colors hover:bg-slate-100/90"
                >
                  <span className="font-semibold text-slate-800">.{k.toUpperCase()}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {k === "png"
                      ? "Slide courante"
                      : k === "gif"
                      ? "Animé"
                      : k === "html"
                      ? "Interactif"
                      : k === "json"
                      ? "Fichier source"
                      : "Toutes les slides"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profil utilisateur */}
        {user && <UserMenu email={user.email ?? ""} />}

        {/* NOUVEAU MENU HAMBURGER AGRANDI ET ULTRA-STYLÉ */}
        <LargeModernHamburger
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
        <DialogContent className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base font-bold tracking-wide text-slate-800">
              <Sparkles className="size-5 text-purple-600" />
              Gemini Slide Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="font-mono text-[11px] text-slate-400">
            Slide courante : {pages[currentIndex]?.elements.length ?? 0} éléments · {canvasW}×{canvasH}px
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Analyze this slide", "Improve hierarchy", "Make it more engaging"].map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void askAssistant(question)}
                className="rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-1.5 font-display text-[10px] font-medium tracking-wide text-purple-700 transition-colors hover:bg-purple-100"
              >
                {question}
              </button>
            ))}
          </div>
          <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto">
            {assistantMessages.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center font-mono text-xs text-slate-400">
                Demandez une analyse de votre slide, une retouche de texte ou une suggestion de mise en page.
              </p>
            )}
            {assistantMessages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-xl border p-3 font-mono text-xs leading-relaxed ${
                  m.role === "user"
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-purple-100 bg-purple-50/70 text-purple-950"
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
              placeholder="Que voulez-vous améliorer sur cette slide ?..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            <button
              type="submit"
              disabled={assistantBusy}
              className="rounded-xl bg-purple-600 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-purple-700 active:scale-95 disabled:opacity-60"
            >
              {assistantBusy ? "…" : "Envoyer"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Publication */}
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

      {/* Dialog À Propos */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-lg tracking-[0.16em] text-slate-900">
              DIAPOLAB
            </DialogTitle>
            <DialogDescription className="font-mono text-xs leading-relaxed text-slate-500">
              Studio créatif de présentations nouvelle génération.
            </DialogDescription>
          </DialogHeader>
          <nav className="mt-3 flex flex-col gap-2">
            <a
              href="https://github.com/PNBPositron/positronstudio-project"
              target="_blank"
              rel="noreferrer"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 font-display text-xs tracking-wider text-slate-700 transition-all hover:bg-slate-100"
            >
              GITHUB <ExternalLink className="size-3.5 opacity-60" />
            </a>
            <Link
              to="/privacypolicy"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 font-display text-xs tracking-wider text-slate-700 transition-all hover:bg-slate-100"
            >
              POLITIQUE DE CONFIDENTIALITÉ →
            </Link>
            <Link
              to="/license"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 font-display text-xs tracking-wider text-slate-700 transition-all hover:bg-slate-100"
            >
              LICENCE →
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setAboutOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-3 font-display text-xs tracking-wider text-slate-700 transition-all hover:bg-slate-100"
            >
              MARKETPLACE →
            </Link>
          </nav>
        </DialogContent>
      </Dialog>

      {/* Notification lien publié */}
      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 font-display text-sm tracking-wider text-emerald-600">
              <CheckCircle2 className="size-5" /> PUBLIÉ AVEC SUCCÈS
            </div>
            <p className="mt-2 font-mono text-xs text-slate-500">
              Votre présentation est en ligne. N'importe qui possédant ce lien peut la consulter.
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
                Copier le lien
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-display text-xs uppercase tracking-wider text-slate-700 transition-all hover:bg-slate-100 active:scale-95"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * MENU HAMBURGER PLUS GRAND, PLUS BEAU & STRUCTURÉ
 */
function LargeModernHamburger({
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
      {/* Bouton déclencheur agrandi (42x42px) */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Toggle Navigation Menu"
        title="Menu"
        className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 ${
          open
            ? "border-slate-400/80 bg-slate-900 text-white shadow-inner"
            : "border-slate-200/90 bg-white/80 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-900"
        }`}
      >
        {/* Animation des 3 lignes horizontales */}
        <div className="relative flex h-4 w-4.5 flex-col justify-between">
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-300 ease-in-out ${
              open ? "translate-y-[7px] rotate-45 bg-white" : "bg-current"
            }`}
          />
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-200 ease-in-out ${
              open ? "opacity-0" : "bg-current opacity-100"
            }`}
          />
          <span
            className={`h-0.5 w-full rounded-full transition-all duration-300 ease-in-out ${
              open ? "-translate-y-[7px] -rotate-45 bg-white" : "bg-current"
            }`}
          />
        </div>
      </button>

      {/* Menu déroulant élargi (w-72) avec icônes encadrées & descriptions */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          {/* SECTION CRÉATION */}
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Création & IA
          </div>

          <MenuCardItem
            icon={FilePlus}
            title="Nouveau design"
            subtitle="Créer une présentation vierge"
            onClick={() => handleAction(onNewDesign)}
          />

          <MenuCardItem
            icon={Sparkles}
            iconColor="text-purple-600"
            iconBg="bg-purple-50 group-hover:bg-purple-100"
            title="Assistant Gemini"
            subtitle="Critique & retouches intelligentes"
            badge="AI"
            onClick={() => handleAction(onAssistant)}
          />

          {isAuthenticated && (
            <MenuCardItem
              icon={publishing ? Loader2 : Share2}
              title={publishing ? "Publication..." : "Publier le modèle"}
              subtitle="Générer un lien public de partage"
              disabled={publishing}
              onClick={() => handleAction(onShare)}
            />
          )}

          {/* SÉPARATEUR */}
          <div className="my-2 h-px bg-slate-100" />

          {/* SECTION ESPACE DE TRAVAIL */}
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Espace de travail
          </div>

          {isAuthenticated && (
            <MenuCardItem
              icon={Settings}
              title="Paramètres"
              subtitle="Préférences de compte et d'édition"
              onClick={() => handleAction(onSettings)}
            />
          )}

          <MenuCardItem
            icon={Info}
            title="À propos"
            subtitle="Documentation, GitHub & licences"
            onClick={() => handleAction(onAbout)}
          />

          {/* SÉPARATEUR */}
          <div className="my-2 h-px bg-slate-100" />

          {/* SECTION DANGER */}
          <MenuCardItem
            icon={Trash2}
            iconColor="text-red-600"
            iconBg="bg-red-50 group-hover:bg-red-100"
            title="Effacer le canevas"
            subtitle="Remettre à zéro cette slide"
            variant="destructive"
            onClick={() => handleAction(onClear)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Bouton du menu façon card moderne avec micro-icône dans un conteneur
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
      className={`group flex w-full items-center justify-between rounded-xl p-2 text-left transition-all active:scale-[0.98] disabled:opacity-50 ${
        isDestructive
          ? "hover:bg-red-50/60"
          : "hover:bg-slate-100/80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${iconBg}`}
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
          <span className="font-mono text-[10px] leading-tight text-slate-400">
            {subtitle}
          </span>
        </div>
      </div>

      {badge && (
        <span className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 px-2 py-0.5 font-display text-[9px] font-bold text-purple-700 shadow-sm">
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white active:scale-95"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Compte actif</p>
            <p className="truncate font-mono text-xs font-medium text-slate-800">{email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
}
