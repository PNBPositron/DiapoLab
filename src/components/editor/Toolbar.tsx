import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEditor, type Page, type AnyElement } from "@/store/editor";
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Play,
  Save,
  Cloud,
  FolderOpen,
  LogOut,
  FilePlus,
  Loader2,
  User as UserIcon,
  ChevronDown,
  Share2,
  Upload,
  Settings,
  Info,
  Atom,
  Sparkles,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import { saveDesign, publishAsTemplate } from "@/lib/designs";
import { MyDesignsDialog } from "./MyDesignsDialog";
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


export function Toolbar() {
  const { undo, redo, clear, designId, designName, setDesignName, setDesignMeta, newDesign, pages, currentIndex, canvasW, canvasH } =
    useEditor();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<
    null | "png" | "pdf" | "pptx" | "gif" | "html" | "json"
  >(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
      const response = await fetch("/api/slide-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, question }) });
      const payload = await response.json() as { text?: string; error?: string };
      if (!response.ok || !payload.text) throw new Error(payload.error || "Could not analyze this slide.");
      setAssistantMessages((current) => [...current, { role: "assistant", text: payload.text! }]);
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
    <header className="relative flex items-center justify-between gap-4 border-b border-teal/40 bg-ink px-5 py-3">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent opacity-80" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center border-2 border-teal bg-blue-deep shadow-[0_0_14px_var(--blue)]" aria-label="Positron Studio">
            <Atom className="size-6 text-teal" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="font-display text-xl tracking-[0.18em] text-teal">
            POSITRON<span className="text-blue">//</span>STUDIO
          </div>
        </div>
        <div className="ml-4 hidden items-center gap-2 md:flex">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="brutal-border-2 bg-surface px-3 py-1.5 font-mono text-xs text-teal focus:outline-none focus:border-teal focus:bg-surface-2"
          />
          {savedAt && <span className="font-mono text-[10px] text-teal/70">✓ saved</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setAssistantOpen(true)} className="brutal-border brutal-press flex items-center gap-2 bg-teal px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-ink hover:bg-blue" title="Open Cohere slide assistant">
          <Sparkles className="size-4" /> ASSIST
        </button>
        <IconBtn onClick={undo} title="Undo">
          <Undo2 className="h-4 w-4" strokeWidth={2.5} />
        </IconBtn>
        <IconBtn onClick={redo} title="Redo">
          <Redo2 className="h-4 w-4" strokeWidth={2.5} />
        </IconBtn>
        {user ? (
          <BentoMenu
            onSettings={() => navigate({ to: "/settings" })}
            onNewDesign={newDesign}
            onMyDesigns={() => setOpen(true)}
            onShare={handlePublish}
            onAbout={() => setAboutOpen(true)}
            onExport={() => setExportOpen((v) => !v)}
            publishing={publishing}
            exporting={!!exporting}
          />
        ) : (
          <>
            <IconBtn onClick={() => setAboutOpen(true)} title="About">
              <Info className="h-4 w-4" strokeWidth={2.5} />
            </IconBtn>
            <IconBtn onClick={clear} title="Clear">
              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
            </IconBtn>
          </>
        )}
        <IconBtn onClick={() => importRef.current?.click()} title="Import .json design">
          <Upload className="h-4 w-4" strokeWidth={2.5} />
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

        {user ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="brutal-border brutal-press flex items-center gap-2 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal hover:bg-teal/10 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" strokeWidth={3} />
              )}
              SAVE
            </button>
            <UserMenu email={user.email ?? ""} />
          </>
        ) : (
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="brutal-border brutal-press flex items-center gap-2 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal hover:bg-teal/10"
          >
            <Cloud className="h-3.5 w-3.5" strokeWidth={3} />
            SIGN IN
          </Link>
        )}

        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={!!exporting}
            className="brutal-border brutal-shadow-sm brutal-press flex items-center gap-2 bg-blue px-4 py-2 font-display text-xs tracking-[0.2em] text-black disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={3} />
            ) : (
              <Download className="h-3.5 w-3.5" strokeWidth={3} />
            )}
            {exporting ? exporting.toUpperCase() : "EXPORT"}
            <ChevronDown className="h-3 w-3" strokeWidth={3} />
          </button>
          {exportOpen && (
            <div className="brutal-border-2 absolute right-0 top-12 z-50 w-52 bg-ink p-1">
              {(["png", "pdf", "pptx", "html", "json", "gif"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => runExport(k)}
                  className="flex w-full items-center justify-between px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal hover:bg-surface"
                >
                  <span>EXPORT .{k.toUpperCase()}</span>
                  <span className="font-mono text-[9px] text-teal/60">
                    {k === "png"
                      ? "current"
                      : k === "gif"
                        ? "animated"
                        : k === "html"
                          ? "interactive"
                          : k === "json"
                            ? "editable"
                            : "all pages"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

  {open && <MyDesignsDialog onClose={() => setOpen(false)} />}
  <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
    <DialogContent className="brutal-border-2 max-w-lg border-teal bg-ink text-teal">
      <DialogHeader><DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.14em]"><Sparkles className="size-4" /> Cohere slide assistant</DialogTitle><DialogDescription className="font-mono text-xs text-teal/60">Analyze the current slide and get actionable ideas.</DialogDescription></DialogHeader>
      <div className="font-mono text-[10px] text-teal/50">{pages[currentIndex]?.elements.length ?? 0} elements · {canvasW}×{canvasH}</div>
      <div className="flex flex-wrap gap-2">{["Analyze this slide", "Improve hierarchy", "Make it more engaging"].map((question) => <button key={question} type="button" onClick={() => void askAssistant(question)} disabled={assistantBusy} className="brutal-border bg-paper px-2 py-1 font-mono text-[9px] text-ink hover:border-teal disabled:opacity-50">{question}</button>)}</div>
      <div className="max-h-64 space-y-2 overflow-y-auto">{assistantMessages.length === 0 && <p className="font-mono text-xs leading-relaxed text-teal/55">Ask for a critique, layout ideas, or a stronger visual direction.</p>}{assistantMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`p-2 font-mono text-xs leading-relaxed ${message.role === "user" ? "ml-8 bg-teal/10" : "mr-3 bg-paper text-ink"}`}><span className="mb-1 block font-display text-[9px] uppercase opacity-55">{message.role === "user" ? "You" : "Cohere"}</span>{message.text}</div>)}</div>
      {assistantError && <p role="alert" className="font-mono text-xs text-red-300">{assistantError}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void askAssistant(); }} className="flex gap-2"><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask about this slide..." className="brutal-border-2 min-w-0 flex-1 bg-paper px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/45 focus:border-teal" /><button type="submit" disabled={assistantBusy || !assistantInput.trim()} className="brutal-border-2 brutal-press bg-teal px-4 font-display text-[10px] uppercase text-ink disabled:opacity-40">{assistantBusy ? "..." : "Ask"}</button></form>
    </DialogContent>
  </Dialog>
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
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="brutal-border-2 max-w-sm rounded-none border-teal bg-ink text-teal shadow-[8px_8px_0_var(--blue)]">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-base tracking-[0.2em] text-teal">
              ABOUT POSITRON
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] leading-relaxed text-teal/70">
              Learn more about Positron Studio and its terms.
            </DialogDescription>
          </DialogHeader>
            <nav aria-label="About links" className="flex flex-col gap-2">
            <a
              href="https://github.com/PNBPositron/positronstudio-project"
              target="_blank"
              rel="noreferrer"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              GITHUB <span aria-hidden="true">↗</span>
            </a>
            <Link
              to="/privacypolicy"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              PRIVACY POLICY <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/license"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              LICENSE <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/marketplace"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              MARKETPLACE <span aria-hidden="true">→</span>
            </Link>
            <a
              href="http://colormind.io/api/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              API USED: COLORMIND <span aria-hidden="true">↗</span>
            </a>
            <a
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noreferrer"
              onClick={() => setAboutOpen(false)}
              className="brutal-border flex items-center justify-between bg-surface px-3 py-3 font-display text-[11px] tracking-[0.16em] text-teal hover:bg-blue-deep"
            >
              SUGGESTED API: UNSPLASH <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </DialogContent>
      </Dialog>
      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/80 p-6">
          <div className="brutal-border-2 w-full max-w-md bg-surface p-6">
            <div className="font-display text-sm tracking-[0.2em] text-teal">
              ✓ PUBLISHED · SHARE LINK
            </div>
            <p className="mt-2 font-mono text-[11px] text-teal/60">
              Anyone with this link can view your deck.
            </p>
            <input
              readOnly
              value={shareLink}
              onFocus={(e) => e.currentTarget.select()}
              className="brutal-border-2 mt-4 w-full bg-ink px-3 py-2 font-mono text-xs text-teal"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})}
                className="brutal-border brutal-press flex-1 bg-blue px-4 py-2 font-display text-xs tracking-[0.2em] text-ink"
              >
                COPY LINK
              </button>
              <button
                onClick={() => setShareLink(null)}
                className="brutal-border brutal-press flex-1 bg-surface px-4 py-2 font-display text-xs tracking-[0.2em] text-teal"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function BentoMenu({
  onSettings,
  onNewDesign,
  onMyDesigns,
  onShare,
  onAbout,
  onExport,
  publishing,
  exporting,
}: {
  onSettings: () => void;
  onNewDesign: () => void;
  onMyDesigns: () => void;
  onShare: () => void;
  onAbout: () => void;
  onExport: () => void;
  publishing: boolean;
  exporting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Settings", icon: Settings, action: onSettings },
    { label: "New design", icon: FilePlus, action: onNewDesign },
    { label: "My designs", icon: FolderOpen, action: onMyDesigns },
    { label: "About", icon: Info, action: onAbout },
    {
      label: publishing ? "Sharing..." : "Share",
      icon: publishing ? Loader2 : Share2,
      action: onShare,
    },
    { label: exporting ? "Exporting..." : "Export", icon: Download, action: onExport },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open editor menu"
        title="Editor menu"
        className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-blue text-ink"
      >
        <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
        </span>
      </button>
      {open && (
        <div className="brutal-border-2 absolute right-0 top-12 z-50 grid w-52 grid-cols-2 gap-1 bg-ink p-1">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => {
                action();
                setOpen(false);
              }}
              className="flex min-h-16 flex-col items-center justify-center gap-1 bg-surface px-2 py-2 font-display text-[9px] tracking-[0.12em] text-teal hover:bg-blue-deep"
            >
              <Icon
                className={label === "Sharing..." ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                strokeWidth={2.5}
              />
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={email}
        className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-blue-deep text-teal glow-blue"
      >
        <UserIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>
      {open && (
        <div
          className="brutal-border-2 absolute right-0 top-12 z-50 w-56 bg-ink p-2"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="border-b border-teal/30 px-2 py-1.5 font-mono text-[10px] text-teal/70 truncate">
            {email}
          </div>
          <button
            onClick={() => signOut()}
            className="mt-1 flex w-full items-center gap-2 px-2 py-1.5 font-display text-[11px] tracking-[0.2em] text-teal hover:bg-surface"
          >
            <LogOut className="h-3.5 w-3.5" /> SIGN OUT
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="brutal-border-2 brutal-press grid h-10 w-10 place-items-center bg-surface text-teal hover:bg-surface-2 hover:text-teal hover:border-teal"
    >
      {children}
    </button>
  );
}
