import type { LucideIcon } from "lucide-react";
import {
  Ban,
  Blend,
  ArrowRight,
  ZoomIn,
  FlipHorizontal,
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
  CircleDot,
  Undo2,
  Rocket,
  StretchHorizontal,
} from "lucide-react";
import type { ElementAnimation, SlideTransition } from "@/store/editor";

/**
 * Single source of truth for slide transitions and element entrance
 * animations. Every picker (PagesBar popover, PropertiesPanel dropdown)
 * imports from here, so a new motion only has to be added once.
 */

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
];

/** label/value pairs for the PropertiesPanel Dropdown. */
export const ELEMENT_ANIMATION_LABELS = ELEMENT_ANIMATION_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);
