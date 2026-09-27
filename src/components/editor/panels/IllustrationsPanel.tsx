import { useState, useMemo } from "react";
import { Search, X, Check, Sparkles, User, Filter, Boxes } from "lucide-react";
import { newImage, useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";

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

const ICONS = [
  "3dicons-bag-dynamic-color.png",
  "3dicons-bulb-dynamic-color.png",
  "3dicons-calender-dynamic-color.png",
  "3dicons-camera-dynamic-color.png",
  "3dicons-chart-dynamic-color.png",
  "3dicons-chat-bubble-dynamic-color.png",
  "3dicons-chat-text-dynamic-color.png",
  "3dicons-computer-dynamic-color.png",
  "3dicons-credit-card-dynamic-color.png",
  "3dicons-file-text-dynamic-color.png",
  "3dicons-flash-dynamic-color.png",
  "3dicons-folder-dynamic-color.png",
  "3dicons-gift-box-dynamic-color.png",
  "3dicons-headphone-dynamic-color.png",
  "3dicons-heart-dynamic-color.png",
  "3dicons-lab-dynamic-color.png",
  "3dicons-megaphone-dynamic-color.png",
  "3dicons-mobile-dynamic-color.png",
  "3dicons-notebook-dynamic-color.png",
  "3dicons-puzzle-dynamic-color.png",
  "3dicons-rocket-dynamic-color.png",
  "3dicons-setting-dynamic-color.png",
  "3dicons-shield-dynamic-color.png",
  "3dicons-star-dynamic-color.png",
  "3dicons-sun-dynamic-color.png",
  "3dicons-target-dynamic-color.png",
  "3dicons-tick-dynamic-color.png",
  "3dicons-tools-dynamic-color.png",
  "3dicons-travel-dynamic-color.png",
  "3dicons-wifi-dynamic-color.png",
  "3dicons-zoom-dynamic-color.png",
];

type Collection = "Highlights" | "Transhumans" | "Icons";

export function IllustrationsPanel() {
  const { add } = useEditor();
  const editorTheme = useSettings((state) => state.editorTheme);
  const isDark = editorTheme?.includes("dark");

  const [activeTab, setActiveTab] = useState<Collection>("Highlights");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  // Filter items by search query
  const filteredFiles = useMemo(() => {
    const pool =
      activeTab === "Highlights" ? HIGHLIGHTS : activeTab === "Transhumans" ? TRANSHUMANS : ICONS;
    if (!searchQuery.trim()) return pool;

    const query = searchQuery.trim().toLowerCase();
    return pool.filter((file) => {
      const readableName = file.replace(/\.(svg|png)$/i, "").replaceAll("-", " ").toLowerCase();
      return readableName.includes(query);
    });
  }, [activeTab, searchQuery]);

  const handleInsert = (file: string) => {
    const isHighlight = activeTab === "Highlights";
    const isIcon = activeTab === "Icons";
    const src = `/illustrations/${isHighlight ? "" : isIcon ? "icons/" : "transhumans/"}${file}`;

    add(
      newImage(src, {
        illustrationFormat: isHighlight ? "svg" : "png",
        fit: "contain",
        ...(isHighlight ? { tint: isDark ? "#ffffff" : "#0f172a" } : {}),
      })
    );

    // Tactile confirmation animation
    setRecentlyAdded(file);
    setTimeout(() => setRecentlyAdded(null), 1200);
  };

  return (
    <div className="flex h-full flex-col gap-3.5 p-1 text-slate-800 dark\:text-slate-100">
      {/* Segmented Control Tabs */}
      <div className="flex rounded-xl bg-slate-100/90 p-1 backdrop-blur-sm dark\:bg-slate-850">
        <button
          type="button"
          onClick={() => setActiveTab("Highlights")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
            activeTab === "Highlights"
              ? "bg-white text-slate-900 shadow-sm dark\:bg-slate-750 dark\:text-white"
              : "text-slate-500 hover\:text-slate-800 dark\:text-slate-400 dark\:hover\:text-slate-200"
          }`}
        >
