import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Camera } from "lucide-react";
import { newImage, useEditor } from "@/store/editor";
import { PanelHeader } from "../ui/selectors";

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string };
  user: { name: string; links: { html: string } };
};

export function UnsplashPanel() {
  const { add, setBgImage } = useEditor();
  const [query, setQuery] = useState("abstract presentation");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searched = useRef(false);

  const search = async (q = query) => {
    const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
    if (!key) {
      setError("Unsplash access key is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q || "abstract presentation")}&per_page=12`, {
        headers: { Authorization: `Client-ID ${key}` },
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        if (response.status === 401) throw new Error("Unsplash rejected the access key. Check the VITE_UNSPLASH_ACCESS_KEY value and restart the preview.");
        throw new Error(`Unsplash request failed (${response.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`);
      }
      const data = (await response.json()) as { results: UnsplashPhoto[] };
      setPhotos(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Unsplash images.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search once on first open so the panel is never empty.
  useEffect(() => {
    if (!searched.current) {
      searched.current = true;
      void search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="panel-content">
      <PanelHeader kicker="Unsplash" title="Photos" description="Free photos from Unsplash creators — click to add, or set as background." icon={Camera} />

      <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
        <Search className="size-4" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) void search();
          }}
          placeholder="Search Unsplash"
          aria-label="Search Unsplash"
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
        <button type="button" onClick={() => void search()} disabled={loading} className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:opacity-60" aria-label="Search Unsplash">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        </button>
      </label>
      {error && <p className="px-1 text-[10px] font-medium text-rose-500">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
            <button type="button" onClick={() => add(newImage(photo.urls.regular))} className="size-full" title={`Add photo by ${photo.user.name}`}>
              <img src={photo.urls.small} alt={photo.alt_description || `Unsplash photo by ${photo.user.name}`} className="size-full object-cover transition duration-300 group-hover:scale-105" />
            </button>
            <button type="button" onClick={() => setBgImage(photo.urls.regular, "cover")} className="absolute inset-x-1 bottom-1 rounded-md bg-slate-950/75 px-1.5 py-1 text-[8px] font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-slate-900 focus-visible:opacity-100" title="Use as slide background">
              Use as background
            </button>
          </div>
        ))}
      </div>
      {photos.length === 0 && !loading && <p className="py-3 text-center text-[10px] text-slate-400">Search for a photo to add to your slide.</p>}
      <p className="text-[9px] text-slate-400">Photos by Unsplash creators. Click an image to add it, or use the button to set it as the slide background.</p>
    </div>
  );
}
