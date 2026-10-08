import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Toolbar } from "@/components/editor/Toolbar";
import { Sidebar } from "@/components/editor/Sidebar";
import { Canvas } from "@/components/editor/Canvas";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { PresentationMode } from "@/components/editor/PresentationMode";
import { PagesBar } from "@/components/editor/PagesBar";
import { CommandPalette } from "@/components/editor/CommandPalette";

export const Route = createFileRoute("/")({
  component: Editor,
  head: () => ({
    meta: [
      { title: "DiapoLab — Design & Presentation Editor" },
      { name: "description", content: "A loud, neobrutalist design editor for posters, social posts and graphics. Drag, drop, type, ship." },
      { property: "og:title", content: "DiapoLab — Neobrutalist Design Editor" },
      { property: "og:description", content: "A loud, neobrutalist design editor for posters, social posts and graphics. Drag, drop, type, ship." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://diapolab.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/" }],
  }),
});

function Editor() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K — toggle command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-white" style={{ background: "linear-gradient(180deg, #ffffff 0%, #ffffff 60%, #f5f9ff 100%)" }}>
      <h1 className="sr-only">DiapoLab — Design &amp; Presentation Editor</h1>
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex-1 overflow-hidden bg-transparent">
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.9), rgba(239,247,255,0.7))",
              backgroundSize: "32px 32px, 32px 32px, 100% 100%",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 82%)",
            }}
          />
          <Canvas />
        </main>
        <PropertiesPanel />
      </div>
      <PagesBar />
      <PresentationMode />

      {/* ⌘K palette trigger — floating, bottom-right */}
      {!paletteOpen && (
        <button
          onClick={() => setPaletteOpen(true)}
          title="Search commands (Ctrl+K)"
          className="fixed bottom-16 right-5 z-30 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs text-slate-500 shadow-md backdrop-blur transition hover:border-sky-400 hover:text-sky-600"
        >
          <Search className="size-3.5" />
          <kbd className="font-mono text-[10px]">Ctrl K</kbd>
        </button>
      )}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
