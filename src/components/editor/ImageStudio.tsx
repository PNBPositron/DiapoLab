// Image Studio — a real advanced image editor (layers, selections, masks,
// filters, text, retouch…) powered by PhotoSplice (photosplice.com/web),
// embedded in a dialog.
//
// PhotoSplice's web build exposes no embed/postMessage API (unlike Photopea):
//  - the iframe simply loads https://photosplice.com/web
//  - the user opens an image with File → Open inside PhotoSplice, edits it,
//    then saves it (File → Save As) — the file lands in their Downloads
//  - "Importer le résultat" picks that saved file and drops it on the canvas
//    as a new element (format detected from the file's magic bytes)
//  - a postMessage listener is kept anyway, in case PhotoSplice ships an
//    embed API later

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { newImage, useEditor } from "@/store/editor";
import { ExternalLink, ImageDown, Loader2, WandSparkles } from "lucide-react";

const PHOTOSPLICE_WEB = "https://photosplice.com/web";

/** Detect the image MIME type from magic bytes (png/jpg/webp/gif; psd refused). */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  return null; // PSD or unknown — can't go on a slide
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function ImageStudioDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useEditor((s) => s.add);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const importBytes = (buffer: ArrayBuffer) => {
    const mime = sniffMime(new Uint8Array(buffer.slice(0, 12)));
    if (!mime) {
      setStatus("Format non pris en charge — exportez en PNG ou JPG dans PhotoSplice (File → Save As).");
      return;
    }
    try {
      const dataUrl = arrayBufferToDataUrl(buffer, mime);
      add(newImage(dataUrl, { width: 960, height: 540 }));
      setStatus("✓ Image importée sur le canvas");
    } catch {
      setStatus("Échec de l'import — réessayez.");
    }
  };

  const onPickResult = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setStatus("Import en cours…");
    try {
      importBytes(await file.arrayBuffer());
    } catch {
      setStatus("Impossible de lire ce fichier.");
    }
  };

  // Kept for forward-compatibility: if PhotoSplice ever posts images back
  // to the parent (like Photopea's saveToOE), they land on the canvas.
  useEffect(() => {
    if (!open) return;
    const onMessage = async (event: MessageEvent) => {
      if (!event.origin || !event.origin.includes("photosplice.com")) return;
      const data = event.data;
      try {
        if (data instanceof ArrayBuffer) {
          importBytes(data);
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          importBytes(await data.arrayBuffer());
        } else if (data && typeof data === "object") {
          const obj = data as { type?: string; data?: unknown };
          if (obj.type === "image" || obj.type === "file") {
            if (obj.data instanceof ArrayBuffer) importBytes(obj.data);
            else if (typeof obj.data === "string" && obj.data.startsWith("data:")) {
              add(newImage(obj.data, { width: 960, height: 540 }));
              setStatus("✓ Image importée sur le canvas");
            }
          }
        }
      } catch {
        setStatus("Échec de l'import de l'image.");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setStatus(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 border-slate-200 bg-white p-0 text-slate-900 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-800">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white">
              <WandSparkles className="size-3.5" />
            </span>
            Image Studio
            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              PhotoSplice
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(PHOTOSPLICE_WEB, "_blank", "noopener")}
              title="Ouvrir PhotoSplice dans un onglet (utile si l'intégration est bloquée)"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-sky-500 hover:text-sky-700"
            >
              <ExternalLink className="size-3" /> Ouvrir dans un onglet
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Choisir le fichier enregistré par PhotoSplice (File → Save As) et l'ajouter à la slide"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md transition hover:brightness-110"
            >
              <ImageDown className="size-3.5" /> Importer le résultat
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={onPickResult}
            />
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden bg-slate-100">
          <iframe
            ref={iframeRef}
            src={PHOTOSPLICE_WEB}
            title="PhotoSplice — éditeur d'image avancé"
            allow="clipboard-read; clipboard-write; fullscreen"
            onLoad={() => setLoaded(true)}
            className="h-full w-full border-0 bg-white"
          />
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center bg-white">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-xs">Chargement de PhotoSplice…</p>
                <p className="max-w-[420px] text-center text-[10px] leading-relaxed text-slate-400">
                  Édition avancée : calques, sélections, masques, filtres, texte, retouche.
                  Ouvrez votre image via File → Open, puis, une fois modifiée, enregistrez-la
                  (File → Save As) et cliquez sur « Importer le résultat » pour l'ajouter à la slide.
                </p>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-center text-[11px] font-medium text-slate-600">
            {status}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
