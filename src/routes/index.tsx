import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/editor/CommandPalette";
import { Toolbar } from "@/components/editor/Toolbar";
import { Sidebar } from "@/components/editor/Sidebar";
import { Canvas } from "@/components/editor/Canvas";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { PresentationMode } from "@/components/editor/PresentationMode";
import { PagesBar } from "@/components/editor/PagesBar";
import { WelcomeDialog } from "@/components/editor/WelcomeDialog";
import { FindReplaceDialog } from "@/components/editor/FindReplaceDialog";
import { useSettings } from "@/store/settings";
import { registerCustomFont } from "@/lib/fontLoader";

export const Route = createFileRoute("/")({
  component: Editor,
  head: () => ({
    meta: [
      { title: "DiapoLab — Design & Presentation Editor" },
      { name: "description", content: "DiapoLab - Next generation open source presentation editor" },
      { property: "og:title", content: "DiapoLab — Design workspace" },
      { property: "og:description", content: "DiapoLab - Next generation open source presentation editor" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:url", content: "https://diapolab.vercel.app/" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.vercel.app/" }],
  }),
});

function Editor() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const customFonts = useSettings((s) => s.customFonts);

  // Re-register user-uploaded fonts (from the Brand Kit) on every load.
  useEffect(() => {
    for (const f of customFonts) void registerCustomFont(f.name, f.dataUrl);
  }, [customFonts]);

  // ⌘K / Ctrl+K toggles the command palette from anywhere in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="editor-ui relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <h1 className="sr-only">DiapoLab — Design &amp; Presentation Editor</h1>
      <Toolbar />
      {/* Sidebar spans the full workspace height (it runs alongside the
          pages bar), but the rail buttons are centered against the canvas
          area only — see the measured inset in Sidebar. */}
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-0 flex-1 overflow-hidden border-x border-slate-200 bg-slate-100">
            <Canvas />
          </main>
          <PagesBar />
        </div>
        <PropertiesPanel />
      </div>
      <PresentationMode />
      <WelcomeDialog />
      <FindReplaceDialog />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
