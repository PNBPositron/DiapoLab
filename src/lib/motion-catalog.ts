import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Blend,
  ArrowRight,
  ZoomIn,
  FlipHorizontal,
  FlipVertical,
  Shapes,
  Zap,
  MoveLeft,
  MoveUp,
  Layers,
  MonitorPlay,
  Box,
  Cloudy,
  Aperture,
  PanelTop,
  Tornado,
  Waves,
  Rainbow,
  Pyramid,
  Sparkles,
  ChevronDown,
  RotateCw,
  Rotate3d,
  Orbit,
  CircleDot,
  Undo2,
  Rocket,
  StretchHorizontal,
  Cuboid,
  GalleryHorizontalEnd,
  BookOpen,
} from "lucide-react";
import type { ElementAnimation, SlideTransition } from "@/store/editor";

/**
 * Single source of truth for slide transitions and element entrance
 * animations. Every picker (PagesBar popover, PropertiesPanel dropdown)
 * imports from here, so a new motion only has to be added once.
 */

export type ThreeSlideTransition = "3d-cube" | "3d-carousel" | "3d-flip" | "3d-fold" | "3d-helix";

export const THREE_TRANSITIONS: ThreeSlideTransition[] = [
  "3d-cube",
  "3d-carousel",
  "3d-flip",
  "3d-fold",
  "3d-helix",
];

const THREE_TRANSITION_SET = new Set<string>(THREE_TRANSITIONS);

export function isThreeTransition(transition?: SlideTransition): transition is ThreeSlideTransition {
  return !!transition && THREE_TRANSITION_SET.has(transition);
}

export function formatTransitionLabel(transition: SlideTransition): string {
  if (transition.startsWith("3d-")) {
    return `3D ${transition.slice(3).replaceAll("-", " ")}`;
  }
  return transition.replaceAll("-", " ");
}

export const TRANSITION_OPTIONS: SlideTransition[] = [
  "none",
  "fade",
  "slide",
  "zoom",
  "flip",
  "morph",
  "tv",
  "neon",
  "cube",
  "blur",
  "parallax-left",
  "parallax-up",
  "parallax-depth",
  "reveal",
  "shutter",
  "swirl",
  "warp",
  "prism",
  "origami",
  "3d-cube",
  "3d-carousel",
  "3d-flip",
  "3d-fold",
  "3d-helix",
];

export const TRANSITION_ICONS: Record<SlideTransition, LucideIcon> = {
  none: Ban,
  fade: Blend,
  slide: ArrowRight,
  zoom: ZoomIn,
  flip: FlipHorizontal,
  morph: Shapes,
  tv: MonitorPlay,
  neon: Zap,
  cube: Box,
  blur: Cloudy,
  "parallax-left": MoveLeft,
  "parallax-up": MoveUp,
  "parallax-depth": Layers,
  reveal: Aperture,
  shutter: PanelTop,
  swirl: Tornado,
  warp: Waves,
  prism: Rainbow,
  origami: Pyramid,
  "3d-cube": Cuboid,
  "3d-carousel": GalleryHorizontalEnd,
  "3d-flip": Rotate3d,
  "3d-fold": BookOpen,
  "3d-helix": Orbit,
};

export const ELEMENT_ANIMATION_OPTIONS: Array<{
  value: ElementAnimation;
  label: string;
  /** compact label for dense grids; falls back to label */
  short?: string;
  icon: LucideIcon;
}> = [
  { value: "none", label: "None", short: "None", icon: Ban },
  { value: "fade-up", label: "Fade Up", short: "Fade", icon: Blend },
  { value: "pop", label: "Pop Spring", short: "Pop", icon: Sparkles },
  { value: "glitch", label: "Digital Glitch", short: "Glitch", icon: Zap },
  { value: "move-left", label: "Move Left", short: "Left", icon: MoveLeft },
  { value: "move-right", label: "Move Right", short: "Right", icon: ArrowRight },
  { value: "move-up", label: "Move Up", short: "Rise", icon: MoveUp },
  { value: "move-down", label: "Move Down", short: "Drop", icon: ChevronDown },
  { value: "blur-in", label: "Blur In", short: "Blur", icon: Cloudy },
  { value: "spin-in", label: "Spin In", short: "Spin", icon: RotateCw },
  { value: "bounce-in", label: "Bounce In", short: "Bounce", icon: CircleDot },
  { value: "flip-in", label: "Flip In", short: "Flip", icon: FlipHorizontal },
  { value: "swing-in", label: "Swing In", short: "Swing", icon: Undo2 },
  { value: "wobble-in", label: "Wobble In", short: "Wobble", icon: Waves },
  { value: "slingshot-in", label: "Slingshot In", short: "Slingshot", icon: Rocket },
  { value: "flicker-in", label: "Neon Flicker", short: "Flicker", icon: Zap },
  { value: "stretch-in", label: "Stretch In", short: "Stretch", icon: StretchHorizontal },
  { value: "3d-flip-x", label: "3D Flip X", short: "3D Flip X", icon: FlipVertical },
  { value: "3d-flip-y", label: "3D Flip Y", short: "3D Flip Y", icon: FlipHorizontal },
  { value: "3d-tumble", label: "3D Tumble", short: "3D Tumble", icon: Rotate3d },
  { value: "3d-orbit-in", label: "3D Orbit In", short: "3D Orbit", icon: Orbit },
  { value: "3d-pop-depth", label: "3D Depth Pop", short: "3D Depth", icon: Layers },
];

/** label/value pairs for the PropertiesPanel Dropdown. */
export const ELEMENT_ANIMATION_LABELS = ELEMENT_ANIMATION_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);
