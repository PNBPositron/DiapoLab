// Image Studio — a real advanced image editor (layers, selections, masks,
// filters, text, retouch…) powered by Photopea, embedded in a dialog.
//
// Integration via the official Photopea postMessage API:
//  - sending a string (image URL) to the iframe opens that image
//  - sending a JS command string executes it in Photopea
//  - `app.activeDocument.saveToOE('PNG')` posts back {type:"image", data:ArrayBuffer}
//    which we convert to a data URL and drop on the canvas as a new image.

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { newImage, useEditor } from "@/store/editor";
import { ImageDown, Loader2, WandSparkles, RefreshCw, X } from "lucide-react";

function arrayBufferToDataUrl(buffer: ArrayBuffer, mime = "image/png"): string {
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
  const selectedId = useEditor((s) => s.selectedId);
  const elements = useEditor((s) => s.elements);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const selected = elements.find((e) => e.id === selectedId);
  const selectedImage =
    selected?.type === "image" && /^https?:\/\//i.test(selected.src ?? "")
      ? (selected as { src: string }).src
      : null;
  // The hash preloads the image: https://www.photopea.com#<image-url>
  const studioSrc = selectedImage
    ? `https://www.photopea.com#${selectedImage}`
    : "https://www.photopea.com";

  const post = (message: string) => {
    const win = iframeRef.current?.contentWindow;
    if (win) win.postMessage(message, "*");
  };

  const openSelectedInStudio = () => {
    if (!selectedImage) return;
    // Reload the iframe with the image in the URL hash.
    setLoaded(false);
    if (iframeRef.current) iframeRef.current.src = studioSrc;
  };

  const importToCanvas = () => {
    setStatus("Exporting from Photopea…");
    post("app.activeDocument.saveToOE('PNG');");
  };

  useEffect(() => {
    if (!open) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; data?: unknown } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "image" && data.data instanceof ArrayBuffer) {
        try {
          const dataUrl = arrayBufferToDataUrl(data.data);
          add(newImage(dataUrl, { width: 960, height: 540 }));
          setStatus("✓ Image added to the canvas");
        } catch {
          setStatus("Could not import the image — try File → Save As in Photopea.");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, add]);

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setStatus(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col gap-0 border-slate-800 bg-slate-950 p-0 text-slate-100">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 px-5 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-100">
            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white">
              <WandSparkles className="size-3.5" />
            </span>
            Image Studio
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Photopea
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            {selectedImage ? (
              <button
                type="button"
                onClick={openSelectedInStudio}
                title="Reload Photopea with the image selected on the slide"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500"
              >
                <RefreshCw className="size-3" /> Open selected image
              </button>
            ) : (
              <span className="max-w-[320px] truncate text-[10px] text-slate-500">
                Tip: select an image on the slide before opening the studio to preload it
              </span>
            )}
            <button
              type="button"
              onClick={importToCanvas}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110"
            >
              <ImageDown className="size-3.5" /> Import to canvas
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close image studio"
              className="grid size-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden bg-slate-900">
          <iframe
            ref={iframeRef}
            src={studioSrc}
            title="Photopea — advanced image editor"
            allow="clipboard-read; clipboard-write; fullscreen"
            onLoad={() => setLoaded(true)}
            className="h-full w-full border-0"
          />
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-xs">Loading Photopea…</p>
                <p className="max-w-[420px] text-center text-[10px] leading-relaxed text-slate-500">
                  Advanced editing with layers, selections, masks, filters, text and
                  retouch tools. Requires an internet connection.
                </p>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className="border-t border-slate-800 bg-slate-900 px-5 py-2 text-center text-[11px] font-medium text-slate-300">
            {status}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
