import type { CSSProperties } from "react";

export function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isDarkColor(hex: string): boolean {
  const rgb = parseHexRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.36;
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export const BAR_COLOR_PRESETS: Array<{ label: string; value: string | null }> = [
  { label: "Auto", value: null },
  { label: "Pure White", value: "#ffffff" },
  { label: "Frost Slate", value: "#f1f5f9" },
  { label: "Sky Mist", value: "#e0f2fe" },
  { label: "Lavender", value: "#ede9fe" },
  { label: "Mint", value: "#d1fae5" },
  { label: "Warm Sand", value: "#fef3c7" },
  { label: "Rose", value: "#ffe4e6" },
  { label: "Deep Slate", value: "#1e293b" },
  { label: "Obsidian", value: "#0f172a" },
  { label: "Midnight Blue", value: "#172554" },
];

export function getBarChromeProps(
  barColor: string | null,
  editorDark: boolean,
  barLiquidGlass: boolean,
): {
  className: string;
  style: CSSProperties;
  isBarDark: boolean;
} {
  const effectiveBg = barColor ?? (editorDark ? "#101a2e" : "#ffffff");
  const isBarDark = barColor ? isDarkColor(barColor) : editorDark;

  const classes: string[] = [];
  if (barLiquidGlass) classes.push("editor-liquid-glass");
  if (barColor) classes.push("editor-bar-tinted");
  if (isBarDark) classes.push("editor-bar-dark");

  const solidBg = effectiveBg;
  const glassBg = rgbaFromHex(effectiveBg, isBarDark ? 0.64 : 0.68);
  const panelGlassBg = rgbaFromHex(effectiveBg, isBarDark ? 0.72 : 0.76);
  const borderCol = barColor
    ? isBarDark
      ? "rgba(255, 255, 255, 0.16)"
      : "rgba(15, 23, 42, 0.12)"
    : editorDark
      ? "rgba(148, 163, 184, 0.22)"
      : "#e2e8f0";

  const fgCol = isBarDark ? "#f1f5f9" : "#0f172a";
  const mutedCol = isBarDark ? "#cbd5e1" : "#475569";
  const hoverBg = isBarDark ? "rgba(255, 255, 255, 0.11)" : "rgba(15, 23, 42, 0.06)";
  const inputBg = isBarDark ? "rgba(15, 23, 42, 0.52)" : "rgba(248, 250, 252, 0.78)";

  const style: CSSProperties = {
    "--editor-bar-bg": solidBg,
    "--editor-bar-glass-bg": glassBg,
    "--editor-bar-panel-glass-bg": panelGlassBg,
    "--editor-bar-fg": fgCol,
    "--editor-bar-muted": mutedCol,
    "--editor-bar-border": borderCol,
    "--editor-bar-hover": hoverBg,
    "--editor-bar-input-bg": inputBg,
  } as CSSProperties;

  if (barColor) {
    Object.assign(style, {
      "--selector-surface": barLiquidGlass ? panelGlassBg : solidBg,
      "--selector-muted": inputBg,
      "--selector-ink": fgCol,
      "--selector-subtle": mutedCol,
      "--selector-border": borderCol,
      "--selector-accent": isBarDark ? "#60a5fa" : "#2563eb",
      "--selector-active": isBarDark ? "rgba(37, 99, 235, 0.25)" : "#eff6ff",
    });
  }

  return {
    className: classes.join(" "),
    style,
    isBarDark,
  };
}
