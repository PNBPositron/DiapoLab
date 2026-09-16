import { useState } from "react";
import { ImagePlus, Sparkles, Users } from "lucide-react";
import { newImage, useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";
import { PanelHeader } from "./TextPanel";

const HIGHLIGHTS = [
  ...Array.from({ length: 17 }, (_, index) => `Arrow-${index + 1}.svg`),
  ...Array.from({ length: 12 }, (_, index) => `Blob-${index + 1}.svg`),
  ...Array.from({ length: 14 }, (_, index) => `Doodle-${index + 1}.svg`),
  "Donuts-1.svg", "Donuts-2.svg",
  ...Array.from({ length: 11 }, (_, index) => `Line-${index + 1}.svg`),
  ...Array.from({ length: 8 }, (_, index) => `Loop-${index + 1}.svg`),
  ...Array.from({ length: 8 }, (_, index) => `Spiral-${index + 1}.svg`),
  ...Array.from({ length: 10 }, (_, index) => `Scribble-${index + 1}.svg`),
  ...Array.from({ length: 9 }, (_, index) => `Punctuation-${index + 1}.svg`),
  ...Array.from({ length: 8 }, (_, index) => `Sprinkle-${index + 1}.svg`),
  ...Array.from({ length: 10 }, (_, index) => `Underline-${index + 1}.svg`),
  ...Array.from({ length: 8 }, (_, index) => `Whirl-${index + 1}.svg`),
];
const TRANSHUMANS = [
  "rogue.png", "chaotic-good.png", "coffee.png", "whoa.png", "consumer.png", "gamestation.png", "ecto-plasma.png", "roboto.png", "polka-pup.png", "entertainment.png", "pilot.png", "cube-leg.png", "looking-ahead.png", "chillin.png", "chilly.png", "plants.png", "reflecting.png", "feliz.png", "growth.png", "groceries.png", "kiddo.png", "pondering.png", "jumping-air.png", "astro.png", "late-for-class.png", "waiting.png", "fling.png", "experiments.png",
];
const PIXELART = ["heart", "star", "camera", "mail", "home", "search", "settings", "user", "bell", "cloud", "bookmark", "calendar", "image", "folder", "music", "rocket", "globe", "check", "close", "arrow-right"];
type Collection = "Highlights" | "Transhumans" | "Pixelart";

export function IllustrationsPanel() {
  const { add } = useEditor();
  const editorTheme = useSettings((state) => state.editorTheme);
  const [collection, setCollection] = useState<Collection | null>(null);
  const files = collection === "Highlights" ? HIGHLIGHTS : collection === "Transhumans" ? TRANSHUMANS : collection === "Pixelart" ? PIXELART : [];
  const getSource = (file: string) => collection === "Pixelart" ? `https://cdn.jsdelivr.net/npm/pixelarticons/svg/${file}.svg` : collection === "Transhumans" ? `/illustrations/${file}` : `/illustrations/${file}`;

  return (
    <div className="space-y-4">
      <PanelHeader title="Illustrations" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setCollection(collection === "Highlights" ? null : "Highlights")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Highlights" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <Sparkles className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Highlights</span>
        </button>
        <button onClick={() => setCollection(collection === "Transhumans" ? null : "Transhumans")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Transhumans" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <Users className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Transhumans</span>
        </button>
        <button onClick={() => setCollection(collection === "Pixelart" ? null : "Pixelart")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Pixelart" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <span className="font-display text-xl">▦</span>
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Pixelart</span>
        </button>
      </div>
      {collection && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => {
            const src = getSource(file);
            const name = file.replace(/\.(svg|png)$/i, "").replaceAll("-", " ");
            return (
              <button key={file} onClick={() => add(newImage(src, { tint: editorTheme.includes("dark") ? "#ffffff" : "#0a0f1f" }))} title={`Add ${name}`} className="group brutal-border-2 brutal-press overflow-hidden bg-surface p-1 hover:border-teal">
                <div className="grid h-24 place-items-center bg-paper/80 p-2"><img src={src} alt={`${collection} illustration: ${name}`} className="max-h-full max-w-full object-contain" draggable={false} /></div>
                <span className="flex items-center gap-1 truncate px-1 py-1 font-mono text-[9px] text-teal/70"><ImagePlus className="size-3 shrink-0" />{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
