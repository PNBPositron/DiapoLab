import { useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h || "000000", 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function rgbToHsv({ r, g, b }: RGB): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
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
  let rn = 0, gn = 0, bn = 0;
  if (hp < 1) [rn, gn, bn] = [c, x, 0];
  else if (hp < 2) [rn, gn, bn] = [x, c, 0];
  else if (hp < 3) [rn, gn, bn] = [0, c, x];
  else if (hp < 4) [rn, gn, bn] = [0, x, c];
  else if (hp < 5) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  const m = v - c;
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

/**
 * ColorPicker maison — remplace <input type="color"> natif.
 * Zone saturation/valeur + slider de teinte + hex + pipette (EyeDropper API).
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(safeHex)));
  const [hexDraft, setHexDraft] = useState(safeHex);
  const svRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Sync quand la valeur change de l'extérieur
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(rgbToHsv(hexToRgb(value)));
      setHexDraft(value);
    }
  }, [value]);

  const emit = (h: number, s: number, v: number) => {
    setHsv({ h, s, v });
    const hex = rgbToHex(hsvToRgb(h, s, v));
    setHexDraft(hex);
    onChange(hex);
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
  };

  const pickWithEyedropper = async () => {
    const EyeDropper = (window as any).EyeDropper;
    if (!EyeDropper) return;
    try {
      const res = await new EyeDropper().open();
      if (res?.sRGBHex) onChange(res.sRGBHex);
    } catch {
      /* utilisateur a annulé */
    }
  };

  const hasEyedropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="space-y-2.5">
      {/* Zone saturation / valeur */}
      <div
        ref={svRef}
        onPointerDown={onSvDown}
        onPointerMove={onSvMove}
        onPointerUp={onSvUp}
        onPointerCancel={onSvUp}
        className="relative h-24 w-full cursor-crosshair touch-none rounded-xl border border-slate-200"
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
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      />

      {/* Hex + pipette */}
      <div className="flex items-center gap-2">
        <div
          className="size-7 shrink-0 rounded-lg border border-slate-200"
          style={{ background: safeHex }}
        />
        <input
          value={hexDraft}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
            setHexDraft(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
          }}
          spellCheck={false}
          placeholder="#000000"
          className="h-7 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] text-slate-800 uppercase shadow-2xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
        {hasEyedropper && (
          <button
            onClick={pickWithEyedropper}
            title="Pick color from screen"
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-2xs transition hover:border-sky-400 hover:text-sky-600"
          >
            <Pipette className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
