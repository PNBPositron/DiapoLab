import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Search, X, Check, Sparkles, Filter } from "lucide-react";
import {
  ArrowRight, Award, Bell, Book, BookOpen, Briefcase, Brush, Building, Calendar,
  Camera, Cloud, Code, Compass, Cpu, CreditCard, Database, Download, Flag, Gift,
  Globe, GraduationCap, Headphones, Heart, Home, Image, Key, Layers, Leaf,
  Lightbulb, Link, Lock, Mail, MapPin, Megaphone, Mic, MessageCircle, Monitor, Moon, Music,
  Paperclip, Pen, Phone, Plane, Play, Plus, Puzzle, Quote, Rocket, Search as SearchIcon,
  Settings, Share2, Shield, ShoppingCart, Smartphone, Smile, Star, Sun, Target,
  ThumbsUp, Trash2, Trophy, Upload, Users, Wifi, Zap,
} from "lucide-react";
import { newImage, useEditor } from "@/store/editor";
import { useSettings } from "@/store/settings";
import { PanelHeader } from "../ui/selectors";

type IconComp = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}>;

// Curated, searchable icon set. Entries insert as native SVG images, so they
// stay razor-sharp at any scale and can be recolored from the panel.
const ICON_SET: Array<{ Icon: IconComp; name: string }> = [
  { Icon: Rocket, name: "rocket" },
  { Icon: Heart, name: "heart" },
  { Icon: Star, name: "star" },
  { Icon: Zap, name: "zap" },
  { Icon: Check, name: "check" },
  { Icon: ThumbsUp, name: "thumbs up" },
  { Icon: Trophy, name: "trophy" },
  { Icon: Award, name: "award" },
  { Icon: Target, name: "target" },
  { Icon: Flag, name: "flag" },
  { Icon: ArrowRight, name: "arrow right" },
  { Icon: Compass, name: "compass" },
  { Icon: Globe, name: "globe" },
  { Icon: MapPin, name: "map pin" },
  { Icon: Plane, name: "plane" },
  { Icon: Home, name: "home" },
  { Icon: Building, name: "building" },
  { Icon: Briefcase, name: "briefcase" },
  { Icon: GraduationCap, name: "graduation cap" },
  { Icon: Book, name: "book" },
  { Icon: BookOpen, name: "book open" },
  { Icon: Lightbulb, name: "lightbulb" },
  { Icon: Bell, name: "bell" },
  { Icon: Megaphone, name: "megaphone" },
  { Icon: Mic, name: "mic" },
  { Icon: Music, name: "music" },
  { Icon: Headphones, name: "headphones" },
  { Icon: Camera, name: "camera" },
  { Icon: Image, name: "image" },
  { Icon: Monitor, name: "monitor" },
  { Icon: Smartphone, name: "smartphone" },
  { Icon: Cpu, name: "cpu" },
  { Icon: Database, name: "database" },
  { Icon: Code, name: "code" },
  { Icon: Cloud, name: "cloud" },
  { Icon: Wifi, name: "wifi" },
  { Icon: Lock, name: "lock" },
  { Icon: Key, name: "key" },
  { Icon: Shield, name: "shield" },
  { Icon: Settings, name: "settings" },
  { Icon: Puzzle, name: "puzzle" },
  { Icon: Layers, name: "layers" },
  { Icon: Link, name: "link" },
  { Icon: Share2, name: "share" },
  { Icon: Download, name: "download" },
  { Icon: Upload, name: "upload" },
  { Icon: Plus, name: "plus" },
  { Icon: Trash2, name: "trash" },
  { Icon: Pen, name: "pen" },
  { Icon: Brush, name: "brush" },
  { Icon: Calendar, name: "calendar" },
  { Icon: Mail, name: "mail" },
  { Icon: Phone, name: "phone" },
  { Icon: MessageCircle, name: "message" },
  { Icon: Paperclip, name: "paperclip" },
  { Icon: ShoppingCart, name: "shopping cart" },
  { Icon: CreditCard, name: "credit card" },
  { Icon: Gift, name: "gift" },
  { Icon: Quote, name: "quote" },
  { Icon: SearchIcon, name: "search" },
  { Icon: Smile, name: "smile" },
  { Icon: Users, name: "users" },
  { Icon: Sun, name: "sun" },
  { Icon: Moon, name: "moon" },
  { Icon: Leaf, name: "leaf" },
  { Icon: Play, name: "play" },
];

const DEFAULT_ICON_COLORS = [
  "#0f172a",
  "#ffffff",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

/** Render a lucide icon to a standalone, tinted SVG data URL. */
function iconToSvgDataUrl(Icon: IconComp, color: string): string {
  const markup = renderToStaticMarkup(
    <Icon size={48} strokeWidth={2} color={color} />,
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

export function IconsPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const { add } = useEditor();
  const brandKit = useSettings((s) => s.brandKit);
  const [searchQuery, setSearchQuery] = useState("");
  const [color, setColor] = useState("#0f172a");
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const swatches = useMemo(
    () => [brandKit.primary, brandKit.accent, ...DEFAULT_ICON_COLORS],
    [brandKit.primary, brandKit.accent],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ICON_SET;
    return ICON_SET.filter((e) => e.name.includes(query));
  }, [searchQuery]);

  const handleInsert = (entry: { Icon: IconComp; name: string }) => {
    add(
      newImage(iconToSvgDataUrl(entry.Icon, color), {
        illustrationFormat: "svg",
        assetKind: "icon",
        fit: "contain",
        width: 240,
        height: 240,
      }),
    );
    setRecentlyAdded(entry.name);
    setTimeout(() => setRecentlyAdded(null), 1200);
  };

  return (
    <div className="flex h-full flex-col gap-3.5 p-1 text-slate-800">
      {!embedded && (
        <PanelHeader
          kicker="Icons"
          title="Vector icons"
          description="Scalable, recolorable SVG icons for your slides."
          icon={Sparkles}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search icons..."
          className="w-full rounded-lg border border-slate-200/80 bg-slate-50/60 py-1.5 pl-8 pr-7 text-xs text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Icon color picker */}
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={c}
            className={`size-6 rounded-full border shadow-2xs transition ${
              color === c ? "ring-2 ring-indigo-400 ring-offset-1" : "hover:scale-110"
            } ${c === "#ffffff" ? "border-slate-300" : "border-slate-200"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="relative min-h-[220px] flex-1">
        {filtered.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-1.5 text-center text-slate-400">
            <Filter className="size-5 opacity-40" />
            <p className="text-xs">No icons found</p>
            <span className="text-[11px] opacity-70">Try searching for something else</span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-0.5 pb-2 max-h-[calc(100vh-300px)]">
            {filtered.map((entry) => {
              const isAdded = recentlyAdded === entry.name;
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => handleInsert(entry)}
                  title={entry.name}
                  className="group relative flex aspect-square items-center justify-center rounded-xl border border-slate-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md active:translate-y-0 active:scale-95"
                >
                  <entry.Icon
                    size={26}
                    strokeWidth={2}
                    className="text-slate-700 transition-transform duration-200 group-hover:scale-110"
                  />
                  {isAdded && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-indigo-600/90 text-white backdrop-blur-[1px] animate-in fade-in zoom-in-75 duration-150">
                      <Check className="size-4 stroke-[3]" />
                    </div>
                  )}
                  <span className="pointer-events-none absolute bottom-1 truncate px-1 text-[8px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                    {entry.name}
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

export default IconsPanel;