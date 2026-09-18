import { useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  Bell,
  Bookmark,
  Cloud,
  Download,
  Edit3,
  Eye,
  FileText,
  Folder,
  Settings,
  Globe,
  Home,
  Heart,
  ImagePlus,
  Mail,
  MapPin,
  Play,
  Search,
  Shapes,
  Star,
  Upload,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { newIcon, newImage, useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ label: string; Icon: LucideIcon }> = [
  { label: "Heart", Icon: Heart }, { label: "Star", Icon: Star }, { label: "Camera", Icon: Camera },
  { label: "Mail", Icon: Mail }, { label: "Location", Icon: MapPin }, { label: "Calendar", Icon: CalendarDays },
  { label: "User", Icon: User }, { label: "Search", Icon: Search }, { label: "Play", Icon: Play },
  { label: "Check", Icon: Check }, { label: "Close", Icon: X }, { label: "Bell", Icon: Bell },
  { label: "Bookmark", Icon: Bookmark }, { label: "Cloud", Icon: Cloud }, { label: "Download", Icon: Download },
  { label: "Edit", Icon: Edit3 }, { label: "Eye", Icon: Eye }, { label: "File", Icon: FileText },
  { label: "Folder", Icon: Folder }, { label: "Globe", Icon: Globe }, { label: "Home", Icon: Home },
  { label: "Settings", Icon: Settings },
];

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
            <button key={label} title={`Add ${label}`} onClick={() => add(newIcon(label))} className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-paper text-ink hover:border-teal">
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
