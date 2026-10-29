// Photopea — éditeur d'images intégré, propulsé par l'API Live Messaging
// de Photopea (https://www.photopea.com/api/live).
//
// L'application Photopea complète tourne dans une iframe et dialogue avec
// DiapoLab via postMessage :
//   * on lui envoie des scripts (String) — ex. app.activeDocument.saveToOE("png")
//   * elle renvoie "done" quand elle est prête / après chaque script,
//     puis un ArrayBuffer (PNG) pour saveToOE
// Deux actions dans le pied de dialogue : insérer le PNG aplati sur la
// diapo courante, ou le télécharger localement. L'ouverture / création de
// documents se fait directement dans Photopea (menu Fichier).

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { newImage, useEditor } from "@/store/editor";
import { Download, ExternalLink, ImageDown, Loader2 } from "lucide-react";
import { TrafficLights } from "./ui/TrafficLights";

// Photopea suit par défaut la langue du navigateur ; on force l'interface en
// anglais via le paramètre d'environnement de son API.
const PHOTOPEA_SRC = `https://www.photopea.com/#${encodeURIComponent(
  JSON.stringify({ environment: { lang: "en" } }),
)}`;

/** Logo Photopea — spirale blanche effilée (2,5 tours) sur carré sarcelle
 *  #17A2B8 aux coins arrondis (~1/5 du côté), d'après l'icône fournie. */
export function PhotopeaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="0" y="0" width="24" height="24" rx="4.8" fill="#17A2B8" />
      <path
        d="M12 23.3 L11.2 23.22 L10.41 23.09 L9.63 22.9 L8.87 22.65 L8.14 22.36 L7.43 22.01 L6.75 21.62 L6.1 21.18 L5.49 20.69 L4.92 20.17 L4.39 19.61 L3.9 19.02 L3.46 18.39 L3.07 17.74 L2.73 17.06 L2.43 16.37 L2.19 15.66 L2 14.94 L1.87 14.2 L1.78 13.47 L1.75 12.73 L1.78 12 L1.85 11.27 L1.98 10.56 L2.15 9.86 L2.38 9.18 L2.65 8.51 L2.97 7.88 L3.33 7.27 L3.73 6.69 L4.17 6.14 L4.64 5.63 L5.15 5.15 L5.69 4.72 L6.26 4.33 L6.84 3.98 L7.45 3.67 L8.08 3.41 L8.72 3.2 L9.37 3.04 L10.02 2.92 L10.68 2.85 L11.34 2.83 L12 2.86 L12.65 2.93 L13.29 3.05 L13.91 3.21 L14.52 3.41 L15.11 3.66 L15.68 3.95 L16.22 4.27 L16.73 4.64 L17.22 5.03 L17.67 5.46 L18.09 5.91 L18.47 6.4 L18.81 6.9 L19.12 7.43 L19.38 7.97 L19.61 8.53 L19.79 9.1 L19.93 9.67 L20.03 10.25 L20.08 10.84 L20.1 11.42 L20.07 12 L20 12.57 L19.89 13.13 L19.74 13.68 L19.55 14.22 L19.33 14.73 L19.07 15.23 L18.78 15.7 L18.46 16.15 L18.11 16.57 L17.73 16.96 L17.32 17.32 L16.9 17.65 L16.45 17.95 L15.99 18.21 L15.51 18.44 L15.03 18.63 L14.53 18.78 L14.02 18.89 L13.52 18.97 L13.01 19.02 L12.5 19.02 L12 18.99 L11.5 18.92 L11.02 18.82 L10.55 18.69 L10.09 18.52 L9.64 18.32 L9.22 18.09 L8.81 17.83 L8.43 17.55 L8.08 17.24 L7.74 16.91 L7.44 16.56 L7.16 16.19 L6.91 15.81 L6.7 15.41 L6.51 15 L6.35 14.58 L6.23 14.15 L6.14 13.72 L6.08 13.29 L6.05 12.86 L6.05 12.43 L6.09 12 L6.15 11.58 L6.24 11.17 L6.37 10.77 L6.51 10.39 L6.69 10.02 L6.89 9.67 L7.11 9.33 L7.36 9.02 L7.62 8.72 L7.9 8.45 L8.2 8.2 L8.51 7.98 L8.84 7.78 L9.17 7.6 L9.52 7.46 L9.87 7.33 L10.22 7.24 L10.58 7.17 L10.94 7.13 L11.3 7.12 L11.65 7.13 L12 7.16 L12.34 7.23 L12.67 7.31 L13 7.42 L13.31 7.55 L13.6 7.7 L13.89 7.87 L14.15 8.06 L14.4 8.26 L14.63 8.48 L14.85 8.72 L15.04 8.96 L15.21 9.22 L15.36 9.48 L15.49 9.76 L15.6 10.03 L15.69 10.32 L15.75 10.6 L15.79 10.89 L15.82 11.17 L15.82 11.45 L15.8 11.73 L15.76 12 L15.7 12.26 L15.62 12.52 L15.53 12.77 L15.42 13 L15.29 13.23 L15.15 13.44 L15 13.64 L14.83 13.82 L14.66 13.99 L14.47 14.14 L14.28 14.28 L14.08 14.4 L13.87 14.5 L13.66 14.58 L13.45 14.65 L13.24 14.71 L13.02 14.74 L12.81 14.76 L12.6 14.76 L12.4 14.75 L12.19 14.72 L12 14.68 L11.81 14.62 L11.63 14.56 L11.46 14.48 L11.3 14.38 L11.15 14.28 L11.01 14.17 L10.88 14.05 L10.76 13.92 L10.66 13.79 L10.57 13.66 L10.49 13.51 L10.42 13.37 L10.36 13.22 L10.32 13.08 L10.29 12.93 L10.28 12.79 L10.27 12.65 L10.27 12.51 L10.29 12.37 L10.32 12.24 L10.35 12.12 L10.4 12 L10.45 11.89 L10.51 11.79 L10.58 11.69 L10.65 11.6 L10.73 11.53 L10.81 11.46 L10.89 11.4 L10.98 11.35 L11.07 11.3 L11.16 11.27 L11.25 11.25 L11.34 11.23 L11.42 11.23 L11.5 11.23 L11.58 11.24 L11.66 11.26 L11.73 11.28 L11.8 11.31 L11.86 11.34 L11.91 11.38 L11.96 11.43 L12 11.47 L12 12.53 L12.03 12.49 L12.06 12.44 L12.09 12.4 L12.1 12.36 L12.12 12.31 L12.12 12.27 L12.12 12.23 L12.12 12.18 L12.11 12.14 L12.09 12.11 L12.07 12.07 L12.05 12.04 L12.02 12.02 L11.99 11.99 L11.96 11.98 L11.92 11.96 L11.88 11.96 L11.84 11.95 L11.8 11.96 L11.76 11.97 L11.72 11.98 L11.68 12 L11.65 12.03 L11.61 12.06 L11.58 12.09 L11.55 12.13 L11.52 12.18 L11.5 12.23 L11.49 12.28 L11.48 12.34 L11.47 12.4 L11.47 12.46 L11.48 12.52 L11.49 12.59 L11.51 12.65 L11.54 12.72 L11.57 12.78 L11.61 12.85 L11.66 12.91 L11.72 12.97 L11.78 13.02 L11.85 13.07 L11.92 13.12 L12 13.16 L12.09 13.2 L12.18 13.22 L12.27 13.25 L12.37 13.26 L12.47 13.27 L12.58 13.26 L12.68 13.25 L12.79 13.23 L12.9 13.2 L13.01 13.17 L13.12 13.12 L13.22 13.06 L13.33 12.99 L13.43 12.92 L13.52 12.83 L13.61 12.74 L13.7 12.63 L13.77 12.52 L13.84 12.4 L13.91 12.27 L13.96 12.14 L14 12 L14.04 11.85 L14.06 11.7 L14.07 11.55 L14.07 11.39 L14.06 11.23 L14.03 11.07 L13.99 10.91 L13.94 10.75 L13.88 10.59 L13.8 10.44 L13.71 10.29 L13.61 10.14 L13.5 10 L13.37 9.86 L13.23 9.74 L13.09 9.62 L12.93 9.51 L12.76 9.42 L12.58 9.33 L12.39 9.26 L12.2 9.2 L12 9.15 L11.79 9.12 L11.58 9.11 L11.37 9.11 L11.16 9.12 L10.94 9.15 L10.72 9.2 L10.51 9.27 L10.3 9.35 L10.09 9.45 L9.89 9.56 L9.69 9.69 L9.5 9.84 L9.32 10 L9.16 10.17 L9 10.36 L8.85 10.56 L8.72 10.78 L8.61 11 L8.51 11.24 L8.43 11.49 L8.36 11.74 L8.31 12 L8.28 12.27 L8.27 12.54 L8.28 12.81 L8.31 13.08 L8.37 13.36 L8.44 13.63 L8.53 13.9 L8.64 14.16 L8.77 14.42 L8.92 14.67 L9.09 14.91 L9.28 15.13 L9.49 15.35 L9.72 15.55 L9.96 15.74 L10.21 15.91 L10.48 16.06 L10.77 16.2 L11.06 16.31 L11.37 16.41 L11.68 16.48 L12 16.53 L12.33 16.56 L12.66 16.56 L12.99 16.54 L13.32 16.49 L13.65 16.42 L13.98 16.33 L14.3 16.21 L14.61 16.07 L14.92 15.9 L15.22 15.71 L15.5 15.5 L15.77 15.27 L16.02 15.01 L16.26 14.74 L16.48 14.45 L16.68 14.14 L16.85 13.81 L17.01 13.47 L17.14 13.12 L17.24 12.75 L17.32 12.38 L17.37 12 L17.4 11.61 L17.39 11.22 L17.36 10.83 L17.3 10.44 L17.21 10.06 L17.1 9.67 L16.95 9.3 L16.78 8.93 L16.58 8.57 L16.35 8.23 L16.1 7.9 L15.82 7.59 L15.52 7.3 L15.19 7.03 L14.85 6.78 L14.49 6.56 L14.11 6.36 L13.71 6.18 L13.3 6.04 L12.87 5.92 L12.44 5.84 L12 5.79 L11.55 5.76 L11.1 5.77 L10.65 5.81 L10.21 5.89 L9.76 6 L9.32 6.14 L8.89 6.31 L8.47 6.51 L8.07 6.75 L7.68 7.01 L7.31 7.31 L6.96 7.63 L6.63 7.98 L6.32 8.35 L6.04 8.75 L5.79 9.16 L5.57 9.6 L5.38 10.05 L5.22 10.52 L5.09 11.01 L5 11.5 L4.94 12 L4.92 12.51 L4.94 13.02 L4.99 13.52 L5.08 14.03 L5.21 14.53 L5.37 15.03 L5.57 15.51 L5.81 15.98 L6.07 16.44 L6.38 16.87 L6.71 17.29 L7.08 17.68 L7.47 18.05 L7.89 18.39 L8.34 18.7 L8.81 18.98 L9.31 19.22 L9.82 19.43 L10.35 19.61 L10.89 19.74 L11.44 19.84 M12 19.9 Z"
        fill="#fff"
      />
      <circle cx="12" cy="21.6" r="1.70" fill="#fff" />
      <circle cx="12" cy="12" r="0.53" fill="#fff" />
    </svg>
  );
}

export function PhotopeaStudioDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useEditor((s) => s.add);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const busyRef = useRef(false);
  const modeRef = useRef<"insert" | "download">("insert");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Réception d'un PNG (ArrayBuffer) renvoyé par saveToOE : soit on l'insère
  // sur la diapo, soit on le télécharge — selon le bouton cliqué.
  const receivePng = useCallback(
    (buf: ArrayBuffer) => {
      const blob = new Blob([buf], { type: "image/png" });
      if (modeRef.current === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diapolab-image.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setStatus("✓ PNG téléchargé");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const img = new Image();
        img.onload = () => {
          const s = Math.min(960 / img.naturalWidth, 540 / img.naturalHeight, 1.5);
          add(
            newImage(dataUrl, {
              width: Math.round(img.naturalWidth * s),
              height: Math.round(img.naturalHeight * s),
            }),
          );
          setStatus("✓ Image importée sur le canvas");
        };
        img.onerror = () => setStatus("Impossible de lire l'image renvoyée par Photopea.");
        img.src = dataUrl;
      };
      reader.onerror = () => setStatus("Lecture du PNG impossible.");
      reader.readAsDataURL(blob);
    },
    [add],
  );

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setBusy(false);
    setStatus(null);
    busyRef.current = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (typeof e.data === "string") {
        if (e.data === "done") {
          if (busyRef.current) {
            busyRef.current = false;
            setBusy(false);
          } else {
            setReady(true);
          }
        } else if (e.data.trim()) {
          setStatus(e.data);
        }
        return;
      }
      if (e.data instanceof ArrayBuffer) receivePng(e.data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, receivePng]);

  // Envoie un script Photopea et passe en "busy" jusqu'au "done" correspondant.
  const runScript = (script: string, mode: "insert" | "download") => {
    const wnd = frameRef.current?.contentWindow;
    if (!wnd) return;
    modeRef.current = mode;
    busyRef.current = true;
    setBusy(true);
    setStatus(null);
    wnd.postMessage(script, "*");
    // Filet de sécurité : aucun document ouvert → pas de réponse.
    setTimeout(() => {
      if (busyRef.current) {
        busyRef.current = false;
        setBusy(false);
        setStatus("Aucune image reçue — ouvrez ou créez d'abord un document dans Photopea.");
      }
    }, 8000);
  };

  const insertToSlide = () =>
    runScript('app.activeDocument.saveToOE("png");', "insert");
  const downloadPng = () =>
    runScript('app.activeDocument.saveToOE("png");', "download");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          docked={minimized}
          className={`flex flex-col gap-0 overflow-hidden p-0 ${
            maximized
              ? "h-screen w-screen max-w-none sm:rounded-none"
              : minimized
                ? "sm:rounded-2xl"
                : "h-[92vh] w-[96vw] max-w-[1500px]"
          }`}
        >
        <DialogHeader className={`flex-row items-center justify-between border-slate-200 bg-gradient-to-r from-slate-50 to-white ${minimized ? "gap-2 border-b-0 px-3 py-2" : "border-b px-5 py-3"}`}>
          <TrafficLights
            minimized={minimized}
            maximized={maximized}
            onClose={() => onOpenChange(false)}
            onMinimize={() => setMinimized((m) => !m)}
            onMaximize={() => setMaximized((m) => !m)}
          />
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-800">
            <PhotopeaLogo className="size-7 shrink-0" />
            Photopea
            {!minimized && (
            <a
              href="https://www.photopea.com"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center gap-1 text-[10px] font-normal text-slate-400 transition hover:text-indigo-600"
            >
              photopea.com <ExternalLink className="size-3" />
            </a>
            )}
          </DialogTitle>
          {!minimized && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={insertToSlide}
              disabled={!ready || busy}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:brightness-110 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              <ImageDown className="size-3.5" /> Insérer sur la diapo
            </button>
            <button
              type="button"
              onClick={downloadPng}
              disabled={!ready || busy}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              <Download className="size-3.5" /> Télécharger PNG
            </button>
          </div>
          )}
        </DialogHeader>

        <div className={`relative min-h-0 flex-1 ${minimized ? "hidden" : ""}`}>
          <iframe
            ref={frameRef}
            src={PHOTOPEA_SRC}
            title="Photopea"
            className="h-full w-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
          {!ready && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Loader2 className="size-4 animate-spin text-indigo-500" />
                Connexion à Photopea…
              </div>
            </div>
          )}
        </div>

        {!minimized && busy && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-2 text-[11px] font-medium text-slate-600">
            <Loader2 className="size-3.5 animate-spin text-indigo-500" />
            Export de l'image en cours…
          </div>
        )}
        {!minimized && !busy && status && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-center text-[11px] font-medium text-slate-600">
            {status}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
