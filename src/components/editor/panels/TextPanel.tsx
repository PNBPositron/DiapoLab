import { useState, useMemo } from "react";
import { Search, Type, Heading1, Heading2, AlignLeft, Plus, X } from "lucide-react";
import { useEditor, newText } from "@/store/editor";

const PRESETS = [
  {
    type: "Heading",
    sub: "Display title",
    Icon: Heading1,
    fontSize: 120,
    fontWeight: 900,
    fontFamily: "Orbitron",
    text: "HEADING",
  },
  {
    type: "Subheading",
    sub: "Section subtitle",
    Icon: Heading2,
    fontSize: 64,
    fontWeight: 700,
    fontFamily: "Inter",
    text: "Subheading",
  },
  {
    type: "Body text",
    sub: "Paragraph content",
    Icon: AlignLeft,
    fontSize: 32,
    fontWeight: 500,
    fontFamily: "JetBrains Mono",
    text: "Body text goes here",
  },
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

const CATEGORIES = ["All", ...Array.from(new Set(FONTS.map((f) => f.category)))];

export function TextPanel() {
  const { add } = useEditor();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredFonts = useMemo(() => {
    return FONTS.filter((font) => {
      const matchesCategory = activeCategory === "All" || font.category === activeCategory;
      const matchesSearch = font.family.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="flex h-full w-full flex-col gap-4 p-3 text-slate-800">
      {/* Quick Add Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Text Styles
        </span>
        <div className="flex flex-col gap-2">
          {PRESETS.map((p) => {
            const Icon = p.Icon;
            return (
              <button
                key={p.type}
                type="button"
                onClick={() =>
                  add(
                    newText({
                      text: p.text,
                      fontSize: p.fontSize,
                      fontWeight: p.fontWeight,
                      fontFamily: p.fontFamily,
                      height: p.fontSize * 1.4,
                      color: "#0f172a",
                    })
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <span
                      className="block text-slate-900 leading-none truncate"
                      style={{
                        fontFamily: p.fontFamily,
                        fontWeight: p.fontWeight,
                        fontSize: p.type === "Heading" ? 17 : p.type === "Subheading" ? 14 : 12,
                      }}
                    >
                      {p.type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      {p.fontFamily} · {p.fontSize}px
                    </span>
                  </div>
                </div>
                <div className="flex size-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 transition-colors group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
                  <Plus className="size-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Library Header & Filters */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Font Library ({filteredFonts.length})
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fonts..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 shadow-2xs transition-colors focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                activeCategory === cat
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Font Specimen List */}
      <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5 pb-6">
        {filteredFonts.map((f) => (
          <button
            key={f.family}
            type="button"
            onClick={() =>
              add(
                newText({
                  text: f.sample ?? f.family,
                  fontSize: 80,
                  fontWeight: f.weight,
                  fontFamily: f.family,
                  height: 120,
                  width: 600,
                  color: "#0f172a",
                })
              )
            }
            title={`Insert ${f.family}`}
            className="group flex items-center justify-between rounded-lg border border-transparent bg-white/70 px-3 py-2 text-left transition-all hover:border-slate-200 hover:bg-white hover:shadow-2xs active:scale-[0.99]"
          >
            <div className="flex flex-col min-w-0 pr-2">
              <span
                style={{
                  fontFamily: f.family,
                  fontWeight: f.weight,
                  fontSize: 18,
                  lineHeight: 1.2,
                }}
                className="truncate text-slate-800 group-hover:text-slate-950"
              >
                {f.sample ?? f.family}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">
                {f.family}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500 transition-colors group-hover:bg-slate-200 group-hover:text-slate-800">
                {f.category}
              </span>
              <Plus className="size-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}

        {filteredFonts.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No fonts found matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

export function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
        <h3 className="text-xs font-semibold tracking-wide text-slate-800 uppercase">
          {title}
        </h3>
      </div>
    </div>
  );
}
