import { useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  Link2,
  Shapes,
  Star,
  Search,
  UploadCloud,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newIcon, newImage, newVideo, useEditor } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";
import { prepareImage } from "@/lib/image-assets";
import { PanelHeader } from "../ui/selectors";

type ElementSection = "shapes" | "icons" | null;

const POPULAR_ICON_NAMES = [
  "Activity", "AlertCircle", "AlertTriangle", "AlignCenter", "AlignLeft", "AlignRight", "Archive", "ArrowDown", "ArrowLeft", "ArrowRight",
  "ArrowUp", "Asterisk", "AtSign", "Award", "Ban", "Bell", "Bookmark", "BookOpen", "Briefcase", "Calendar",
  "Camera", "Check", "CheckCircle", "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp", "Circle", "Clipboard", "Clock",
  "Cloud", "Code", "Cog", "Columns3", "Command", "Compass", "Copy", "CreditCard", "Crown", "Database",
  "Download", "Edit", "Ellipsis", "Mail", "ExternalLink", "Eye", "EyeOff", "File", "FileText", "Filter",
  "Flag", "Folder", "Gauge", "Globe", "Grid2X2", "Heart", "HelpCircle", "Home", "Image", "Info",
  "Key", "Layers", "Layout", "LayoutDashboard", "Link", "Link2", "List", "Lock", "LogIn", "LogOut",
  "Mail", "MapPin", "Menu", "MessageCircle", "Mic", "Minus", "Monitor", "Moon", "MoreHorizontal", "Paperclip",
  "Pause", "PenTool", "Phone", "Play", "Plus", "RefreshCw", "Save", "Search", "Send", "Settings",
  "Share2", "Shield", "ShoppingCart", "Sidebar", "Star", "Sun", "Tag", "ThumbsUp", "Trash2", "Twitter",
  "Upload", "User", "Users", "Video", "X", "XCircle", "Zap", "ZoomIn", "ZoomOut",
  "Airplay", "Anchor", "Apple", "BadgeCheck", "BarChart3", "Battery", "Bluetooth", "BookMarked", "Box", "Building2",
  "Cake", "ChartLine", "ChartPie", "CheckCheck", "CircleDashed", "Clock3", "CloudSun", "Code2", "Coffee", "Contact",
  "Cpu", "Diamond", "Disc3", "DollarSign", "DownloadCloud", "FileCheck", "FilePlus2", "FolderOpen", "Gift", "Globe2",
  "Hammer", "Hash", "Headphones", "History", "Inbox", "Laptop", "Lightbulb", "ListChecks", "Map", "Megaphone",
  "MessageSquare", "MessagesSquare", "MonitorPlay", "Palette", "PanelLeft", "Paperclip", "Pin", "Podcast", "Printer",
  "Rocket", "Route", "ScanLine", "SendHorizontal", "Server", "ShieldCheck", "SlidersHorizontal", "Sparkles", "SquareStack",
  "Store", "Table2", "Tablet", "Terminal", "Ticket", "Timer", "ToggleLeft", "ToolCase", "TrainFront", "TriangleAlert",
  "Truck", "Tv", "Umbrella", "Unlock", "UserCheck", "UserPlus", "WalletCards", "Wifi", "Wind", "Wrench",
] as const;

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = POPULAR_ICON_NAMES.flatMap((name) => {
  const Icon = LucideIcons[name] as LucideIcon | undefined;
  return Icon ? [{ name, label: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Icon }] : [];
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
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 group-hover:text-slate-800">
        {label}
      </span>
    </button>
  );
}

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
      </div>

      {section === "shapes" && <ShapesPanel embedded />}

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
