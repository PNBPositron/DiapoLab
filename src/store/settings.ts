import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeTokens } from "@/lib/themes";

export type PanelId =
  | "home"
  | "text"
  | "components"
  | "elements"
  | "library"
  | "media"
  | "design"
  | "layers"
  | "my-designs";

export const PANEL_LABELS: Record<PanelId, string> = {
  home: "Home",
  text: "Text",
  components: "Components",
  elements: "Shapes",
  library: "Library",
  media: "Media",
  design: "Design",
  layers: "Layers",
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
  /** when true, the kit cannot be edited (protected against accidents) */
  locked?: boolean;
};

export type CustomFont = { id: string; name: string; dataUrl: string };

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary: "#2b6bff",
  secondary: "#7df9ff",
  accent: "#ff0080",
  bg: "#0a0f1f",
  text: "#ffffff",
  headingFont: "Archivo Black",
  bodyFont: "Inter",
};

export type TextStyle = { fontFamily: string; fontSize: number; fontWeight: number; color: string };

export const DEFAULT_TEXT_STYLES: Record<"title" | "subtitle" | "body", TextStyle> = {
  title: { fontFamily: "Archivo Black", fontSize: 72, fontWeight: 900, color: "#0a0f1f" },
  subtitle: { fontFamily: "Inter", fontSize: 40, fontWeight: 600, color: "#1e293b" },
  body: { fontFamily: "Inter", fontSize: 24, fontWeight: 400, color: "#334155" },
};

export type TransitionSoundStyle = "whoosh" | "click";

export type WorkspaceBgId =
  | "clean"
  | "aurora"
  | "warm-paper"
  | "sage-mist"
  | "custom-color"
  | "custom-image";

export const DEFAULT_WORKSPACE_BG: WorkspaceBgId = "clean";

type SettingsState = {
  autoHidePanel: boolean;
  editorTheme: string;
  panels: Record<PanelId, boolean>;
  panelDurationMs: number;
  panelStiffness: number;
  reduceMotion: boolean;
  transitionSound: boolean;
  transitionSoundStyle: TransitionSoundStyle;
  editorDark: boolean;
  workspaceBg: WorkspaceBgId;
  workspaceBgColor: string;
  workspaceBgImage: string | null;
  a11yCheck: boolean;
  canvasGrid: boolean;
  presentHideHud: boolean;
  presentHide3dButton: boolean;
  presentAutoHideHud: boolean;
  presentHideInk: boolean;
  presentHideSlideCounter: boolean;
  textStyles: Record<"title" | "subtitle" | "body", TextStyle>;
  brandKit: BrandKit;
  appAccent: string;
  customFonts: CustomFont[];
  customThemes: CustomTheme[];
  addCustomFont: (f: CustomFont) => void;
  removeCustomFont: (id: string) => void;
  addCustomTheme: (t: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  setBrandKit: (patch: Partial<BrandKit>) => void;
  setAppAccent: (value: string) => void;
  resetBrandKit: () => void;
  setAutoHidePanel: (v: boolean) => void;
  setEditorTheme: (v: string) => void;
  setPanelDurationMs: (v: number) => void;
  setPanelStiffness: (v: number) => void;
  setReduceMotion: (v: number | boolean) => void;
  setTransitionSound: (v: boolean) => void;
  setTransitionSoundStyle: (v: TransitionSoundStyle) => void;
  setEditorDark: (v: boolean) => void;
  setWorkspaceBg: (id: WorkspaceBgId) => void;
  setWorkspaceBgColor: (color: string) => void;
  setWorkspaceBgImage: (dataUrl: string | null) => void;
  resetWorkspaceBg: () => void;
  setA11yCheck: (v: boolean) => void;
  setCanvasGrid: (v: boolean) => void;
  toggleCanvasGrid: () => void;
  setPresentHideHud: (v: boolean) => void;
  setPresentHide3dButton: (v: boolean) => void;
  setPresentAutoHideHud: (v: boolean) => void;
  setPresentHideInk: (v: boolean) => void;
  setPresentHideSlideCounter: (v: boolean) => void;
  setTextStyle: (role: "title" | "subtitle" | "body", patch: Partial<TextStyle>) => void;
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
  media: true,
  design: true,
  layers: true,
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
      transitionSound: true,
      transitionSoundStyle: "whoosh",
      editorDark: false,
      workspaceBg: DEFAULT_WORKSPACE_BG,
      workspaceBgColor: "#e8eef7",
      workspaceBgImage: null,
      a11yCheck: false,
      canvasGrid: false,
      presentHideHud: false,
      presentHide3dButton: false,
      presentAutoHideHud: false,
      presentHideInk: false,
      presentHideSlideCounter: false,
      textStyles: { ...DEFAULT_TEXT_STYLES },
      brandKit: { ...DEFAULT_BRAND_KIT },
      appAccent: "#4f46e5",
      customThemes: [],
      customFonts: [],
      addCustomFont: (f) =>
        set((s) => ({ customFonts: [...s.customFonts.filter((x) => x.id !== f.id), f] })),
      removeCustomFont: (id) =>
        set((s) => ({ customFonts: s.customFonts.filter((x) => x.id !== id) })),
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
      setReduceMotion: (reduceMotion) => set({ reduceMotion: Boolean(reduceMotion) }),
      setTransitionSound: (transitionSound) => set({ transitionSound }),
      setTransitionSoundStyle: (transitionSoundStyle) => set({ transitionSoundStyle }),
      setEditorDark: (editorDark) => set({ editorDark }),
      setWorkspaceBg: (workspaceBg) => set({ workspaceBg }),
      setWorkspaceBgColor: (workspaceBgColor) =>
        set({ workspaceBgColor, workspaceBg: "custom-color" }),
      setWorkspaceBgImage: (workspaceBgImage) =>
        set((s) => ({
          workspaceBgImage,
          workspaceBg: workspaceBgImage
            ? "custom-image"
            : s.workspaceBg === "custom-image"
              ? DEFAULT_WORKSPACE_BG
              : s.workspaceBg,
        })),
      resetWorkspaceBg: () => set({ workspaceBg: DEFAULT_WORKSPACE_BG }),
      setA11yCheck: (a11yCheck) => set({ a11yCheck }),
      setCanvasGrid: (canvasGrid) => set({ canvasGrid }),
      toggleCanvasGrid: () => set((s) => ({ canvasGrid: !s.canvasGrid })),
      setPresentHideHud: (presentHideHud) => set({ presentHideHud }),
      setPresentHide3dButton: (presentHide3dButton) => set({ presentHide3dButton }),
      setPresentAutoHideHud: (presentAutoHideHud) => set({ presentAutoHideHud }),
      setPresentHideInk: (presentHideInk) => set({ presentHideInk }),
      setPresentHideSlideCounter: (presentHideSlideCounter) => set({ presentHideSlideCounter }),
      setTextStyle: (role, patch) =>
        set((s) => ({ textStyles: { ...s.textStyles, [role]: { ...s.textStyles[role], ...patch } } })),
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
      version: 14,
      skipHydration: true,
      migrate: (state) => {
        const previous = state as SettingsState;
        // Unsplash + Illustrations merged into the Library panel — carry the
        // old visibility flags over so the rail button stays visible.
        const prevPanels = (previous?.panels ?? {}) as Record<string, boolean | undefined>;
        const panels = { ...prevPanels } as Record<PanelId, boolean>;
        delete (panels as Record<string, boolean | undefined>).unsplash;
        delete (panels as Record<string, boolean | undefined>).illustrations;
        delete (panels as Record<string, boolean | undefined>).plugins;
        if (panels.library === undefined) panels.library = prevPanels.unsplash ?? prevPanels.illustrations ?? true;
        if (panels.media === undefined) panels.media = true;
        if (panels.layers === undefined) panels.layers = true;
        const prevBg = previous?.workspaceBg as string | undefined;
        const validBgs: WorkspaceBgId[] = ["clean", "aurora", "warm-paper", "sage-mist", "custom-color", "custom-image"];
        const workspaceBg: WorkspaceBgId =
          prevBg && validBgs.includes(prevBg as WorkspaceBgId)
            ? (prevBg as WorkspaceBgId)
            : DEFAULT_WORKSPACE_BG;
        return {
          ...previous,
          customFonts: previous?.customFonts ?? [],
          panels,
          customThemes: previous?.customThemes ?? [],
          // Editor chrome is intentionally light; reset removed dark and legacy values.
          editorTheme: DEFAULT_EDITOR_THEME,
          reduceMotion: true,
          transitionSound: previous?.transitionSound ?? true,
          transitionSoundStyle: previous?.transitionSoundStyle ?? "whoosh",
          editorDark: previous?.editorDark ?? false,
          workspaceBg,
          workspaceBgColor: previous?.workspaceBgColor ?? "#e8eef7",
          workspaceBgImage: previous?.workspaceBgImage ?? null,
          a11yCheck: previous?.a11yCheck ?? false,
          canvasGrid: previous?.canvasGrid ?? false,
          presentHideHud: previous?.presentHideHud ?? false,
          presentHide3dButton: previous?.presentHide3dButton ?? false,
          presentAutoHideHud: previous?.presentAutoHideHud ?? false,
          presentHideInk: previous?.presentHideInk ?? false,
          presentHideSlideCounter: previous?.presentHideSlideCounter ?? false,
          textStyles: previous?.textStyles ?? { ...DEFAULT_TEXT_STYLES },
          brandKit: { ...DEFAULT_BRAND_KIT, ...(previous?.brandKit ?? {}) },
        };
      },
    },
  ),
);
