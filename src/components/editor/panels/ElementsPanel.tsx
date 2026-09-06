import { useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  Camera,
  Check,
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
import { newImage, useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ label: string; Icon: LucideIcon; paths: string }> = [
  { label: "Heart", Icon: Heart, paths: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>' },
  { label: "Star", Icon: Star, paths: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
  { label: "Camera", Icon: Camera, paths: '<path d="M14.5 4h-5L7 7H3v13h18V7h-4z"/><circle cx="12" cy="13" r="3"/>' },
  { label: "Mail", Icon: Mail, paths: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>' },
  { label: "Location", Icon: MapPin, paths: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>' },
  { label: "Calendar", Icon: CalendarDays, paths: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>' },
  { label: "User", Icon: User, paths: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>' },
  { label: "Search", Icon: Search, paths: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>' },
  { label: "Play", Icon: Play, paths: '<polygon points="6 3 20 12 6 21 6 3"/>' },
  { label: "Check", Icon: Check, paths: '<path d="m20 6-11 11-5-5"/>' },
  { label: "Close", Icon: X, paths: '<path d="M18 6 6 18M6 6l12 12"/>' },
];

function iconDataUri(paths: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [uploads, setUploads] = useState<string[]>([]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(event.target.files ?? [])) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") return;
        setUploads((current) => [result, ...current]);
        add(newImage(result));
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
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
          {ICONS.map(({ label, Icon, paths }) => (
            <button key={label} title={`Add ${label}`} onClick={() => add(newImage(iconDataUri(paths), { tint: "#111827" }))} className="brutal-border-2 brutal-press grid h-16 place-items-center bg-surface text-teal hover:border-teal">
              <Icon className="size-6" />
            </button>
          ))}
        </div>
      )}
      {uploads.length > 0 && section === null && (
        <div className="grid grid-cols-3 gap-2">
          {uploads.map((src, index) => (
            <button key={`${src.slice(-16)}-${index}`} title="Add uploaded image" onClick={() => add(newImage(src))} className="brutal-border-2 brutal-press overflow-hidden bg-surface hover:border-teal">
              <img src={src} alt="Uploaded asset" className="h-16 w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
      {section === null && uploads.length === 0 && (
        <div className="flex items-center gap-2 border border-teal/20 bg-surface p-3 font-mono text-[9px] text-teal/50">
          <ImagePlus className="size-4" /> Choose a category above
        </div>
      )}
    </div>
  );
}