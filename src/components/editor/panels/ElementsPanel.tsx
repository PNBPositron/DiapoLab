import { useEffect, useState, type ChangeEvent } from "react";
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
import { LINEICONS } from "@/data/lineicons";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";
import { listAccountImages, uploadAccountImage, type AccountImage } from "@/lib/image-assets";

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
  { label: "Bell", Icon: Bell, paths: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>' },
  { label: "Bookmark", Icon: Bookmark, paths: '<path d="M6 3h12v18l-6-4-6 4z"/>' },
  { label: "Cloud", Icon: Cloud, paths: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z"/>' },
  { label: "Download", Icon: Download, paths: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>' },
  { label: "Edit", Icon: Edit3, paths: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>' },
  { label: "Eye", Icon: Eye, paths: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  { label: "File", Icon: FileText, paths: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>' },
  { label: "Folder", Icon: Folder, paths: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/>' },
  { label: "Globe", Icon: Globe, paths: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>' },
  { label: "Home", Icon: Home, paths: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6"/>' },
  { label: "Settings", Icon: Settings, paths: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7v-2h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8.4 9l1.4-1.4.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.2 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2h-.2a1.7 1.7 0 0 0-1 1z"/>' },
];

function iconDataUri(paths: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [uploads, setUploads] = useState<AccountImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [iconLimit, setIconLimit] = useState(120);

  useEffect(() => {
    listAccountImages()
      .then(setUploads)
      .catch(() => setLibraryError("Sign in to save images to your library"));
  }, []);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setLibraryError(null);
    try {
      const added = await Promise.all(files.map(uploadAccountImage));
      setUploads((current) => [...added, ...current]);
      added.forEach((image) => add(newImage(image.url)));
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader title="Elements" />
      <div className="grid grid-cols-3 gap-2">
        <label className="brutal-border-2 brutal-press flex h-20 cursor-pointer flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <Upload className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">{uploading ? "Saving..." : "Upload"}</span>
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
        <div className="space-y-2">
          <label className="flex items-center gap-2 brutal-border-2 bg-ink px-2 text-teal/70"><Search className="size-3.5" /><input value={iconSearch} onChange={(event) => { setIconSearch(event.target.value); setIconLimit(120); }} placeholder="Search lineicons" className="min-w-0 flex-1 bg-transparent py-2 font-mono text-[10px] text-teal outline-none placeholder:text-teal/35" /></label>
          <div className="grid grid-cols-3 gap-2">
            {LINEICONS.filter((icon) => `${icon.label} ${icon.category} ${icon.name}`.toLowerCase().includes(iconSearch.toLowerCase())).slice(0, iconLimit).map((icon) => {
              const src = `/lineicons/${icon.name}.svg`;
              return <button key={icon.name} title={`Add ${icon.label}`} onClick={() => add(newIcon(icon.label, { src, color: "#111827" }))} className="brutal-border-2 brutal-press overflow-hidden bg-paper text-ink hover:border-teal"><span className="grid h-16 place-items-center bg-white"><img src={src} alt={icon.label} loading="lazy" decoding="async" width={32} height={32} className="size-8 object-contain" draggable={false} /></span><span className="block truncate px-1 py-1 text-left font-mono text-[7px] text-ink/70">{icon.label}</span></button>;
            })}
          </div>
          {LINEICONS.filter((icon) => `${icon.label} ${icon.category} ${icon.name}`.toLowerCase().includes(iconSearch.toLowerCase())).length > iconLimit && <button type="button" onClick={() => setIconLimit((limit) => limit + 120)} className="brutal-border-2 brutal-press w-full bg-surface py-2 font-display text-[9px] uppercase tracking-[0.12em] text-teal hover:border-teal">Load more icons</button>}
        </div>
      )}
      {uploads.length > 0 && section === null && (
        <div className="grid grid-cols-3 gap-2">
          {uploads.map((image) => (
            <button key={image.id} title={`Add ${image.name}`} onClick={() => add(newImage(image.url))} className="brutal-border-2 brutal-press overflow-hidden bg-surface hover:border-teal">
              <img src={image.url} alt={image.name} className="h-16 w-full object-cover" draggable={false} />
              <span className="block truncate px-1 py-1 text-left font-mono text-[8px] text-teal/70">{image.name}</span>
            </button>
          ))}
        </div>
      )}
      {libraryError && <p className="border border-red-400/30 bg-red-400/10 p-2 font-mono text-[9px] text-red-300">{libraryError}</p>}
      {section === null && uploads.length === 0 && (
        <div className="flex items-center gap-2 border border-teal/20 bg-surface p-3 font-mono text-[9px] text-teal/50">
          <ImagePlus className="size-4" /> Choose a category above
        </div>
      )}
    </div>
  );
}
