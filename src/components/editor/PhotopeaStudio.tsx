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

/** Mini logo Photopea — « P » stylisé sur fond dégradé teal, à la marque. */
export function PhotopeaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pp-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="6" fill="url(#pp-grad)" />
      <path
        d="M9 18.2V6h4.3c2.1 0 3.5 1.4 3.5 3.3 0 2-1.4 3.4-3.5 3.4h-2.2"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11.1" cy="16.4" r="1.35" fill="#fff" />
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
