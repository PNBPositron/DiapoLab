import { useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  Link2,
  Shapes,
  Star,
  Search,
  ImagePlus,
  Loader2,
  Camera,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newIcon, newImage, useEditor } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";
import { prepareImage } from "@/lib/image-assets";

type ElementSection = "shapes" | "icons" | "unsplash" | null;

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
};

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = Object.entries(LucideIcons)
  .filter(([name, icon]) => {
    const isLucideComponent = typeof icon === "object" && icon !== null && "render" in icon;
    return name !== "createLucideIcon" && isLucideComponent && /^[A-Z]/.test(name);
  })
  .map(([name, Icon]) => ({ name, label: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Icon: Icon as LucideIcon }))
  .sort((a, b) => a.label.localeCompare(b.label))
  .slice(0, 100);

/* Modern tile: frosted white card, gradient icon chip, blue accent when active. */
function ActionTile({
  Icon,
  label,
  active = false,
  onClick,
  asLabel = false,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  asLabel?: boolean;
  children?: React.ReactNode;
}) {
  const base =
    "group relative flex h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const state = active
    ? "border-blue-500/50 bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_8px_20px_-8px_rgba(59,130,246,0.45)]"
    : "border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_24px_-8px_rgba(15,23,42,0.18)]";
  const chip = active
    ? "bg-linear-to-tr from-blue-500 to-indigo-600 text-white shadow-xs"
    : "bg-slate-100/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600";
  const inner = (
    <>
      <span className={`grid size-9 place-items-center rounded-xl transition-all duration-200 ${chip}`}>
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase group-hover:text-slate-800">
        {label}
      </span>
      {children}
    </>
  );
  if (asLabel) {
    return (
      <label className={`${base} ${state}`}>
        {inner}
      </label>
    );
  }
  return (
    <button onClick={onClick} className={`${base} ${state}`}>
      {inner}
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
  const [unsplashQuery, setUnsplashQuery] = useState("abstract presentation");
  const [unsplashPhotos, setUnsplashPhotos] = useState<UnsplashPhoto[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
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

  const searchUnsplash = async () => {
    const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!key) {
      setUnsplashError("Unsplash access key is not configured.");
      return;
    }
    setUnsplashLoading(true);
    setUnsplashError(null);
    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery || "abstract presentation")}&per_page=12`, {
        headers: { Authorization: `Client-ID ${key}` },
      });
      if (!response.ok) throw new Error("Unable to load Unsplash images.");
      const data = (await response.json()) as { results: UnsplashPhoto[] };
      setUnsplashPhotos(data.results);
    } catch (error) {
      setUnsplashError(error instanceof Error ? error.message : "Unable to load Unsplash images.");
    } finally {
      setUnsplashLoading(false);
    }
  };

  const addFile = async (file: File) => {
    setUploading(true);
    setUrlError(null);
    try {
      add(newImage(await prepareImage(file)));
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="panel-content">
      {/* No panel header — the panel starts directly with its content. */}
      <div className="panel-intro">Drop in visual building blocks for your slide.</div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-3 py-3 text-xs font-semibold text-card-foreground transition-colors hover:bg-accent">
        <ImagePlus className="size-4" /> {uploading ? "Preparing image…" : "Upload image"}
        <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => {
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
          Icon={Camera}
          label="Unsplash"
          active={section === "unsplash"}
          onClick={() => setSection(section === "unsplash" ? null : "unsplash")}
        />
      </div>

      {section === "shapes" && <ShapesPanel embedded />}

      {section === "unsplash" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
            <Search className="size-4" />
            <input
              value={unsplashQuery}
              onChange={(event) => setUnsplashQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) void searchUnsplash();
              }}
              placeholder="Search Unsplash"
              aria-label="Search Unsplash"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
            <button type="button" onClick={() => void searchUnsplash()} disabled={unsplashLoading} className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-60" aria-label="Search Unsplash">
              {unsplashLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            </button>
          </label>
          {unsplashError && <p className="px-1 text-[10px] font-medium text-rose-500">{unsplashError}</p>}
          <div className="grid grid-cols-2 gap-2">
            {unsplashPhotos.map((photo) => (
              <button key={photo.id} type="button" onClick={() => add(newImage(photo.urls.regular))} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100" title={`Add photo by ${photo.user.name}`}>
                <img src={photo.urls.small} alt={photo.alt_description || `Unsplash photo by ${photo.user.name}`} className="size-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-slate-950/60 px-1.5 py-1 text-left text-[8px] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">{photo.user.name}</span>
              </button>
            ))}
          </div>
          {unsplashPhotos.length === 0 && !unsplashLoading && <p className="py-3 text-center text-[10px] text-slate-400">Search for a photo to add to your slide.</p>}
          <p className="text-[9px] text-slate-400">Photos by Unsplash creators. Click an image to add it.</p>
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
                className="group flex h-20 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:text-blue-600 hover:shadow-[0_8px_18px_-6px_rgba(15,23,42,0.15)] active:translate-y-0 active:scale-[0.97]"
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
