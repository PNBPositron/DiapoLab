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

export function Toolbar() {
  const { undo, redo, clear, designId, designName, setDesignName, setDesignMeta, newDesign, pages, currentIndex, canvasW, canvasH, loadPages } =
    useEditor();
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
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const [exporting, setExporting] = useState<null | "png" | "pdf" | "pptx" | "gif" | "html" | "json">(null);
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
      const response = await fetch("/api/slide-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, slideshow: pages, canEdit: true, question }) });
      const payload = await response.json() as { text?: string; error?: string; edits?: Array<{ type: string; id?: string; patch?: Record<string, unknown>; text?: string; x?: number; y?: number; }> };
      if (!response.ok || !payload.text) throw new Error(payload.error || "Could not analyze this slide.");
      if (payload.edits?.length) {
        const activeEdits = payload.edits!.filter((edit) => edit.type === "addText" || edit.id);
        const nextPages = pages.map((slide, slideIndex) => slideIndex !== currentIndex ? slide : { ...slide, elements: [
          ...slide.elements.flatMap((element) => {
            const edits = activeEdits.filter((edit) => edit.id === element.id);
            if (edits.some((edit) => edit.type === "delete")) return [];
            const update = edits.find((edit) => edit.type === "update");
            return update?.patch ? [{ ...element, ...update.patch }] : [element];
          }),
          ...activeEdits.filter((edit) => edit.type === "addText" && typeof edit.text === "string").map((edit) => ({ id: crypto.randomUUID(), type: "text" as const, text: edit.text!, x: edit.x ?? 120, y: edit.y ?? 120, fontSize: 48, color: "#0b1736", rotation: 0, opacity: 1, width: 420, height: 100, align: "left", weight: 700, shadow: "none" }))
        ] });
        loadPages(nextPages);
      }
      setAssistantMessages((current) => [...current, { role: "assistant", text: payload.edits?.length ? `${payload.text}\n\nApplied ${payload.edits.length} requested change${payload.edits.length > 1 ? "s" : ""}.` : payload.text! }]);
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
    <header className="relative z-30 flex min-h-[62px] items-center justify-between gap-3 border-b border-transparent bg-transparent px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/polotno-JAeUumHqjSvGEic3tLQLr71QMjjUej.png"
            alt="DiapoLab flask logo"
            className="size-9 rounded-xl object-cover"
          />
          <div className="font-display text-lg tracking-[0.18em] text-slate-700">DIAPOLAB</div>
        </div>
        <div className="ml-2 hidden items-center gap-2 md:flex">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
          {savedAt && <span className="font-mono text-[10px] text-slate-500">✓ saved</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <IconBtn onClick={undo} title="Undo"><Undo2 className="h-4 w-4" strokeWidth={2.5} /></IconBtn>
        <IconBtn onClick={redo} title="Redo"><Redo2 className="h-4 w-4" strokeWidth={2.5} /></IconBtn>
        {user ? (
          <BentoMenu
            onSettings={() => navigate({ to: "/settings" })}
            onNewDesign={newDesign}
            onShare={handlePublish}
            onAbout={() => setAboutOpen(true)}
            onExport={() => setExportOpen((v) => !v)}
            publishing={publishing}
            exporting={!!exporting}
          />
        ) : (
          <>
            <IconBtn onClick={() => setAboutOpen(true)} title="About"><Info className="h-4 w-4" strokeWidth={2.5} /></IconBtn>
            <IconBtn onClick={clear} title="Clear"><Trash2 className="h-4 w-4" strokeWidth={2.5} /></IconBtn>
          </>
        )}
        <IconBtn onClick={() => importRef.current?.click()} title="Import .json design"><Upload className="h-4 w-4" strokeWidth={2.5} /></IconBtn>
        <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />

        {user ? (
          <>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-slate-700 transition-colors hover:border-slate-300 hover:bg-white disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={3} />}
              Save
            </button>
            <UserMenu email={user.email ?? ""} />
          </>
        ) : (
          <Link to="/auth" search={{ next: undefined }} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-slate-700 transition-colors hover:border-slate-300 hover:bg-white">
            <Cloud className="h-3.5 w-3.5" strokeWidth={3} /> Sign in
          </Link>
        )}

        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportOpen((v) => !v)} disabled={!!exporting} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={3} /> : <Download className="h-3.5 w-3.5" strokeWidth={3} />}
            {exporting ? exporting.toUpperCase() : "Export"}
            <ChevronDown className="h-3 w-3" strokeWidth={3} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
              {(["png", "pdf", "pptx", "html", "json", "gif"] as const).map((k) => (
                <button key={k} onClick={() => runExport(k)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-display text-[10px] tracking-[0.14em] text-slate-700 hover:bg-slate-100">
                  <span>EXPORT .{k.toUpperCase()}</span>
                  <span className="font-mono text-[9px] text-slate-500">{k === "png" ? "current" : k === "gif" ? "animated" : k === "html" ? "interactive" : k === "json" ? "editable" : "all pages"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="max-w-lg border border-slate-200 bg-white text-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-[0.14em] text-slate-700"><Sparkles className="size-4" /> Gemini slide assistant</DialogTitle>
          </DialogHeader>
          <div className="font-mono text-[10px] text-slate-500">{pages[currentIndex]?.elements.length ?? 0} elements · {canvasW}×{canvasH}</div>
          <div className="mt-3 flex flex-wrap gap-2">{["Analyze this slide", "Improve hierarchy", "Make it more engaging"].map((question) => <button key={question} type="button" onClick={() => void askAssistant(question)} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-display text-[9px] uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-100">{question}</button>)}</div>
          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{assistantMessages.length === 0 && <p className="font-mono text-xs leading-relaxed text-slate-500">Ask for a critique, layout ideas, or a slide rewrite.</p>}{assistantMessages.map((m, i) => <div key={`${m.role}-${i}`} className={`rounded-xl border px-3 py-2 font-mono text-xs leading-relaxed ${m.role === "user" ? "border-slate-200 bg-slate-50 text-slate-700" : "border-blue-100 bg-blue-50 text-slate-700"}`}>{m.text}</div>)}{assistantError && <p role="alert" className="font-mono text-xs text-red-500">{assistantError}</p>}</div>
          <form onSubmit={(event) => { event.preventDefault(); void askAssistant(); }} className="mt-4 flex gap-2">
            <input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask for a slide tweak…" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none" />
            <button type="submit" disabled={assistantBusy} className="rounded-lg bg-blue-600 px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-white disabled:opacity-60">{assistantBusy ? "…" : "Send"}</button>
          </form>
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
        <DialogContent className="max-w-sm rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-base tracking-[0.2em] text-slate-700">ABOUT DIAPOLAB</DialogTitle>
            <DialogDescription className="font-mono text-[11px] leading-relaxed text-slate-500">Learn more about DiapoLab and its terms.</DialogDescription>
          </DialogHeader>
          <nav aria-label="About links" className="mt-2 flex flex-col gap-2">
            <a href="https://github.com/PNBPositron/positronstudio-project" target="_blank" rel="noreferrer" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">GITHUB <span aria-hidden="true">↗</span></a>
            <Link to="/privacypolicy" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">PRIVACY POLICY <span aria-hidden="true">→</span></Link>
            <Link to="/license" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">LICENSE <span aria-hidden="true">→</span></Link>
            <Link to="/marketplace" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">MARKETPLACE <span aria-hidden="true">→</span></Link>
            <a href="http://colormind.io/api/" target="_blank" rel="noreferrer" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">API USED: COLORMIND <span aria-hidden="true">↗</span></a>
            <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer" onClick={() => setAboutOpen(false)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-display text-[11px] tracking-[0.16em] text-slate-700 hover:bg-slate-100">SUGGESTED API: UNSPLASH <span aria-hidden="true">↗</span></a>
          </nav>
        </DialogContent>
      </Dialog>

      {shareLink && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
            <div className="font-display text-sm tracking-[0.2em] text-slate-700">✓ PUBLISHED · SHARE LINK</div>
            <p className="mt-2 font-mono text-[11px] text-slate-500">Anyone with this link can view your deck.</p>
            <input readOnly value={shareLink} onFocus={(e) => e.currentTarget.select()} className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-white">Copy link</button>
              <button onClick={() => setShareLink(null)} className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-slate-700">Close</button>
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
  onMyDesigns?: () => void;
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
    { label: "About", icon: Info, action: onAbout },
    { label: publishing ? "Sharing..." : "Share", icon: publishing ? Loader2 : Share2, action: onShare },
    { label: exporting ? "Exporting..." : "Export", icon: Download, action: onExport },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Open editor menu" title="Editor menu" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white">
        <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
          <span className="size-1.5 bg-current" />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 grid w-52 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
          {items.map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={() => { action(); setOpen(false); }} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 py-2 font-display text-[9px] tracking-[0.12em] text-slate-700 hover:bg-slate-100">
              <Icon className={label === "Sharing..." ? "h-4 w-4 animate-spin" : "h-4 w-4"} strokeWidth={2.5} />
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
      <button onClick={() => setOpen((v) => !v)} title={email} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white">
        <UserIcon className="h-4 w-4" strokeWidth={2.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_8px_18px_rgba(15,23,42,0.08)]" onMouseLeave={() => setOpen(false)}>
          <div className="border-b border-slate-200 px-2 py-1.5 font-mono text-[10px] text-slate-500 truncate">{email}</div>
          <button onClick={() => signOut()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-display text-[11px] tracking-[0.2em] text-slate-700 hover:bg-slate-100"><LogOut className="h-3.5 w-3.5" /> SIGN OUT</button>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string; }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-white">
      {children}
    </button>
  );
}
