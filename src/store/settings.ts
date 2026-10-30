import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeTokens } from "@/lib/themes";

export type PanelId =
  | "home"
  | "text"
  | "components"
  | "elements"
  | "library"
  | "design"
  | "plugins"
  | "my-designs";

export const PANEL_LABELS: Record<PanelId, string> = {
  home: "Home",
  text: "Text",
  components: "Components",
  elements: "Elements",
  library: "Library",
  design: "Design",
  plugins: "Plugins",
  "my-designs": "Projects",
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
  panelStiffness: number;
  reduceMotion: boolean;
  brandKit: BrandKit;
  appAccent: string;
  customThemes: CustomTheme[];
  addCustomTheme: (t: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  setBrandKit: (patch: Partial<BrandKit>) => void;
  setAppAccent: (value: string) => void;
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

export const springEasing = (stiffness: number) => {
  const k = Math.max(0, Math.min(100, stiffness)) / 100;
  return `cubic-bezier(0.16, ${(1 + k * 0.85).toFixed(3)}, ${(0.4 - k * 0.15).toFixed(3)}, 1)`;
};

export type CustomTheme = { id: string; name: string; tokens: ThemeTokens };

export const EDITOR_THEMES: Array<{ id: string; label: string; hint: string }> = [
  { id: "everest", label: "Light", hint: "bright editor chrome" },
];

// Everest is a fixed light palette. It deliberately does not depend on slide colors.
export const DEFAULT_EDITOR_THEME = "everest";

const ALL_ON: Record<PanelId, boolean> = {
  home: true,
  text: true,
  components: true,
  elements: true,
  library: true,
  design: true,
  plugins: true,
  "my-designs": true,
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
      appAccent: "#4f46e5",
      customThemes: [],
      addCustomTheme: (t) =>
        set((s) => ({ customThemes: [...s.customThemes.filter((x) => x.id !== t.id), t] })),
      removeCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((x) => x.id !== id),
          editorTheme: s.editorTheme === `custom:${id}` ? DEFAULT_EDITOR_THEME : s.editorTheme,
        })),
      setBrandKit: (patch) => set((s) => ({ brandKit: { ...s.brandKit, ...patch } })),
      setAppAccent: (appAccent) => set({ appAccent }),
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
          if (!Object.values(next).some(Boolean)) return s;
          return { panels: next };
        }),
      resetPanels: () => set({ panels: { ...ALL_ON } }),
    }),
    {
      name: "positron.settings",
      version: 7,
      migrate: (state) => {
        const previous = state as SettingsState;
        const previousTheme = previous?.editorTheme;
        // Unsplash + Illustrations merged into the Library panel — carry the
        // old visibility flags over so the rail button stays visible.
        const prevPanels = (previous?.panels ?? {}) as Record<string, boolean | undefined>;
        const panels = { ...prevPanels } as Record<PanelId, boolean>;
        delete (panels as Record<string, boolean | undefined>).unsplash;
        delete (panels as Record<string, boolean | undefined>).illustrations;
        if (panels.library === undefined) panels.library = prevPanels.unsplash ?? prevPanels.illustrations ?? true;
        return {
          ...previous,
          panels,
          customThemes: previous?.customThemes ?? [],
          // Editor chrome is intentionally light; reset removed dark and legacy values.
          editorTheme: DEFAULT_EDITOR_THEME,
          reduceMotion: true,
          brandKit: { ...DEFAULT_BRAND_KIT, ...(previous?.brandKit ?? {}) },
        };
      },
    },
  ),
);
