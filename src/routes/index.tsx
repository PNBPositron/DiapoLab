import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/editor/CommandPalette";
import { Toolbar } from "@/components/editor/Toolbar";
import { Sidebar } from "@/components/editor/Sidebar";
import { Canvas } from "@/components/editor/Canvas";
import { SelectionToolbar } from "@/components/editor/SelectionToolbar";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { PresentationMode } from "@/components/editor/PresentationMode";
import { PagesBar } from "@/components/editor/PagesBar";
import { WelcomeDialog } from "@/components/editor/WelcomeDialog";
import { FindReplaceDialog } from "@/components/editor/FindReplaceDialog";
import { A11yPanel } from "@/components/editor/A11yPanel";
import { WorkspaceBackgroundLayer } from "@/components/editor/WorkspaceBackground";
import { useSettings } from "@/store/settings";
import { registerCustomFont } from "@/lib/fontLoader";
import { getBarChromeProps } from "@/lib/bar-appearance";

export const Route = createFileRoute("/")({
  component: Editor,
  head: () => ({
    meta: [
      { title: "DiapoLab — NextGen Open Source Presentation Editor" },
      { name: "description", content: "DiapoLab — the next-generation open source presentation editor. Design polished decks right in your browser, import and export PowerPoint files, and make every slide your own." },
      { property: "og:title", content: "DiapoLab — NextGen Open Source Presentation Editor" },
      { property: "og:description", content: "DiapoLab — the next-generation open source presentation editor. Design polished decks right in your browser, import and export PowerPoint files, and make every slide your own." },
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
  const editorDark = useSettings((s) => s.editorDark);
  const barColor = useSettings((s) => s.barColor);
  const barLiquidGlass = useSettings((s) => s.barLiquidGlass);
  const a11yCheck = useSettings((s) => s.a11yCheck);
  const barChrome = getBarChromeProps(barColor, editorDark, barLiquidGlass);

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
    <div
      style={barChrome.style}
      className={`editor-ui relative flex h-screen flex-col overflow-hidden text-slate-900 ${
        editorDark ? "editor-dark" : ""
      } ${barChrome.className}`}
    >
      <WorkspaceBackgroundLayer />

      <h1 className="sr-only">DiapoLab — NextGen Open Source Presentation Editor</h1>
      <Toolbar />
      <div className="relative z-10 flex min-h-0 flex-1 bg-transparent">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
          <main className="relative min-h-0 flex-1 overflow-hidden bg-transparent">
            <Canvas />
            <SelectionToolbar />
          </main>
          <PagesBar />
        </div>
        <PropertiesPanel />
      </div>
      {a11yCheck && <A11yPanel />}
      <PresentationMode />
      <WelcomeDialog />
      <FindReplaceDialog />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
