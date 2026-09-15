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
  "Entertainment.svg", "Pilot.svg", "Walking Contradiction.svg", "Ecto Plasma.svg", "Roboto.svg", "Gamestation.svg", "Wont Stop.svg", "Consumer.svg", "Mechanical Love.svg", "Whoa.svg", "Cube Leg.svg", "Coffee.svg", "Rogue.svg", "Runner.svg", "Pacheco.svg", "Polka Pup.svg", "Mask.svg", "Looking Ahead.svg", "Puppy.svg", "Bueno.svg", "Chaotic Good.svg", "Jumping.svg", "Experiments.svg", "Fling.svg", "Waiting.svg", "Astro.svg", "Pondering.svg", "Late for Class.svg", "Groceries.svg", "Kiddo.svg", "Growth.svg", "Meela Pantalones.svg", "Feliz.svg", "Reflecting.svg", "Chilly.svg", "Chillin.svg",
];
const OPEN_PEEPS = Array.from({ length: 24 }, (_, index) => `peep-standing-${index + 1}`);

type Collection = "Highlights" | "Transhumans" | "Open Peeps";

export function IllustrationsPanel() {
  const { add } = useEditor();
  const editorTheme = useSettings((state) => state.editorTheme);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [format, setFormat] = useState<"svg" | "png">("svg");
  const files = collection === "Highlights" ? HIGHLIGHTS : collection === "Transhumans" ? TRANSHUMANS : collection === "Open Peeps" ? OPEN_PEEPS.map((name) => `${name}.svg`) : [];
  const getSource = (file: string) => {
    if (collection === "Open Peeps") return `/illustrations/open-peeps/${format}/${file.replaceAll(" ", "-")}`;
    const base = file.replace(/\.svg$/i, "");
    return `/illustrations/${base}.${format}`;
  };

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
        <button onClick={() => setCollection(collection === "Open Peeps" ? null : "Open Peeps")} className={`brutal-border-2 brutal-press flex h-24 flex-col items-center justify-center gap-2 text-teal hover:border-teal ${collection === "Open Peeps" ? "border-teal bg-blue-deep" : "bg-surface"}`}>
          <Users className="size-6" />
          <span className="font-display text-[10px] uppercase tracking-[0.12em]">Open Peeps</span>
        </button>
      </div>
      {(collection === "Transhumans" || collection === "Open Peeps") && (
        <div className="flex items-center justify-between border border-teal/25 bg-surface/40 p-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-teal/70">Asset format</span>
          <div className="flex gap-1">
            {(["svg", "png"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormat(value)}
                className={`brutal-press border px-2 py-1 font-mono text-[10px] uppercase ${format === value ? "border-teal bg-blue-deep text-teal" : "border-teal/30 bg-surface text-teal/60"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
      {collection && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => {
            const src = getSource(file);
            const name = file.replace(/\.svg$/i, "").replaceAll("-", " ");
            return (
              <button key={file} onClick={() => add(newImage(src, { tint: editorTheme.includes("dark") ? "#ffffff" : "#0a0f1f" }))} title={`Add ${name}`} className="group brutal-border-2 brutal-press overflow-hidden bg-surface p-1 hover:border-teal">
                <div className="grid h-24 place-items-center bg-paper/80 p-2"><img src={src} alt={`${collection} illustration: ${name}`} className="max-h-full max-w-full object-contain" draggable={false} onError={(event) => { const image = event.currentTarget; if (format === "png" && image.src.endsWith(".png")) image.src = `${src.replace(/\.png$/i, ".svg")}`; }} /></div>
                <span className="flex items-center gap-1 truncate px-1 py-1 font-mono text-[9px] text-teal/70"><ImagePlus className="size-3 shrink-0" />{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
