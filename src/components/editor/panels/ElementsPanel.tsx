import { useState, type ChangeEvent } from "react";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  Circle,
  Cloud,
  Code,
  Copy,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Flag,
  Folder,
  Globe,
  Grid2X2,
  Hash,
  Heart,
  HelpCircle,
  Home,
  ImagePlus,
  Info,
  Link,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Shapes,
  Shield,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { newIcon, newImage, useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ label: string; Icon: LucideIcon }> = [
  ["Heart", Heart], ["Star", Star], ["Camera", Camera], ["Mail", Mail], ["Location", MapPin], ["Calendar", CalendarDays],
  ["User", User], ["Search", Search], ["Play", Play], ["Check", Check], ["Close", X], ["Bell", Bell],
  ["Bookmark", Bookmark], ["Cloud", Cloud], ["Download", Download], ["Edit", Edit3], ["Eye", Eye], ["File", FileText],
  ["Folder", Folder], ["Globe", Globe], ["Home", Home], ["Settings", Settings], ["Activity", Activity], ["Archive", Archive],
  ["Arrow Down", ArrowDown], ["Arrow Left", ArrowLeft], ["Arrow Right", ArrowRight], ["Arrow Up", ArrowUp], ["Circle", Circle],
  ["Code", Code], ["Copy", Copy], ["Credit Card", CreditCard], ["Filter", Filter], ["Flag", Flag], ["Grid", Grid2X2],
  ["Hash", Hash], ["Help", HelpCircle], ["Info", Info], ["Link", Link], ["Lock", Lock], ["Menu", Menu],
  ["Message", MessageCircle], ["More", MoreHorizontal], ["Pencil", Pencil], ["Phone", Phone], ["Plus", Plus],
  ["Send", Send], ["Shield", Shield], ["Tag", Tag], ["Trash", Trash2], ["Trending", TrendingUp], ["Trophy", Trophy],
  ["Users", Users], ["Zap", Zap],
].map(([label, Icon]) => ({ label: label as string, Icon: Icon as LucideIcon }));

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    files.forEach((file) => add(newImage(URL.createObjectURL(file))));
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Elements" />
      <div className="grid grid-cols-3 gap-2">
        <label className="brutal-border-2 brutal-press flex h-20 cursor-pointer flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <Upload className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Upload</span>
          <input type="file" accept="image/*" multiple onChange={onFile} className="hidden" />
        </label>
        <button onClick={() => setSection(section === "shapes" ? null : "shapes")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "shapes" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Shapes className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Shapes</span>
        </button>
        <button onClick={() => setSection(section === "icons" ? null : "icons")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "icons" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Star className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Icons</span>
        </button>
      </div>

      {section === "shapes" && <ShapesPanel embedded />}
      {section === "icons" && (
        <div className="grid grid-cols-3 gap-2">
          {ICONS.map(({ label, Icon }) => (
            <button key={label} title={`Add ${label}`} onClick={() => add(newIcon(label))} className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-white/80 text-ink shadow-sm hover:border-teal hover:bg-white">
              <Icon className="size-7" strokeWidth={2} />
              <span className="truncate px-1 font-mono text-[8px] text-ink/70">{label}</span>
            </button>
          ))}
        </div>
      )}

      {section === null && (
        <div className="flex items-center gap-2 border border-teal/20 bg-surface p-3 font-mono text-[9px] text-teal/50">
          <ImagePlus className="size-4" /> Choose a category above
        </div>
      )}
    </div>
  );
}
