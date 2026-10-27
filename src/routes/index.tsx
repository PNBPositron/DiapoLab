import { createFileRoute } from "@tanstack/react-router";
import { Toolbar } from "@/components/editor/Toolbar";
import { Sidebar } from "@/components/editor/Sidebar";
import { Canvas } from "@/components/editor/Canvas";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { PresentationMode } from "@/components/editor/PresentationMode";
import { PagesBar } from "@/components/editor/PagesBar";
import { WelcomeDialog } from "@/components/editor/WelcomeDialog";

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
  return (
    <div className="editor-ui relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <h1 className="sr-only">DiapoLab — Design &amp; Presentation Editor</h1>
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex-1 overflow-hidden border-x border-slate-200 bg-slate-100">
          <Canvas />
        </main>
        <PropertiesPanel />
      </div>
      <PagesBar />
      <PresentationMode />
      <WelcomeDialog />
    </div>
  );
}
