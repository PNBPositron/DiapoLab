import { useEffect, useMemo, useRef, useState } from "react";
import {
  Type,
  Heading1,
  Heading2,
  AlignLeft,
  Plus,
  Quote,
  List,
  Sparkles,
  Star,
  Check,
  Wand2,
  Hash,
} from "lucide-react";
import { useEditor, newText, type TextElement } from "@/store/editor";
import { useSettings } from "@/store/settings";
import { ensureFontFamily } from "@/lib/fontLoader";
import { PanelHeader, SearchField, ChipGroup, SegmentedControl } from "../ui/selectors";
export { PanelHeader } from "../ui/selectors";

type TextPresetDef = {
  id: string;
  type: string;
  sub: string;
  Icon: typeof Heading1;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  text: string;
  italic?: boolean;
  bullet?: boolean;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase";
};

const QUICK_PRESETS: TextPresetDef[] = [
  {
    id: "display",
    type: "Display",
    sub: "Hero title",
    Icon: Sparkles,
    fontSize: 112,
    fontWeight: 800,
    fontFamily: "Syne",
    text: "Bold Keynote Headline",
  },
  {
    id: "heading",
    type: "Heading",
    sub: "Section title",
    Icon: Heading1,
    fontSize: 76,
    fontWeight: 800,
    fontFamily: "Plus Jakarta Sans",
    text: "Section Heading",
  },
  {
    id: "subheading",
    type: "Subheading",
    sub: "Supporting lead",
    Icon: Heading2,
    fontSize: 44,
    fontWeight: 600,
    fontFamily: "Inter",
    text: "Clear supporting takeaway goes here",
  },
  {
    id: "body",
    type: "Body text",
    sub: "Paragraph",
    Icon: AlignLeft,
    fontSize: 28,
    fontWeight: 400,
    fontFamily: "DM Sans",
    text: "Add crisp supporting details, context, or metrics for your audience.",
  },
  {
    id: "kicker",
    type: "Eyebrow",
    sub: "Tracked label",
    Icon: Hash,
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "Space Grotesk",
    text: "01 · KEY TAKEAWAY",
    letterSpacing: 0.14,
    textTransform: "uppercase",
  },
  {
    id: "quote",
    type: "Pull quote",
    sub: "Editorial serif",
    Icon: Quote,
    fontSize: 48,
    fontWeight: 600,
    fontFamily: "Playfair Display",
    text: "“Simplicity is about subtracting the obvious and adding the meaningful.”",
    italic: true,
  },
  {
    id: "bullets",
    type: "Bullet list",
    sub: "3 structured points",
    Icon: List,
    fontSize: 28,
    fontWeight: 500,
    fontFamily: "Inter",
    text: "First key insight\nSecond supporting point\nThird action item",
    bullet: true,
  },
];

export type FontDef = { family: string; weight: number; sample?: string; category: string };

export const FONTS: FontDef[] = [
  // Sans
  { family: "Inter", weight: 700, category: "Sans" },
  { family: "Plus Jakarta Sans", weight: 700, category: "Sans" },
  { family: "DM Sans", weight: 700, category: "Sans" },
  { family: "Poppins", weight: 700, category: "Sans" },
  { family: "Montserrat", weight: 800, category: "Sans" },
  { family: "Space Grotesk", weight: 700, category: "Sans" },
  { family: "Outfit", weight: 700, category: "Sans" },
  { family: "Manrope", weight: 700, category: "Sans" },
  { family: "Sora", weight: 700, category: "Sans" },
  { family: "Bricolage Grotesque", weight: 700, category: "Sans" },
  { family: "Figtree", weight: 700, category: "Sans" },
  { family: "Urbanist", weight: 700, category: "Sans" },
  { family: "Lexend", weight: 600, category: "Sans" },
  { family: "Rubik", weight: 700, category: "Sans" },
  { family: "Work Sans", weight: 700, category: "Sans" },
  { family: "Barlow", weight: 700, category: "Sans" },
  { family: "Archivo", weight: 700, category: "Sans" },
  { family: "Public Sans", weight: 700, category: "Sans" },
  { family: "Raleway", weight: 700, category: "Sans" },
  { family: "Nunito", weight: 700, category: "Sans" },
  { family: "Quicksand", weight: 700, category: "Sans" },
  { family: "Open Sans", weight: 700, category: "Sans" },
  { family: "Lato", weight: 700, category: "Sans" },
  { family: "Roboto", weight: 700, category: "Sans" },

  // Serif
  { family: "Playfair Display", weight: 800, category: "Serif" },
  { family: "Fraunces", weight: 800, category: "Serif" },
  { family: "Cormorant Garamond", weight: 700, category: "Serif" },
  { family: "DM Serif Display", weight: 400, category: "Serif" },
  { family: "Instrument Serif", weight: 400, category: "Serif" },
  { family: "Newsreader", weight: 600, category: "Serif" },
  { family: "Lora", weight: 700, category: "Serif" },
  { family: "Merriweather", weight: 700, category: "Serif" },
  { family: "Libre Baskerville", weight: 700, category: "Serif" },
  { family: "Crimson Pro", weight: 700, category: "Serif" },
  { family: "Spectral", weight: 700, category: "Serif" },
  { family: "Bitter", weight: 700, category: "Serif" },
  { family: "Bodoni Moda", weight: 700, category: "Serif" },
  { family: "Cinzel", weight: 800, category: "Serif" },
  { family: "Abril Fatface", weight: 400, category: "Serif" },
  { family: "Prata", weight: 400, category: "Serif" },

  // Display / Headline
  { family: "Archivo Black", weight: 900, category: "Display" },
  { family: "Anton", weight: 400, category: "Display" },
  { family: "Bebas Neue", weight: 400, category: "Display" },
  { family: "Oswald", weight: 700, category: "Display" },
  { family: "Bungee", weight: 400, category: "Display" },
  { family: "Righteous", weight: 400, category: "Display" },
  { family: "Russo One", weight: 400, category: "Display" },
  { family: "Dela Gothic One", weight: 400, category: "Display" },
  { family: "Black Ops One", weight: 400, category: "Display" },
  { family: "Titan One", weight: 400, category: "Display" },
  { family: "Passion One", weight: 700, category: "Display" },
  { family: "Luckiest Guy", weight: 400, category: "Display" },
  { family: "Bowlby One SC", weight: 400, category: "Display" },
  { family: "Rampart One", weight: 400, category: "Display" },
  { family: "Shrikhand", weight: 400, category: "Display" },
  { family: "Tilt Prism", weight: 400, category: "Display" },
  { family: "Zen Dots", weight: 400, category: "Display" },

  // Futurist / Techno
  { family: "Orbitron", weight: 800, category: "Techno" },
  { family: "Unbounded", weight: 800, category: "Techno" },
  { family: "Syne", weight: 800, category: "Techno" },
  { family: "Major Mono Display", weight: 400, category: "Techno" },
  { family: "Chakra Petch", weight: 700, category: "Techno" },
  { family: "Audiowide", weight: 400, category: "Techno" },
  { family: "Exo 2", weight: 700, category: "Techno" },
  { family: "Michroma", weight: 400, category: "Techno" },
  { family: "Rajdhani", weight: 700, category: "Techno" },
  { family: "Syncopate", weight: 700, category: "Techno" },
  { family: "Electrolize", weight: 400, category: "Techno" },

  // Retro / Pixel
  { family: "Press Start 2P", weight: 400, sample: "PIXEL", category: "Retro" },
  { family: "VT323", weight: 400, category: "Retro" },
  { family: "Silkscreen", weight: 700, sample: "ARCADE", category: "Retro" },
  { family: "Pixelify Sans", weight: 700, category: "Retro" },
  { family: "Bungee Shade", weight: 400, category: "Retro" },
  { family: "Monoton", weight: 400, category: "Retro" },

  // Script / Handwritten
  { family: "Caveat", weight: 700, category: "Script" },
  { family: "Dancing Script", weight: 700, category: "Script" },
  { family: "Pacifico", weight: 400, category: "Script" },
  { family: "Lobster", weight: 400, category: "Script" },
  { family: "Permanent Marker", weight: 400, category: "Script" },
  { family: "Great Vibes", weight: 400, category: "Script" },
  { family: "Satisfy", weight: 400, category: "Script" },
  { family: "Indie Flower", weight: 400, category: "Script" },
  { family: "Kalam", weight: 700, category: "Script" },
  { family: "Sacramento", weight: 400, category: "Script" },
  { family: "Shadows Into Light", weight: 400, category: "Script" },

  // Mono
  { family: "JetBrains Mono", weight: 700, category: "Mono" },
  { family: "Fira Code", weight: 700, category: "Mono" },
  { family: "Space Mono", weight: 700, category: "Mono" },
  { family: "IBM Plex Mono", weight: 600, category: "Mono" },
  { family: "Source Code Pro", weight: 700, category: "Mono" },
  { family: "Roboto Mono", weight: 700, category: "Mono" },
  { family: "Inconsolata", weight: 700, category: "Mono" },
  { family: "Overpass Mono", weight: 700, category: "Mono" },
];

type FontPairing = {
  id: string;
  name: string;
  vibe: string;
  heading: { family: string; weight: number; text: string; size: number };
  body: { family: string; weight: number; text: string; size: number };
};

const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "editorial-serif",
    name: "Editorial Contrast",
    vibe: "Magazine · Keynote",
    heading: {
      family: "Playfair Display",
      weight: 800,
      text: "Designing With Intention",
      size: 74,
    },
    body: {
      family: "Inter",
      weight: 400,
      text: "Pair crisp high-contrast serif headlines with clean sans body copy.",
      size: 28,
    },
  },
  {
    id: "modern-product",
    name: "Modern SaaS",
    vibe: "Clean · Product",
    heading: { family: "Plus Jakarta Sans", weight: 800, text: "Ship Faster Together", size: 72 },
    body: {
      family: "DM Sans",
      weight: 400,
      text: "Geometric clarity built for customer metrics, dashboards, and roadmaps.",
      size: 28,
    },
  },
  {
    id: "expressive-studio",
    name: "Creative Studio",
    vibe: "Expressive · Bold",
    heading: { family: "Syne", weight: 800, text: "BRAND SYSTEMS 2026", size: 70 },
    body: {
      family: "Space Grotesk",
      weight: 400,
      text: "Wide neo-grotesque titles paired with structured technical paragraphs.",
      size: 28,
    },
  },
  {
    id: "warm-craft",
    name: "Warm Heritage",
    vibe: "Literary · Craft",
    heading: { family: "Fraunces", weight: 800, text: "Storytelling at Scale", size: 74 },
    body: {
      family: "Work Sans",
      weight: 400,
      text: "Soft organic curves balanced against neutral geometric legibility.",
      size: 28,
    },
  },
  {
    id: "swiss-poster",
    name: "Swiss Poster",
    vibe: "Minimal · Grid",
    heading: {
      family: "Bricolage Grotesque",
      weight: 800,
      text: "Architecture of Clarity",
      size: 72,
    },
    body: {
      family: "IBM Plex Mono",
      weight: 500,
      text: "01 // Structured typography for design reviews and technical briefs.",
      size: 24,
    },
  },
  {
    id: "futurist-tech",
    name: "Cyber Telemetry",
    vibe: "Futuristic · Hardware",
    heading: { family: "Orbitron", weight: 800, text: "NEXT-GEN TELEMETRY", size: 64 },
    body: {
      family: "JetBrains Mono",
      weight: 500,
      text: "Real-time node status and low-latency stream diagnostics.",
      size: 24,
    },
  },
  {
    id: "luxury-monograph",
    name: "Luxury Monograph",
    vibe: "Fine Print · High Fashion",
    heading: {
      family: "Cormorant Garamond",
      weight: 700,
      text: "Timeless Form & Detail",
      size: 80,
    },
    body: {
      family: "Manrope",
      weight: 400,
      text: "Delicate editorial serifs anchored by modern sans proportions.",
      size: 26,
    },
  },
  {
    id: "bold-condensed",
    name: "Campaign Impact",
    vibe: "Athletic · Launch",
    heading: { family: "Anton", weight: 400, text: "MAKE EVERY SECOND COUNT", size: 76 },
    body: {
      family: "Outfit",
      weight: 400,
      text: "High-density condensed headlines with friendly rounded subtext.",
      size: 28,
    },
  },
  {
    id: "journal-essay",
    name: "Longform Brief",
    vibe: "Research · Memo",
    heading: { family: "Instrument Serif", weight: 400, text: "Quarterly Field Notes", size: 78 },
    body: {
      family: "Newsreader",
      weight: 400,
      text: "Reader-first serif hierarchy tailored for narrative slides and reports.",
      size: 28,
    },
  },
  {
    id: "handwritten-note",
    name: "Workshop Sketch",
    vibe: "Playful · Ideation",
    heading: { family: "Permanent Marker", weight: 400, text: "Sprint Brainstorm!", size: 68 },
    body: {
      family: "Nunito",
      weight: 500,
      text: "Approachable whiteboard energy for workshops and team retros.",
      size: 28,
    },
  },
];

const CATEGORIES = [
  "All",
  "Saved",
  ...Array.from(new Set([...FONTS.map((f) => f.category), "Custom"])),
];
const FAV_KEY = "diapolab.favorite-fonts";
const RECENT_KEY = "diapolab.recent-fonts";

function readStringList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function FontSpecimenRow({
  font,
  sampleText,
  selectedFont,
  hasSelection,
  clickApplies,
  starred,
  onToggleStar,
  onPrimaryAction,
  onInsertNew,
}: {
  font: FontDef;
  sampleText: string;
  selectedFont?: string;
  hasSelection: boolean;
  clickApplies: boolean;
  starred: boolean;
  onToggleStar: () => void;
  onPrimaryAction: () => void;
  onInsertNew: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isActive = selectedFont?.toLowerCase() === font.family.toLowerCase();

  useEffect(() => {
    const el = rowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void ensureFontFamily(font.family);
      return;
    }
    let loaded = false;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loaded) {
          loaded = true;
          void ensureFontFamily(font.family);
          obs.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [font.family]);

  const preview = sampleText.trim() || font.sample || font.family;

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => void ensureFontFamily(font.family)}
      className={`group flex items-center gap-1.5 rounded-lg border px-2.5 py-2 transition-colors ${
        isActive
          ? "border-blue-500 bg-blue-50/45"
          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70"
      }`}
    >
      <button
        type="button"
        onClick={onPrimaryAction}
        title={
          hasSelection && clickApplies
            ? `Apply ${font.family} to selection`
            : `Insert text in ${font.family}`
        }
        className="flex min-w-0 flex-1 flex-col text-left"
      >
        <span
          style={{
            fontFamily: `"${font.family}", sans-serif`,
            fontWeight: font.weight,
            fontSize: 17,
            lineHeight: 1.25,
          }}
          className="truncate text-slate-900"
        >
          {preview}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-sans text-slate-400">
          <span className="truncate">{font.family}</span>
          <span>·</span>
          <span className="text-slate-400">{font.category}</span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {isActive && (
          <span
            className="grid size-5 place-items-center rounded bg-blue-600 text-white"
            title="Current font"
          >
            <Check className="size-3" />
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          title={starred ? "Remove from saved fonts" : "Save font"}
          aria-label={starred ? `Unsave ${font.family}` : `Save ${font.family}`}
          className={`grid size-6 place-items-center rounded transition-colors ${
            starred
              ? "text-amber-500 hover:bg-amber-50"
              : "text-slate-300 opacity-0 hover:bg-slate-100 hover:text-amber-500 group-hover:opacity-100"
          }`}
        >
          <Star className="size-3.5" fill={starred ? "currentColor" : "none"} />
        </button>
        {hasSelection && clickApplies && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInsertNew();
            }}
            title={`Insert new text in ${font.family}`}
            aria-label={`Insert new text in ${font.family}`}
            className="grid size-6 place-items-center rounded border border-slate-200 bg-white text-slate-500 opacity-0 transition hover:border-blue-400 hover:text-blue-600 group-hover:opacity-100"
          >
            <Plus className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TextPanel() {
  const { add, addGroup, selectedId, selectedIds, elements, update } = useEditor();
  const customFonts = useSettings((s) => s.customFonts);
  const [tab, setTab] = useState<"fonts" | "pairings">("fonts");
  const [search, setSearch] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [clickApplies, setClickApplies] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentFonts, setRecentFonts] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readStringList(FAV_KEY));
    setRecentFonts(readStringList(RECENT_KEY));
    QUICK_PRESETS.forEach((p) => void ensureFontFamily(p.fontFamily));
    FONT_PAIRINGS.forEach((pair) => {
      void ensureFontFamily(pair.heading.family);
      void ensureFontFamily(pair.body.family);
    });
  }, []);

  const selectedTexts = useMemo(
    () =>
      elements.filter(
        (e): e is TextElement =>
          (e.id === selectedId || selectedIds.includes(e.id)) && e.type === "text",
      ),
    [elements, selectedId, selectedIds],
  );
  const hasSelection = selectedTexts.length > 0;
  const activeSelectedFont = selectedTexts[0]?.fontFamily;

  const allFonts = useMemo(
    () => [
      ...FONTS,
      ...customFonts.map((f) => ({ family: f.name, weight: 400, category: "Custom" }) as FontDef),
    ],
    [customFonts],
  );

  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const recordRecent = (family: string) => {
    setRecentFonts((prev) => {
      const next = [family, ...prev.filter((f) => f !== family)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleFavorite = (family: string) => {
    setFavorites((prev) => {
      const next = prev.includes(family) ? prev.filter((f) => f !== family) : [family, ...prev];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const insertFontBox = (family: string, weight = 700, sample?: string) => {
    void ensureFontFamily(family);
    recordRecent(family);
    add(
      newText({
        text: sampleText.trim() || sample || family,
        fontSize: 76,
        fontWeight: weight,
        fontFamily: family,
        height: 120,
        width: 680,
        color: "#0f172a",
      }),
    );
  };

  const applyFontToSelection = (family: string, weight?: number) => {
    if (!hasSelection) {
      insertFontBox(family, weight);
      return;
    }
    void ensureFontFamily(family);
    recordRecent(family);
    for (const el of selectedTexts) {
      update(el.id, { fontFamily: family });
    }
  };

  const insertPairing = (pair: FontPairing) => {
    void ensureFontFamily(pair.heading.family);
    void ensureFontFamily(pair.body.family);
    recordRecent(pair.heading.family);
    recordRecent(pair.body.family);
    addGroup([
      newText({
        x: 160,
        y: 240,
        width: 1120,
        height: Math.round(pair.heading.size * 1.35),
        text: pair.heading.text,
        fontFamily: pair.heading.family,
        fontWeight: pair.heading.weight,
        fontSize: pair.heading.size,
        color: "#0f172a",
      }),
      newText({
        x: 160,
        y: 260 + Math.round(pair.heading.size * 1.4),
        width: 1000,
        height: 120,
        text: pair.body.text,
        fontFamily: pair.body.family,
        fontWeight: pair.body.weight,
        fontSize: pair.body.size,
        color: "#475569",
        lineHeight: 1.35,
      }),
    ]);
  };

  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFonts.filter((font) => {
      const matchesCategory =
        activeCategory === "All"
          ? true
          : activeCategory === "Saved"
            ? favSet.has(font.family)
            : font.category === activeCategory;
      const matchesSearch =
        !q || font.family.toLowerCase().includes(q) || font.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [allFonts, search, activeCategory, favSet]);

  const filteredPairings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FONT_PAIRINGS;
    return FONT_PAIRINGS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.vibe.toLowerCase().includes(q) ||
        p.heading.family.toLowerCase().includes(q) ||
        p.body.family.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="panel-content flex h-full w-full flex-col gap-3 text-slate-800">
      <PanelHeader
        kicker="Typography"
        title="Text & Google Fonts"
        description={`Insert styled blocks, browse ${allFonts.length} Google Fonts, or drop paired typography.`}
        icon={Type}
      />

      {/* Quick Text Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-slate-500">Quick insert</span>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PRESETS.map((p) => {
            const Icon = p.Icon;
            const spanFull = p.id === "display";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  void ensureFontFamily(p.fontFamily);
                  recordRecent(p.fontFamily);
                  add(
                    newText({
                      text: p.text,
                      fontSize: p.fontSize,
                      fontWeight: p.fontWeight,
                      fontFamily: p.fontFamily,
                      width: p.id === "display" || p.id === "quote" ? 960 : 620,
                      height: Math.round(p.fontSize * (p.bullet ? 4.2 : 1.55)),
                      color: p.id === "kicker" ? "#2563eb" : "#0f172a",
                      ...(p.italic ? { italic: true } : {}),
                      ...(p.bullet ? { bullet: true } : {}),
                      ...(p.letterSpacing !== undefined ? { letterSpacing: p.letterSpacing } : {}),
                      ...(p.textTransform ? { textTransform: p.textTransform } : {}),
                    }),
                  );
                }}
                className={`group flex items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-left transition-colors hover:border-blue-300 hover:bg-slate-50/70 ${
                  spanFull ? "col-span-2" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block truncate leading-tight text-slate-900"
                      style={{
                        fontFamily: `"${p.fontFamily}", sans-serif`,
                        fontWeight: p.fontWeight,
                        fontSize: p.id === "display" ? 15 : 12,
                      }}
                    >
                      {p.type}
                    </span>
                    <span className="block truncate text-[10px] font-sans text-slate-400">
                      {p.fontFamily} · {p.fontSize}px
                    </span>
                  </span>
                </div>
                <Plus className="size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Text Mode Bar */}
      {hasSelection && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-[11px]">
          <div className="min-w-0 truncate text-blue-900">
            <span className="font-semibold">{selectedTexts.length} selected</span>
            {activeSelectedFont ? (
              <span className="text-blue-600"> · {activeSelectedFont}</span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center rounded-md border border-blue-200 bg-white p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setClickApplies(true)}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                clickApplies ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setClickApplies(false)}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                !clickApplies ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {/* Fonts vs Pairings Switcher */}
      <SegmentedControl
        value={tab}
        onChange={setTab}
        label="Typography library section"
        options={[
          { value: "fonts", label: `Fonts (${allFonts.length})`, icon: Type },
          { value: "pairings", label: `Pairings (${FONT_PAIRINGS.length})`, icon: Wand2 },
        ]}
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={tab === "fonts" ? "Search 90+ Google Fonts..." : "Search font pairings..."}
      />

      {tab === "fonts" && (
        <>
          <div className="flex items-center gap-1.5">
            <input
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Preview custom text across fonts..."
              aria-label="Preview custom text"
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
            />
            {sampleText && (
              <button
                type="button"
                onClick={() => setSampleText("")}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-800"
              >
                Reset
              </button>
            )}
          </div>

          {recentFonts.length > 0 && !search && activeCategory === "All" && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-400">Recently used</span>
              <div className="flex flex-wrap gap-1">
                {recentFonts.map((rf) => (
                  <button
                    key={rf}
                    type="button"
                    onClick={() =>
                      hasSelection && clickApplies ? applyFontToSelection(rf) : insertFontBox(rf)
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
                    style={{ fontFamily: `"${rf}", sans-serif` }}
                  >
                    {rf}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ChipGroup
            value={activeCategory}
            options={CATEGORIES.map((cat) => ({
              value: cat,
              label: cat === "Saved" ? `Saved (${favorites.length})` : cat,
            }))}
            onChange={setActiveCategory}
            label="Font categories"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Showing {filteredFonts.length} font{filteredFonts.length === 1 ? "" : "s"}
            </span>
            <span>{hasSelection && clickApplies ? "Click to apply" : "Click to insert"}</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5 pb-6">
            {filteredFonts.map((f) => (
              <FontSpecimenRow
                key={f.family}
                font={f}
                sampleText={sampleText}
                selectedFont={activeSelectedFont}
                hasSelection={hasSelection}
                clickApplies={clickApplies}
                starred={favSet.has(f.family)}
                onToggleStar={() => toggleFavorite(f.family)}
                onPrimaryAction={() =>
                  hasSelection && clickApplies
                    ? applyFontToSelection(f.family, f.weight)
                    : insertFontBox(f.family, f.weight, f.sample)
                }
                onInsertNew={() => insertFontBox(f.family, f.weight, f.sample)}
              />
            ))}

            {filteredFonts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                {activeCategory === "Saved"
                  ? "No saved fonts yet — click the star icon on any font."
                  : `No fonts found matching “${search}”`}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "pairings" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5 pb-6">
          {filteredPairings.map((pair) => (
            <button
              key={pair.id}
              type="button"
              onClick={() => insertPairing(pair)}
              className="group flex flex-col gap-1.5 rounded-lg border border-slate-200/80 bg-white p-3 text-left transition-colors hover:border-blue-400 hover:bg-slate-50/70"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-800">{pair.name}</span>
                <span className="text-[10px] text-slate-400">{pair.vibe}</span>
              </div>
              <div
                className="truncate text-[17px] leading-tight text-slate-900"
                style={{
                  fontFamily: `"${pair.heading.family}", sans-serif`,
                  fontWeight: pair.heading.weight,
                }}
              >
                {pair.heading.text}
              </div>
              <div
                className="line-clamp-2 text-[11px] leading-snug text-slate-500"
                style={{
                  fontFamily: `"${pair.body.family}", sans-serif`,
                  fontWeight: pair.body.weight,
                }}
              >
                {pair.body.text}
              </div>
              <div className="mt-0.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                <span>
                  {pair.heading.family} + {pair.body.family}
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <Plus className="size-3" /> Insert pair
                </span>
              </div>
            </button>
          ))}
          {filteredPairings.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No pairings match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
