import { useEditor, newText } from "@/store/editor";

const PRESETS = [
  { label: "+ Add heading", fontSize: 120, fontWeight: 900, fontFamily: "Orbitron", text: "HEADING" },
  { label: "+ Add subheading", fontSize: 64, fontWeight: 700, fontFamily: "Inter", text: "Subheading" },
  { label: "+ Add body text", fontSize: 32, fontWeight: 500, fontFamily: "JetBrains Mono", text: "Body text goes here" },
];

type FontDef = { family: string; weight: number; sample?: string; category: string };
export const FONTS: FontDef[] = [
  // Display / brutalist
  { family: "Archivo Black", weight: 900, category: "Display" },
  { family: "Anton", weight: 400, category: "Display" },
  { family: "Bebas Neue", weight: 400, category: "Display" },
  { family: "Bungee", weight: 400, category: "Display" },
  { family: "Rampart One", weight: 400, category: "Display" },
  { family: "Righteous", weight: 400, category: "Display" },
  { family: "Russo One", weight: 400, category: "Display" },
  { family: "Shrikhand", weight: 400, category: "Display" },
  { family: "Tilt Prism", weight: 400, category: "Display" },
  { family: "Zen Dots", weight: 400, category: "Display" },
  // Futurist / techno
  { family: "Orbitron", weight: 900, category: "Techno" },
  { family: "Unbounded", weight: 800, category: "Techno" },
  { family: "Syne", weight: 800, category: "Techno" },
  { family: "Major Mono Display", weight: 400, category: "Techno" },
  // Pixel / retro
  { family: "Press Start 2P", weight: 400, sample: "PIXEL", category: "Retro" },
  { family: "VT323", weight: 400, category: "Retro" },
  // Sans
  { family: "Inter", weight: 800, category: "Sans" },
  { family: "Montserrat", weight: 900, category: "Sans" },
  { family: "Space Grotesk", weight: 700, category: "Sans" },
  // Serif
  { family: "Abril Fatface", weight: 400, category: "Serif" },
  { family: "Cinzel", weight: 800, category: "Serif" },
  { family: "Cormorant Garamond", weight: 700, category: "Serif" },
  { family: "DM Serif Display", weight: 400, category: "Serif" },
  { family: "Fraunces", weight: 900, category: "Serif" },
  { family: "Playfair Display", weight: 800, category: "Serif" },
  // Script / handwritten
  { family: "Caveat", weight: 700, category: "Script" },
  { family: "Lobster", weight: 400, category: "Script" },
  { family: "Pacifico", weight: 400, category: "Script" },
  { family: "Permanent Marker", weight: 400, category: "Script" },
  // Mono
  { family: "JetBrains Mono", weight: 700, category: "Mono" },
  { family: "Fira Code", weight: 700, category: "Mono" },
  { family: "Space Mono", weight: 700, category: "Mono" },
];

export function TextPanel() {
  const { add } = useEditor();
  return (
    <div className="panel-content">
      <PanelHeader title="Text" />
      <div className="panel-intro">Choose a type scale or browse the full font library.</div>
      <div className="panel-section-label">Quick add</div>
      <div className="flex flex-col gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() =>
              add(
                newText({
                  text: p.text,
                  fontSize: p.fontSize,
                  fontWeight: p.fontWeight,
                  fontFamily: p.fontFamily,
                  height: p.fontSize * 1.4,
                  color: "#7df9ff",
                }),
              )
            }
            className="brutal-border-2 brutal-press w-full bg-surface px-3 py-3 text-left text-teal hover:bg-surface-2 hover:border-teal"
          >
            <span style={{ fontFamily: p.fontFamily, fontWeight: p.fontWeight, fontSize: 16 }}>
              {p.label}
            </span>
          </button>
        ))}
      </div>
      <div>
        <div className="mb-2 font-display text-[10px] uppercase tracking-[0.2em] text-teal/70">
          ▸ Fonts · {FONTS.length}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.family}
              onClick={() =>
                add(
                  newText({
                    text: f.sample ?? f.family,
                    fontSize: 96,
                    fontWeight: f.weight,
                    fontFamily: f.family,
                    height: 140,
                    width: 720,
                    color: "#7df9ff",
                  }),
                )
              }
              title={`Add text in ${f.family}`}
              className="brutal-border-2 brutal-press group flex items-center justify-between bg-surface px-3 py-2.5 text-left hover:bg-surface-2 hover:border-teal"
            >
              <span
                style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: 20, lineHeight: 1 }}
                className="text-teal truncate"
              >
                {f.family}
              </span>
              <span className="ml-2 shrink-0 font-mono text-[9px] uppercase tracking-widest text-teal/40 group-hover:text-teal/70">
                {f.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PanelHeader({ title }: { title: string }) {
  return (
    <div className="relative brutal-border bg-ink px-3 py-2.5">
      <div className="font-display text-xs uppercase tracking-[0.25em] text-teal text-glow">
        ▌ {title}
      </div>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 bg-teal glow-teal" />
    </div>
  );
}
