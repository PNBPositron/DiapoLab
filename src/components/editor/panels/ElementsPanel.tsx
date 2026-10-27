import { useState } from "react";
import { LUCIDE_ICONS } from "@/lib/lucide-icons";
import {
  Link2,
  Shapes,
  Star,
  Search,
  UploadCloud,
  Loader2,
  Sparkles,
  Youtube,
  Music2,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newEmbed, toEmbedSrc, newIcon, newImage, newVideo, useEditor, type AnyElement } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";
import { prepareImage } from "@/lib/image-assets";
import { PanelHeader } from "../ui/selectors";

type ElementSection = "shapes" | "icons" | "embeds" | null;

const POPULAR_ICON_NAMES = [
  "Accessibility", "Activity", "Airplay", "AlignCenterHorizontal", "AlignStartHorizontal", "AlignEndHorizontal", "Anchor", "Apple", "Archive", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "Asterisk", "Atom", "AtSign", "Award", "BadgeAlert", "BadgeCheck", "Ban", "Battery", "Bell", "Bike", "Bird", "Blocks", "Bluetooth", "Bookmark", "BookMarked", "BookOpen", "Box", "Brain", "Briefcase", "Bug", "Building2", "Bus", "Cake", "Calendar", "CalendarCheck", "Camera", "Car", "Check", "CheckCheck", "Cherry", "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp", "Circle", "CircleDashed", "CircleQuestionMark", "CircleUserRound", "CircleAlert", "TriangleAlert", "CircleCheck", "CircleX", "Clapperboard", "Clipboard", "Clock", "Clock3", "Cloud", "CloudCog", "CloudSun", "CloudDownload", "Code", "CodeXml", "Coffee", "Cog", "Columns3", "Combine", "Command", "Compass", "Contact", "Cookie", "Copy", "Cpu", "CreditCard", "Croissant", "Crown", "Database", "Diamond", "Disc3", "DollarSign", "Download", "Dumbbell", "Pencil", "Ellipsis", "ExternalLink", "Eye", "EyeOff", "Feather", "File", "FileChartColumn", "FileCheck", "FilePlus", "FileText", "Funnel", "Fish", "Flag", "Flame", "Flower2", "Folder", "FolderGit2", "FolderOpen", "Gauge", "Ghost", "Gift", "Globe", "Earth", "Grid2x2", "Guitar", "Hammer", "Hand", "Hash", "Headphones", "Heart", "Highlighter", "History", "House", "Hourglass", "Image", "Inbox", "Infinity", "Info", "Kanban", "Key", "Keyboard", "Laptop", "Layers", "LayoutPanelLeft", "LayoutDashboard", "Leaf", "Lightbulb", "Link", "Link2", "List", "ListChecks", "ListTree", "Locate", "Lock", "LockOpen", "LogIn", "LogOut", "Magnet", "Mail", "Map", "MapPin", "Medal", "Megaphone", "Menu", "MessageCircle", "MessageCircleMore", "MessageSquare", "MessagesSquare", "Mic", "Microscope", "Milestone", "Minus", "Monitor", "MonitorPlay", "Moon", "Mouse", "Music", "Navigation", "Orbit", "Package", "PackageCheck", "Paintbrush", "Palette", "PanelLeft", "PanelLeftOpen", "PanelsTopLeft", "Paperclip", "Pause", "PawPrint", "Pen", "PenTool", "Phone", "PiggyBank", "Pin", "Plane", "Sprout", "Play", "Plus", "Podcast", "Pointer", "Popcorn", "Printer", "Puzzle", "QrCode", "Quote", "Radar", "Receipt", "Recycle", "RefreshCw", "Rocket", "Route", "Sailboat", "Save", "Scale", "ScanLine", "ScanSearch", "Search", "Send", "SendHorizontal", "Server", "Settings", "Share2", "Shield", "ShieldCheck", "Shirt", "ShoppingCart", "Sigma", "SlidersHorizontal", "Snowflake", "Sparkles", "SquareDashedKanban", "SquareStack", "Stamp", "Star", "Store", "Sun", "SunMoon", "Table2", "Tablet", "Tag", "Telescope", "Tent", "Terminal", "ThumbsUp", "Ticket", "Timer", "ToggleLeft", "ToolCase", "TrainFront", "Trash2", "Trees", "Truck", "Tv", "Twitter", "Umbrella", "Upload", "User", "UserCheck", "UserPlus", "Users", "Video", "Volleyball", "WalletCards", "Wand", "Watch", "Waves", "Waypoints", "Wifi", "Wind", "Workflow", "Wrench", "X", "Zap", "ZoomIn", "ZoomOut", "ChartLine", "ChartPie", "ChartNoAxesCombined", "ChartColumnBig",
] as const;

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = POPULAR_ICON_NAMES.flatMap((name) => {
  const Icon = LUCIDE_ICONS[name];
  if (!Icon) return [];
  return [{ name, label: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Icon }];
});


/* Refined tile: frosted card, gradient chip, subtle lift + blue glow on hover. */
function ActionTile({
  Icon,
  label,
  active = false,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const state = active
    ? "border-blue-500/50 bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_8px_20px_-8px_rgba(59,130,246,0.45)]"
    : "border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_12px_26px_-10px_rgba(37,99,235,0.22)]";
  const chip = active
    ? "bg-linear-to-tr from-blue-500 to-indigo-600 text-white shadow-xs"
    : "bg-slate-100/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600";
  return (
    <button onClick={onClick} className={`group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.97] ${state}`}>
      <span className={`grid size-9 place-items-center rounded-xl transition-all duration-200 ${chip}`}>
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-slate-600 group-hover:text-slate-800">
        {label}
      </span>
    </button>
  );
}

export function ElementsPanel() {
  const { add } = useEditor();
  const addGroup = (els: AnyElement[]) => {
    const groupId = crypto.randomUUID();
    els.forEach((element) => add({ ...element, groupId }));
  };

  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const filteredIcons = ICONS.filter(({ label }) =>
    label.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );

  const addByUrl = () => {
    const trimmed = imageUrl.trim();
    setUrlError(null);
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("Lien invalide — doit commencer par http:// ou https://");
      return;
    }
    add(newImage(trimmed));
    setImageUrl("");
  };

  const addFile = async (file: File) => {
    setUploading(true);
    setUrlError(null);
    try {
      if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1024 * 1024) throw new Error("Video files must be smaller than 25 MB.");
        const reader = new FileReader();
        const src = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the video."));
          reader.readAsDataURL(file);
        });
        add(newVideo(src));
      } else {
        add(newImage(await prepareImage(file)));
      }
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="panel-content">
      <PanelHeader kicker="Elements" title="Building blocks" description="Drop images, shapes and icons onto your slide." icon={Sparkles} />

      {/* Upload zone */}
      <label className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300/90 bg-white/70 px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_12px_26px_-12px_rgba(37,99,235,0.25)]">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-100/80 text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
        </span>
        <span className="text-xs font-semibold text-slate-700">
          {uploading ? "Preparing media…" : "Upload image, GIF or video"}
        </span>
        <span className="text-[9px] text-slate-400">Images, GIFs & videos · video ≤ 25 MB</span>
        <input type="file" accept="image/*,video/*" className="sr-only" disabled={uploading} onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void addFile(file);
          event.target.value = "";
        }} />
      </label>

      {/* Add image by URL — permanent, survives refresh & design sharing. */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
          <Link2 className="size-4 shrink-0 text-slate-400" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            placeholder="Coller le lien d'une image…"
            aria-label="Image URL"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={addByUrl}
            className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-700 active:scale-95"
          >
            Ajouter
          </button>
        </label>
        {urlError && (
          <p className="px-1 text-[10px] font-medium text-rose-500">{urlError}</p>
        )}
      </div>

      {/* Section tiles */}
      <div className="panel-action-grid">
        <ActionTile
          Icon={Shapes}
          label="Shapes"
          active={section === "shapes"}
          onClick={() => setSection(section === "shapes" ? null : "shapes")}
        />
        <ActionTile
          Icon={Star}
          label="Icons"
          active={section === "icons"}
          onClick={() => setSection(section === "icons" ? null : "icons")}
        />
        <ActionTile
          Icon={Youtube}
          label="Embeds"
          active={section === "embeds"}
          onClick={() => setSection(section === "embeds" ? null : "embeds")}
        />
      </div>

      {section === "shapes" && <ShapesPanel embedded />}

      {/* Web embeds — YouTube, Spotify, Maps, Figma… as live iframes on the slide */}
      {section === "embeds" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Youtube className="size-4 text-blue-600" /> Web embeds</div>
            <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[9px] font-bold text-blue-600">live iframes</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">Paste a link — YouTube, Spotify, SoundCloud, Google Maps, Figma, Vimeo… It plays live on the slide.</p>
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white">
            <Link2 className="size-4 shrink-0" />
            <input
              value={embedUrl}
              onChange={(event) => setEmbedUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && embedUrl.trim()) {
                  add(newEmbed(embedUrl));
                  setEmbedUrl("");
                }
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              aria-label="Embed URL"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            disabled={!toEmbedSrc(embedUrl)}
            onClick={() => {
              add(newEmbed(embedUrl));
              setEmbedUrl("");
            }}
            className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            {embedUrl.trim() && !toEmbedSrc(embedUrl) ? "Lien invalide — vérifiez l'URL" : "Add embed to canvas"}
          </button>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><Youtube className="size-4" /><span className="text-[8px] font-medium">YouTube</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><Music2 className="size-4" /><span className="text-[8px] font-medium">Spotify</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><MapPin className="size-4" /><span className="text-[8px] font-medium">Maps</span></div>
          </div>
          <p className="text-[9px] leading-relaxed text-slate-400">PDF / PPTX exports replace embeds with a linked placeholder card (iframes can't be captured).</p>
        </div>
      )}

      {section === "icons" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
            <Search className="size-4" />
            <input
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
              placeholder="Search all Lucide icons"
              aria-label="Search icons"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="panel-section-label">Add to canvas</div>
          <div className="grid grid-cols-3 gap-2">
            {filteredIcons.map(({ name, label, Icon }) => (
              <button
                key={name}
                title={`Add ${label}`}
                onClick={() => add(newIcon(name))}
                className="group flex h-20 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:text-blue-600 hover:shadow-[0_10px_22px_-8px_rgba(37,99,235,0.28)] active:translate-y-0 active:scale-[0.97]"
              >
                <Icon className="size-6 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                <span className="w-full truncate px-1.5 text-[8px] font-medium text-slate-400 group-hover:text-slate-600">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

