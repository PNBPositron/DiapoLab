import { useEffect, useRef, useState, type ReactElement } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Pipette } from "lucide-react";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h || "000000", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function rgbToHsv({ r, g, b }: RGB): { h: number; s: number; v: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rn = 0,
    gn = 0,
    bn = 0;
  if (hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  const m = v - c;
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

export const DEFAULT_EDITOR_SWATCHES = [
  "#000000",
  "#ffffff",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#64748b",
];

/* ------- Couleurs récentes (localStorage, partagé par tous les pickers) ------- */
const RECENT_COLORS_KEY = "diapolab.recentColors";
const MAX_RECENT = 10;

function readRecentColors(): string[] {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(RECENT_COLORS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c))
      .map((c) => c.toLowerCase())
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeRecentColors(colors: string[]) {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
  } catch {
    /* stockage indisponible (mode privé, quota…) — on ignore */
  }
}

/**
 * ColorPicker maison — remplace <input type="color"> natif.
 * Zone saturation/valeur + slider de teinte + hex + pipette (EyeDropper API).
 * Slider d'opacité optionnel : ne s'affiche que si `opacity` + `onOpacityChange` sont fournis.
 * Mémorise les 10 dernières couleurs utilisées (localStorage) et les propose en raccourcis.
 */
export function ColorPicker({
  value,
  onChange,
  opacity,
  onOpacityChange,
  dark = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  /** 0..1 — affiche le slider d'opacité si fourni */
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  dark?: boolean;
}) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(safeHex)));
  const [hexDraft, setHexDraft] = useState(safeHex);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [hasEyedropper, setHasEyedropper] = useState(false);
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastEmitted = useRef(safeHex);
  const showOpacity = opacity !== undefined && !!onOpacityChange;

  useEffect(() => {
    setRecentColors(readRecentColors());
    setHasEyedropper("EyeDropper" in window);
  }, []);

  // Sync quand la valeur change de l'extérieur
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(rgbToHsv(hexToRgb(value)));
      setHexDraft(value);
      lastEmitted.current = value;
    }
  }, [value]);

  const recordRecent = (hex: string) => {
    const h = hex.toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(h)) return;
    setRecentColors((prev) => {
      if (prev[0] === h) return prev;
      const next = [h, ...prev.filter((c) => c !== h)].slice(0, MAX_RECENT);
      writeRecentColors(next);
      return next;
    });
  };

  /** Applique un hex complet (swatch récent, hex saisie, pipette) */
  const applyHex = (hex: string) => {
    const h = hex.toLowerCase();
    setHsv(rgbToHsv(hexToRgb(h)));
    setHexDraft(h);
    lastEmitted.current = h;
    onChange(h);
    recordRecent(h);
  };

  const emit = (h: number, s: number, v: number) => {
    setHsv({ h, s, v });
    const hex = rgbToHex(hsvToRgb(h, s, v));
    setHexDraft(hex);
    lastEmitted.current = hex;
    onChange(hex);
  };

  const commitRecent = () => {
    if (!dragging.current) recordRecent(lastEmitted.current);
  };

  const applyFromPointer = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const v = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    emit(hsv.h, s, v);
  };

  const onSvDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    applyFromPointer(e.clientX, e.clientY);
  };
  const onSvMove = (e: React.PointerEvent) => {
    if (dragging.current) applyFromPointer(e.clientX, e.clientY);
  };
  const onSvUp = () => {
    dragging.current = false;
    recordRecent(lastEmitted.current);
  };

  const pickWithEyedropper = async () => {
    const EyeDropperCtor = (
      window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex?: string }> } }
    ).EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const res = await new EyeDropperCtor().open();
      if (res?.sRGBHex) applyHex(res.sRGBHex);
    } catch {
      /* utilisateur a annulé */
    }
  };

  const borderCls = dark ? "border-slate-700" : "border-slate-200";
  const inputBgCls = dark
    ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-sky-400"
    : "border-slate-200 bg-white text-slate-800 focus:border-sky-500";

  return (
    <div className="space-y-2.5">
      {/* Couleurs récentes */}
      {recentColors.length > 0 && (
        <div className="space-y-1.5">
          <div
            className={`text-[10px] font-semibold tracking-wide ${dark ? "text-slate-400" : "text-slate-400"}`}
          >
            Recent colors
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyHex(c)}
                title={c}
                aria-label={`Use recent color ${c}`}
                className={`size-6 rounded-md border shadow-2xs transition hover:border-sky-400 ${borderCls}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Zone saturation / valeur */}
      <div
        ref={svRef}
        onPointerDown={onSvDown}
        onPointerMove={onSvMove}
        onPointerUp={onSvUp}
        onPointerCancel={onSvUp}
        className={`relative h-24 w-full cursor-crosshair touch-none rounded-lg border ${borderCls}`}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.4)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: safeHex,
          }}
        />
      </div>

      {/* Slider de teinte */}
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={(e) => emit(+e.target.value, hsv.s, hsv.v)}
        onPointerUp={commitRecent}
        onKeyUp={commitRecent}
        onBlur={commitRecent}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      />

      {/* Slider d'opacité (optionnel) */}
      {showOpacity && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((opacity ?? 1) * 100)}
            onChange={(e) => onOpacityChange!(Math.round(+e.target.value) / 100)}
            className="h-2.5 w-full min-w-0 flex-1 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
            style={{
              background: `linear-gradient(to right, transparent, ${safeHex})`,
            }}
            title="Opacity"
          />
          <div
            className={`flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] shadow-2xs ${
              dark
                ? "border-slate-700 bg-slate-950 text-slate-200"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span>{Math.round((opacity ?? 1) * 100)}</span>
            <span className="ml-0.5 text-slate-400">%</span>
          </div>
        </div>
      )}

      {/* Hex + pipette */}
      <div className="flex items-center gap-2">
        <div
          className={`size-7 shrink-0 rounded-lg border ${borderCls}`}
          style={{
            background: safeHex,
            opacity: showOpacity ? (opacity ?? 1) : 1,
          }}
        />
        <input
          value={hexDraft}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
            setHexDraft(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) applyHex(v);
          }}
          onBlur={commitRecent}
          spellCheck={false}
          placeholder="#000000"
          className={`h-7 min-w-0 flex-1 rounded-lg border px-2 font-mono text-[11px] shadow-2xs outline-none transition focus:ring-2 focus:ring-sky-500/20 ${inputBgCls}`}
        />
        {hasEyedropper && (
          <button
            type="button"
            onClick={pickWithEyedropper}
            title="Pick color from screen"
            className={`grid size-7 shrink-0 place-items-center rounded-lg border shadow-2xs transition hover:border-sky-400 hover:text-sky-500 ${
              dark
                ? "border-slate-700 bg-slate-950 text-slate-300"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Pipette className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Popover wrapper around the editor ColorPicker + quick swatches.
 * Portals inside the nearest [role="dialog"] when triggered inside a modal so
 * keyboard/hex input focus stays inside Radix Dialog FocusScope.
 */
export function ColorPickerPopover({
  value,
  onChange,
  swatches = DEFAULT_EDITOR_SWATCHES,
  opacity,
  onOpacityChange,
  dark = false,
  align = "center",
  side = "bottom",
  sideOffset = 6,
  children,
}: {
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  dark?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  children: ReactElement;
}) {
  const [dialogContainer, setDialogContainer] = useState<HTMLElement | null>(null);

  const detectDialog = (el: HTMLElement | null) => {
    const dialog = el?.closest('[role="dialog"]') as HTMLElement | null;
    setDialogContainer(dialog);
  };

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        asChild
        onPointerDownCapture={(e) => detectDialog(e.currentTarget as HTMLElement)}
        onClickCapture={(e) => detectDialog(e.currentTarget as HTMLElement)}
      >
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={dialogContainer ?? undefined}>
        <PopoverPrimitive.Content
          data-editor-color-popover=""
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionBoundary={dialogContainer ?? undefined}
          collisionPadding={10}
          className={`pointer-events-auto z-[120] w-60 rounded-xl border p-3 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${
            dark
              ? "border-slate-700 bg-slate-900 text-slate-100"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <ColorPicker
            value={value}
            onChange={onChange}
            opacity={opacity}
            onOpacityChange={onOpacityChange}
            dark={dark}
          />
          {swatches.length > 0 && (
            <div
              className={`mt-2.5 flex flex-wrap gap-1.5 border-t pt-2.5 ${
                dark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              {swatches.map((swatch) => {
                const active = value.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => onChange(swatch)}
                    title={swatch}
                    aria-label={`Select color ${swatch}`}
                    className={`size-5 rounded-full border transition ${
                      dark ? "border-slate-700" : "border-slate-200/80"
                    } ${active ? "ring-2 ring-sky-500 ring-offset-1" : "hover:border-slate-400"}`}
                    style={{ backgroundColor: swatch }}
                  />
                );
              })}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
