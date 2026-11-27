export type ThreeScenePreset =
  | "studio"
  | "minimal"
  | "nebula"
  | "grid"
  | "horizon"
  | "aurora"
  | "monolith"
  | "prism"
  | "orbit"
  | "void";

export type ThreeSceneConfig = {
  scenePreset: ThreeScenePreset;
  bgColor: string;
  accentColor: string;
  frameColor: string;
  floorColor: string;
  showFloor: boolean;
  showParticles: boolean;
  duration: number;
};

export type ThreeScenePresetMeta = {
  id: ThreeScenePreset;
  label: string;
  description: string;
  config: ThreeSceneConfig;
};

export const THREE_SCENE_PRESETS: ThreeScenePresetMeta[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Dark architectural stage & pedestal",
    config: {
      scenePreset: "studio",
      bgColor: "#090d16",
      accentColor: "#3b82f6",
      frameColor: "#3b475d",
      floorColor: "#131c2e",
      showFloor: true,
      showParticles: true,
      duration: 1.25,
    },
  },
  {
    id: "minimal",
    label: "Gallery",
    description: "Bright museum light & silver bezel",
    config: {
      scenePreset: "minimal",
      bgColor: "#edf2f8",
      accentColor: "#2563eb",
      frameColor: "#d5dce6",
      floorColor: "#e2e8f0",
      showFloor: true,
      showParticles: false,
      duration: 1.15,
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Polar night sky with glowing ribbons",
    config: {
      scenePreset: "aurora",
      bgColor: "#04131c",
      accentColor: "#14b8a6",
      frameColor: "#1e3a4c",
      floorColor: "#08202e",
      showFloor: true,
      showParticles: true,
      duration: 1.35,
    },
  },
  {
    id: "monolith",
    label: "Monolith",
    description: "Flanking obsidian pillars & edge light",
    config: {
      scenePreset: "monolith",
      bgColor: "#0b0d12",
      accentColor: "#6366f1",
      frameColor: "#272c38",
      floorColor: "#141822",
      showFloor: true,
      showParticles: true,
      duration: 1.3,
    },
  },
  {
    id: "orbit",
    label: "Astrolabe",
    description: "Counter-rotating precision gyro rings",
    config: {
      scenePreset: "orbit",
      bgColor: "#07101f",
      accentColor: "#38bdf8",
      frameColor: "#334155",
      floorColor: "#0d1b33",
      showFloor: true,
      showParticles: true,
      duration: 1.25,
    },
  },
  {
    id: "grid",
    label: "Cyber Grid",
    description: "Wireframe horizon & hex data pylons",
    config: {
      scenePreset: "grid",
      bgColor: "#050c14",
      accentColor: "#06b6d4",
      frameColor: "#172b3f",
      floorColor: "#081726",
      showFloor: true,
      showParticles: true,
      duration: 1.2,
    },
  },
  {
    id: "horizon",
    label: "Sunset Dunes",
    description: "Sculpted ridge silhouette & amber halo",
    config: {
      scenePreset: "horizon",
      bgColor: "#1a111a",
      accentColor: "#f59e0b",
      frameColor: "#4f373f",
      floorColor: "#291923",
      showFloor: true,
      showParticles: true,
      duration: 1.35,
    },
  },
  {
    id: "prism",
    label: "Prism Atrium",
    description: "Crystal shards in luminous daylight",
    config: {
      scenePreset: "prism",
      bgColor: "#eef2ff",
      accentColor: "#ec4899",
      frameColor: "#cbd5e1",
      floorColor: "#e0e7ff",
      showFloor: true,
      showParticles: true,
      duration: 1.2,
    },
  },
  {
    id: "nebula",
    label: "Nebula",
    description: "Cosmic halo rings & drifting stardust",
    config: {
      scenePreset: "nebula",
      bgColor: "#0c071c",
      accentColor: "#a855f7",
      frameColor: "#352659",
      floorColor: "#170e33",
      showFloor: true,
      showParticles: true,
      duration: 1.35,
    },
  },
  {
    id: "void",
    label: "Pure Void",
    description: "Zero-clutter floating stage",
    config: {
      scenePreset: "void",
      bgColor: "#090d16",
      accentColor: "#60a5fa",
      frameColor: "#1e293b",
      floorColor: "#090d16",
      showFloor: false,
      showParticles: false,
      duration: 1.1,
    },
  },
];

export const DEFAULT_THREE_SCENE: ThreeSceneConfig = THREE_SCENE_PRESETS[0].config;

export const THREE_COLOR_SWATCHES = {
  bg: ["#090d16", "#04131c", "#0c071c", "#1a111a", "#0b0d12", "#edf2f8", "#eef2ff", "#fef3c7"],
  accent: ["#3b82f6", "#06b6d4", "#14b8a6", "#a855f7", "#ec4899", "#f59e0b", "#6366f1", "#ffffff"],
  frame: ["#3b475d", "#1e293b", "#272c38", "#352659", "#4f373f", "#94a3b8", "#d5dce6", "#f8fafc"],
  floor: ["#131c2e", "#08202e", "#170e33", "#291923", "#141822", "#cbd5e1", "#e0e7ff", "#f1f5f9"],
};

export const CURATED_COLOR_HARMONIES: Array<
  Pick<ThreeSceneConfig, "bgColor" | "accentColor" | "frameColor" | "floorColor">
> = [
  { bgColor: "#06131c", accentColor: "#2dd4bf", frameColor: "#1e3a4c", floorColor: "#0a2230" },
  { bgColor: "#180b1f", accentColor: "#f43f5e", frameColor: "#422040", floorColor: "#29122e" },
  { bgColor: "#0c1424", accentColor: "#fbbf24", frameColor: "#2a354d", floorColor: "#152138" },
  { bgColor: "#f1f5f9", accentColor: "#4f46e5", frameColor: "#cbd5e1", floorColor: "#e2e8f0" },
  { bgColor: "#091710", accentColor: "#34d399", frameColor: "#1d3b2b", floorColor: "#10291c" },
  { bgColor: "#fdf2f8", accentColor: "#db2777", frameColor: "#fbcfe8", floorColor: "#fce7f3" },
  { bgColor: "#0b0f19", accentColor: "#38bdf8", frameColor: "#253147", floorColor: "#121a2b" },
];

export function getPresetSceneConfig(preset: ThreeScenePreset): ThreeSceneConfig {
  return (THREE_SCENE_PRESETS.find((p) => p.id === preset) ?? THREE_SCENE_PRESETS[0]).config;
}

export function resolveThreeScene(
  patch?: Partial<ThreeSceneConfig> | null,
  fallbackLight = false,
): ThreeSceneConfig {
  const base = fallbackLight ? getPresetSceneConfig("minimal") : DEFAULT_THREE_SCENE;
  if (!patch) return { ...base };
  const presetBase = patch.scenePreset ? getPresetSceneConfig(patch.scenePreset) : base;
  return {
    scenePreset: patch.scenePreset ?? presetBase.scenePreset,
    bgColor: patch.bgColor ?? presetBase.bgColor,
    accentColor: patch.accentColor ?? presetBase.accentColor,
    frameColor: patch.frameColor ?? presetBase.frameColor,
    floorColor: patch.floorColor ?? presetBase.floorColor,
    showFloor: patch.showFloor ?? presetBase.showFloor,
    showParticles: patch.showParticles ?? presetBase.showParticles,
    duration:
      typeof patch.duration === "number" && Number.isFinite(patch.duration)
        ? Math.max(0.55, Math.min(2.4, patch.duration))
        : presetBase.duration,
  };
}

export function isLightColor(hex: string): boolean {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length !== 3 && clean.length !== 6) return false;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.58;
}
