import { useState, useMemo } from "react";
import { Search, X, Check, Sparkles, User, Filter } from "lucide-react";
import { newImage, useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";
import { PanelHeader } from "./TextPanel";

const HIGHLIGHTS = [
  ...Array.from({ length: 17 }, (_, i) => `Arrow-${i + 1}.svg`),
  ...Array.from({ length: 12 }, (_, i) => `Blob-${i + 1}.svg`),
  ...Array.from({ length: 14 }, (_, i) => `Doodle-${i + 1}.svg`),
  "Donuts-1.svg", "Donuts-2.svg",
  ...Array.from({ length: 11 }, (_, i) => `Line-${i + 1}.svg`),
  ...Array.from({ length: 8 }, (_, i) => `Loop-${i + 1}.svg`),
  ...Array.from({ length: 8 }, (_, i) => `Spiral-${i + 1}.svg`),
  ...Array.from({ length: 10 }, (_, i) => `Scribble-${i + 1}.svg`),
  ...Array.from({ length: 9 }, (_, i) => `Punctuation-${i + 1}.svg`),
  ...Array.from({ length: 8 }, (_, i) => `Sprinkle-${i + 1}.svg`),
  ...Array.from({ length: 10 }, (_, i) => `Underline-${i + 1}.svg`),
  ...Array.from({ length: 8 }, (_, i) => `Whirl-${i + 1}.svg`),
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
  const isDark = editorTheme?.includes("dark");

  const [activeTab, setActiveTab] = useState<Collection>("Highlights");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  // Extract distinct subcategories for Highlights
  const tags = useMemo(() => {
    if (activeTab !== "Highlights") return [];
    const set = new Set<string>();
    HIGHLIGHTS.forEach((file) => {
      const prefix = file.split("-")[0];
      if (prefix) set.add(prefix);
    });
    return ["All", ...Array.from(set)];
  }, [activeTab]);

  // Filter items by search query and category pill
  const filteredFiles = useMemo(() => {
    const pool = activeTab === "Highlights" ? HIGHLIGHTS : TRANSHUMANS;
    return pool.filter((file) => {
      const readableName = file.replace(/\.(svg|png)$/i, "").replaceAll("-", " ").toLowerCase();
      const matchesSearch = readableName.includes(searchQuery.trim().toLowerCase());

      if (activeTab === "Highlights" && selectedTag !== "All") {
        return matchesSearch && file.startsWith(selectedTag);
      }
      return matchesSearch;
    });
  }, [activeTab, searchQuery, selectedTag]);

  const handleInsert = (file: string) => {
    const isHighlight = activeTab === "Highlights";
    const src = `/illustrations/${isHighlight ? "" : "transhumans/"}${file}`;

    add(
      newImage(src, {
        illustrationFormat: isHighlight ? "svg" : "png",
        fit: "contain",
        ...(isHighlight ? { tint: isDark ? "#ffffff" : "#0f172a" } : {}),
      })
    );

    // Provide momentary tactile confirmation
    setRecentlyAdded(file);
    setTimeout(() => setRecentlyAdded(null), 1200);
  };

  return (
    <div className="flex h-full flex-col gap-3.5 p-1 text-slate-800 dark:text-slate-100">
      <PanelHeader title="Illustrations" />

      {/* Segmented Tab Switcher */}
      <div className="flex rounded-xl bg-slate-100/90 p-1 backdrop-blur-sm dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => {
            setActiveTab("Highlights");
            setSelectedTag("All");
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
            activeTab === "Highlights"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles className="size-3.5" />
          <span>Accents</span>
          <span className="text-[10px] opacity-50">({HIGHLIGHTS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("Transhumans");
            setSelectedTag("All");
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
            activeTab === "Transhumans"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <User className="size-3.5" />
          <span>Characters</span>
          <span className="text-[10px] opacity-50">({TRANSHUMANS.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab.toLowerCase()}...`}
          className="w-full rounded-lg border border-slate-200/80 bg-slate-50/60 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-950/40"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Subcategory Filter Chips for Highlights */}
      {activeTab === "Highlights" && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                selectedTag === tag
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Illustration Cards Grid */}
      <div className="relative min-h-[220px] flex-1">
        {filteredFiles.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-1.5 text-center text-slate-400">
            <Filter className="size-5 opacity-40" />
            <p className="text-xs">No illustrations found</p>
            <span className="text-[11px] opacity-70">Try searching with a different keyword</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-0.5 pb-2 max-h-[calc(100vh-280px)]">
            {filteredFiles.map((file) => {
              const src = `/illustrations/${activeTab === "Transhumans" ? "transhumans/" : ""}${file}`;
              const name = file.replace(/\.(svg|png)$/i, "").replaceAll("-", " ");
              const isAdded = recentlyAdded === file;

              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => handleInsert(file)}
                  title={name}
                  className="group relative flex aspect-square flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md active:translate-y-0 active:scale-95 dark:border-slate-800 dark:bg-slate-850 dark:hover:border-indigo-500/50 dark:hover:shadow-slate-950/30"
                >
                  {/* Subtle contrast background for SVGs in dark mode */}
                  <div className="flex size-full items-center justify-center">
                    <img
                      src={src}
                      alt={name}
                      loading="lazy"
                      decoding="async"
                      className={`max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-110 ${
                        activeTab === "Highlights" && isDark ? "invert" : ""
                      }`}
                    />
                  </div>

                  {/* Micro "Added" Badge Indicator */}
                  {isAdded && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-600/90 text-white backdrop-blur-[1px] animate-in fade-in zoom-in-75 duration-150">
                      <Check className="size-4 stroke-[3]" />
                    </div>
                  )}

                  {/* Accessible hover tooltip tag */}
                  <span className="pointer-events-none absolute bottom-1 truncate px-1 text-[9px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
