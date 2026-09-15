import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeTokens } from "@/lib/themes";

export type PanelId =
  | "home"
  | "text"
  | "components"
  | "elements"
  | "illustrations"
  | "design";

export const PANEL_LABELS: Record<PanelId, string> = {
  home: "Home",
  text: "Text",
  components: "Components",
  elements: "Elements",
  illustrations: "Illus.",
  design: "Design",
};

export type BrandKit = {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  headingFont: string;
  bodyFont: string;
};

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary: "#2b6bff",
  secondary: "#7df9ff",
  accent: "#ff0080",
  bg: "#0a0f1f",
  text: "#ffffff",
  headingFont: "Archivo Black",
  bodyFont: "Inter",
};

type SettingsState = {
  autoHidePanel: boolean;
  editorTheme: string;
  panels: Record<PanelId, boolean>;
  panelDurationMs: number;
  panelStiffness: number; // 0 = soft ease, 100 = springy overshoot
  reduceMotion: boolean; // force-disable panel motion
  brandKit: BrandKit;
  customThemes: CustomTheme[];
  addCustomTheme: (t: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  setBrandKit: (patch: Partial<BrandKit>) => void;
  resetBrandKit: () => void;
  setAutoHidePanel: (v: boolean) => void;
  setEditorTheme: (v: string) => void;
  setPanelDurationMs: (v: number) => void;
  setPanelStiffness: (v: number) => void;
  setReduceMotion: (v: boolean) => void;
  resetMotion: () => void;
  togglePanel: (id: PanelId) => void;
  resetPanels: () => void;
};

export const DEFAULT_PANEL_DURATION = 460;
export const DEFAULT_PANEL_STIFFNESS = 45;

/** maps a 0-100 stiffness to a cubic-bezier with increasing overshoot */
export const springEasing = (stiffness: number) => {
  const k = Math.max(0, Math.min(100, stiffness)) / 100;
  return `cubic-bezier(0.16, ${(1 + k * 0.85).toFixed(3)}, ${(0.4 - k * 0.15).toFixed(3)}, 1)`;
};


export type CustomTheme = { id: string; name: string; tokens: ThemeTokens };

export const EDITOR_THEMES: Array<{ id: string; label: string; hint: string }> = [
  { id: "auto-light", label: "Auto Light", hint: "light chrome · follows slide" },
  { id: "auto-dark", label: "Auto Dark", hint: "dark chrome · follows slide" },
  { id: "auto", label: "Auto", hint: "follows the current slide color" },
  { id: "cyber", label: "Cyber", hint: "teal neon on ink" },
  { id: "everest", label: "Everest", hint: "blue and white light" },
  { id: "glass", label: "Glass", hint: "soft frosted greys" },
  { id: "neobrutalist", label: "Neobrutalist", hint: "paper white + hot accents" },
  { id: "matrix", label: "Matrix", hint: "green terminal" },
  { id: "midnight", label: "Midnight", hint: "deep indigo dark" },
];

export const DEFAULT_EDITOR_THEME = "glass";

const ALL_ON: Record<PanelId, boolean> = {
  home: true,
  text: true,
  components: true,
  elements: true,
  illustrations: true,
  design: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      autoHidePanel: false,
          editorTheme: DEFAULT_EDITOR_THEME,
      panels: { ...ALL_ON },
      panelDurationMs: DEFAULT_PANEL_DURATION,
      panelStiffness: DEFAULT_PANEL_STIFFNESS,
      reduceMotion: true,
      brandKit: { ...DEFAULT_BRAND_KIT },
      customThemes: [],
      addCustomTheme: (t) =>
        set((s) => ({ customThemes: [...s.customThemes.filter((x) => x.id !== t.id), t] })),
      removeCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((x) => x.id !== id),
          editorTheme: s.editorTheme === `custom:${id}` ? DEFAULT_EDITOR_THEME : s.editorTheme,
        })),
      setBrandKit: (patch) => set((s) => ({ brandKit: { ...s.brandKit, ...patch } })),
      resetBrandKit: () => set({ brandKit: { ...DEFAULT_BRAND_KIT } }),
      setAutoHidePanel: (autoHidePanel) => set({ autoHidePanel }),
          setEditorTheme: (editorTheme) => set({ editorTheme }),
      setPanelDurationMs: (panelDurationMs) => set({ panelDurationMs }),
      setPanelStiffness: (panelStiffness) => set({ panelStiffness }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      resetMotion: () =>
        set({
          panelDurationMs: DEFAULT_PANEL_DURATION,
          panelStiffness: DEFAULT_PANEL_STIFFNESS,
          reduceMotion: true,
        }),
      togglePanel: (id) =>
        set((s) => {
          const next = { ...s.panels, [id]: !s.panels[id] };
          // never let the user hide every panel
          if (!Object.values(next).some(Boolean)) return s;
          return { panels: next };
        }),
      resetPanels: () => set({ panels: { ...ALL_ON } }),
    }),
    {
      name: "positron.settings",
      version: 5,
      migrate: (state) => ({
        ...(state as SettingsState),
        customThemes: (state as SettingsState)?.customThemes ?? [],
        editorTheme: DEFAULT_EDITOR_THEME,
        reduceMotion: true,
        brandKit: { ...DEFAULT_BRAND_KIT, ...((state as SettingsState)?.brandKit ?? {}) },
      }),
    },
  ),
);
