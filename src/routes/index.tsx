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
import { buildPageHead, DEFAULT_OG_IMAGE_URL, SITE_NAME, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Editor,
  head: () =>
    buildPageHead({
      title: "DiapoLab – Open-Source Presentation & Slide Editor",
      description:
        "Design, animate, and present multipage slide decks right in your browser with DiapoLab. Import PowerPoint files and export to PDF, PPTX, HTML, or MP4.",
      path: "/",
      jsonLd: {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        isAccessibleForFree: true,
        license: "https://opensource.org/licenses/MIT",
        screenshot: DEFAULT_OG_IMAGE_URL,
        description:
          "Design, animate, and present multipage slide decks right in your browser with DiapoLab. Import PowerPoint files and export to PDF, PPTX, HTML, or MP4.",
        featureList: [
          "Multipage visual slide editor with 90+ Google Fonts",
          "PowerPoint (.pptx) import and export to PDF, PPTX, HTML, PNG, GIF, and MP4",
          "Interactive presenter widgets including live clocks, timers, counters, and polls",
          "3D scene transitions, morph animations, and keyframe timelines",
          "Community template marketplace and custom add-on widget packs",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
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
