import { useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
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
  "astro.png", "bueno.png", "chaotic-good.png", "chillin.png", "chilly.png", "coffee.png",
  "consumer.png", "cube-leg.png", "ecto-plasma.png", "entertainment.png", "experiments.png", "feliz.png",
  "fling.png", "gamestation.png", "groceries.png", "growth.png", "jumping-air.png", "kiddo.png",
  "late-for-class.png", "looking-ahead.png", "mask.png", "mechanical-love.png", "meela-pantalones.png", "new-beginnings.png",
  "pacheco.png", "pilot.png", "plants.png", "polka-pup.png", "pondering.png", "puppy.png", "reflecting.png",
  "roboto.png", "rogue.png", "runner.png", "waiting.png", "walking-contradiction.png", "whoa.png", "wont-stop.png",
];
type Collection = "Highlights" | "Transhumans";

export function IllustrationsPanel() {
  const { add } = useEditor();
  const editorTheme = useSettings((state) => state.editorTheme);
  const [collection, setCollection] = useState<Collection | null>(null);
  const files = collection === "Highlights" ? HIGHLIGHTS : collection === "Transhumans" ? TRANSHUMANS : [];
  const getSource = (file: string) => `/illustrations/${collection === "Transhumans" ? "transhumans/" : ""}${file}`;

  return (
    <div className="space-y-4">
      <PanelHeader title="Illustrations" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setCollection(collection === "Highlights" ? null : "Highlights")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Highlights" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <Sparkles className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Highlights</span>
        </button>
        <button onClick={() => setCollection(collection === "Transhumans" ? null : "Transhumans")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Transhumans" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <ImagePlus className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Transhumans</span>
        </button>
      </div>
      {collection && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => {
            const src = getSource(file);
            const name = file.replace(/\.(svg|png)$/i, "").replaceAll("-", " ");
            return (
              <button key={file} onClick={() => add(newImage(src, { illustrationFormat: "svg", fit: "contain", ...(collection === "Highlights" ? { tint: editorTheme.includes("dark") ? "#ffffff" : "#0a0f1f" } : {}) }))} title={`Add ${name}`} className="group brutal-border-2 brutal-press overflow-hidden bg-surface p-1 hover:border-teal">
                <div className="grid h-24 place-items-center bg-white p-2"><img src={src} alt={`${collection} illustration: ${name}`} loading="lazy" decoding="async" width={240} height={160} className="max-h-full max-w-full object-contain" draggable={false} /></div>
                <span className="flex items-center gap-1 truncate px-1 py-1 font-mono text-[9px] text-teal/70"><ImagePlus className="size-3 shrink-0" />{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
