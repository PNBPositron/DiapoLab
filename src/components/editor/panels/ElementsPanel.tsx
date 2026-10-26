import { useState } from "react";
import { LUCIDE_ICONS } from "@/lib/lucide-icons";
import {
  Link2,
  Shapes,
  Star,
  Search,
  UploadCloud,
  Loader2,
  Sparkles,
  Network,
  GitBranch,
  RefreshCw,
  Milestone,
  Triangle,
  Filter,
  CircleDot,
  Waypoints,
  Route,
  Columns3,
  Layers,
  Circle,
  Target,
  Combine,
  Map,
  Kanban,
  LayoutGrid,
  Waves,
  Youtube,
  Music2,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newEmbed, newIcon, newImage, newVideo, newShape, newText, useEditor, UI_STYLE_THEMES, type AnyElement, type ShapeElement, type ShapeGradient, type UiStyle } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";
import { prepareImage } from "@/lib/image-assets";
import { PanelHeader, ChipGroup } from "../ui/selectors";

type ElementSection = "shapes" | "icons" | "flowcraft" | "embeds" | null;

const POPULAR_ICON_NAMES = [
  "Accessibility", "Activity", "Airplay", "AlignCenterHorizontal", "AlignStartHorizontal", "AlignEndHorizontal", "Anchor", "Apple", "Archive", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "Asterisk", "Atom", "AtSign", "Award", "BadgeAlert", "BadgeCheck", "Ban", "Battery", "Bell", "Bike", "Bird", "Blocks", "Bluetooth", "Bookmark", "BookMarked", "BookOpen", "Box", "Brain", "Briefcase", "Bug", "Building2", "Bus", "Cake", "Calendar", "CalendarCheck", "Camera", "Car", "Check", "CheckCheck", "Cherry", "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp", "Circle", "CircleDashed", "CircleQuestionMark", "CircleUserRound", "CircleAlert", "TriangleAlert", "CircleCheck", "CircleX", "Clapperboard", "Clipboard", "Clock", "Clock3", "Cloud", "CloudCog", "CloudSun", "CloudDownload", "Code", "CodeXml", "Coffee", "Cog", "Columns3", "Combine", "Command", "Compass", "Contact", "Cookie", "Copy", "Cpu", "CreditCard", "Croissant", "Crown", "Database", "Diamond", "Disc3", "DollarSign", "Download", "Dumbbell", "Pencil", "Ellipsis", "ExternalLink", "Eye", "EyeOff", "Feather", "File", "FileChartColumn", "FileCheck", "FilePlus", "FileText", "Funnel", "Fish", "Flag", "Flame", "Flower2", "Folder", "FolderGit2", "FolderOpen", "Gauge", "Ghost", "Gift", "Globe", "Earth", "Grid2x2", "Guitar", "Hammer", "Hand", "Hash", "Headphones", "Heart", "Highlighter", "History", "House", "Hourglass", "Image", "Inbox", "Infinity", "Info", "Kanban", "Key", "Keyboard", "Laptop", "Layers", "LayoutPanelLeft", "LayoutDashboard", "Leaf", "Lightbulb", "Link", "Link2", "List", "ListChecks", "ListTree", "Locate", "Lock", "LockOpen", "LogIn", "LogOut", "Magnet", "Mail", "Map", "MapPin", "Medal", "Megaphone", "Menu", "MessageCircle", "MessageCircleMore", "MessageSquare", "MessagesSquare", "Mic", "Microscope", "Milestone", "Minus", "Monitor", "MonitorPlay", "Moon", "Mouse", "Music", "Navigation", "Orbit", "Package", "PackageCheck", "Paintbrush", "Palette", "PanelLeft", "PanelLeftOpen", "PanelsTopLeft", "Paperclip", "Pause", "PawPrint", "Pen", "PenTool", "Phone", "PiggyBank", "Pin", "Plane", "Sprout", "Play", "Plus", "Podcast", "Pointer", "Popcorn", "Printer", "Puzzle", "QrCode", "Quote", "Radar", "Receipt", "Recycle", "RefreshCw", "Rocket", "Route", "Sailboat", "Save", "Scale", "ScanLine", "ScanSearch", "Search", "Send", "SendHorizontal", "Server", "Settings", "Share2", "Shield", "ShieldCheck", "Shirt", "ShoppingCart", "Sigma", "SlidersHorizontal", "Snowflake", "Sparkles", "SquareDashedKanban", "SquareStack", "Stamp", "Star", "Store", "Sun", "SunMoon", "Table2", "Tablet", "Tag", "Telescope", "Tent", "Terminal", "ThumbsUp", "Ticket", "Timer", "ToggleLeft", "ToolCase", "TrainFront", "Trash2", "Trees", "Truck", "Tv", "Twitter", "Umbrella", "Upload", "User", "UserCheck", "UserPlus", "Users", "Video", "Volleyball", "WalletCards", "Wand", "Watch", "Waves", "Waypoints", "Wifi", "Wind", "Workflow", "Wrench", "X", "Zap", "ZoomIn", "ZoomOut", "ChartLine", "ChartPie", "ChartNoAxesCombined", "ChartColumnBig",
] as const;

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = POPULAR_ICON_NAMES.flatMap((name) => {
  const Icon = LUCIDE_ICONS[name];
  if (!Icon) return [];
  return [{ name, label: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Icon }];
});


type FlowKind =
  | "process"
  | "cycle"
  | "timeline"
  | "pyramid"
  | "funnel"
  | "orgchart"
  | "hub"
  | "mindmap"
  | "journey"
  | "pillars"
  | "layers"
  | "venn"
  | "rings"
  | "roadmap"
  | "kanban"
  | "matrix"
  | "swimlane";

/** Second accent used for modern gradient fills, per Presets theme. */
const FLOW_ACCENT2: Record<UiStyle, string> = {
  cyber: "#7df9ff",
  glass: "#8fd0ff",
  neobrutalist: "#ffd84a",
  sketch: "#7dd3fc",
  xp: "#6ea8fe",
  aqua: "#22d3ee",
  midnight: "#a5b4fc",
  pastel: "#f9a8d4",
  vapor: "#f0abfc",
  material: "#00897b",
  matrix: "#37ff7f",
  swiss: "#111111",
};

const FLOWCRAFT_META: Record<FlowKind, { label: string; description: string; Icon: LucideIcon }> = {
  process: { label: "Stepped flow", description: "Numbered stages linked by arrows", Icon: GitBranch },
  cycle: { label: "Cycle loop", description: "Circular loop around a central hub", Icon: RefreshCw },
  timeline: { label: "Timeline", description: "Milestones along an axis", Icon: Milestone },
  pyramid: { label: "Pyramid", description: "Three-tier hierarchy", Icon: Triangle },
  funnel: { label: "Funnel", description: "Narrowing conversion stages", Icon: Filter },
  orgchart: { label: "Org chart", description: "Team tree with connectors", Icon: Network },
  hub: { label: "Hub & spoke", description: "Central concept with satellites", Icon: CircleDot },
  mindmap: { label: "Mind map", description: "Central idea with six branches", Icon: Waypoints },
  journey: { label: "Journey", description: "Serpentine path from start to goal", Icon: Route },
  pillars: { label: "Pillars", description: "Roof, three pillars and a base", Icon: Columns3 },
  layers: { label: "Layers", description: "Stacked architecture bands", Icon: Layers },
  venn: { label: "Venn", description: "Two sets with a shared overlap", Icon: Combine },
  rings: { label: "Rings", description: "Concentric goals around a core", Icon: Target },
  roadmap: { label: "Roadmap", description: "Now / Next / Later horizons", Icon: Map },
  kanban: { label: "Kanban", description: "Three columns of work cards", Icon: Kanban },
  matrix: { label: "2x2 matrix", description: "Quadrants by impact and effort", Icon: LayoutGrid },
  swimlane: { label: "Swimlanes", description: "Three lanes of owned tasks", Icon: Waves },
};

const FLOWCRAFT_SECTIONS: Array<{ label: string; kinds: FlowKind[] }> = [
  { label: "Flows", kinds: ["process", "funnel", "cycle", "journey", "swimlane"] },
  { label: "Structures", kinds: ["pyramid", "orgchart", "pillars", "layers"] },
  { label: "Networks", kinds: ["hub", "mindmap", "venn", "rings"] },
  { label: "Plans", kinds: ["timeline", "roadmap", "kanban", "matrix"] },
];

/** Derive a FlowCraft palette from the same themes used by the Presets panel. */
const flowPalette = (style: UiStyle) => {
  const t = UI_STYLE_THEMES[style];
  return {
    accent: t.accent,
    soft: t.bg,
    ink: t.fg,
    border: t.border,
    onAccent: t.onAccent,
    font: t.font,
    strokeWidth: Math.max(2, t.borderWidth ?? 2),
  };
};

/** Public factory: builds the diagram, then upgrades every accent node
 *  to a modern two-tone gradient derived from the selected theme. */
function createFlowCraft(kind: FlowKind, style: UiStyle): AnyElement[] {
  const p = flowPalette(style);
  const gradient: ShapeGradient = { from: p.accent, to: FLOW_ACCENT2[style], angle: 100, type: "linear" };
  return buildFlowCraft(kind, style).map((element) =>
    element.type === "shape" && element.fill === p.accent
      ? { ...element, gradient }
      : element,
  );
}

function buildFlowCraft(kind: FlowKind, style: UiStyle): AnyElement[] {
  const p = flowPalette(style);
  const els: AnyElement[] = [];

  if (kind === "process") {
    const steps: Array<[string, string, string]> = [
      ["01", "Discover", "Explore the problem space"],
      ["02", "Design", "Shape the core experience"],
      ["03", "Build", "Ship a working version"],
      ["04", "Launch", "Measure and iterate"],
    ];
    const w = 360, h = 250, y = 400, gap = 90;
    const startX = (1920 - (steps.length * w + (steps.length - 1) * gap)) / 2;
    steps.forEach(([num, title, sub], i) => {
      const x = startX + i * (w + gap);
      const hot = i === 1;
      els.push(
        newShape("rect", { x, y, width: w, height: h, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 26 }),
        newText({ x: x + 28, y: y + 24, width: 100, height: 60, text: num, fontSize: 30, color: hot ? p.onAccent : p.accent, fontWeight: 900, align: "left", fontFamily: p.font }),
        newText({ x: x + 28, y: y + 96, width: w - 56, height: 60, text: title, fontSize: 38, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "left", fontFamily: p.font }),
        newText({ x: x + 28, y: y + 162, width: w - 56, height: 60, text: sub, fontSize: 20, color: hot ? p.onAccent : p.ink, fontWeight: 500, align: "left", fontFamily: p.font }),
      );
      if (i < steps.length - 1) {
        els.push(newShape("arrow", { x: x + w + 14, y: y + h / 2 - 28, width: 62, height: 56, fill: p.accent, stroke: p.accent, strokeWidth: 2 }));
      }
    });
    return els;
  }

  if (kind === "cycle") {
    const labels = ["Plan", "Build", "Measure", "Learn"];
    const cx = 960, cy = 540, r = 330, node = 220;
    els.push(
      newShape("circle", { x: cx - 150, y: cy - 150, width: 300, height: 300, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
      newText({ x: cx - 120, y: cy - 32, width: 240, height: 70, text: "Loop", fontSize: 42, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
    );
    labels.forEach((label, i) => {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      const nx = cx + Math.cos(a) * r;
      const ny = cy + Math.sin(a) * r;
      els.push(
        newShape("circle", { x: nx - node / 2, y: ny - node / 2, width: node, height: node, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: nx - node / 2 + 20, y: ny - 24, width: node - 40, height: 50, text: label, fontSize: 30, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
      );
      const mid = a + Math.PI / 4;
      const ax = cx + Math.cos(mid) * (r + 70);
      const ay = cy + Math.sin(mid) * (r + 70);
      const deg = ((mid + Math.PI / 2) * 180) / Math.PI;
      els.push(newShape("arrow", { x: ax - 30, y: ay - 15, width: 60, height: 30, fill: p.accent, stroke: p.accent, strokeWidth: 2, rotation: deg }));
    });
    return els;
  }

  if (kind === "timeline") {
    const items: Array<[string, string, string]> = [
      ["2023", "Idea", "First prototype"],
      ["2024", "Launch", "Public release"],
      ["2025", "Growth", "10k users"],
      ["2026", "Today", "Global team"],
    ];
    const axisY = 540;
    els.push(newShape("rect", { x: 180, y: axisY - 5, width: 1560, height: 10, fill: p.border, stroke: p.border, strokeWidth: 0 }));
    items.forEach(([year, title, sub], i) => {
      const x = 340 + i * 420;
      const above = i % 2 === 0;
      els.push(
        newShape("circle", { x: x - 26, y: axisY - 26, width: 52, height: 52, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
        newShape("rect", { x: x - 4, y: above ? axisY - 120 : axisY + 10, width: 8, height: 100, fill: p.border, stroke: p.border, strokeWidth: 0 }),
        newShape("rect", { x: x - 70, y: above ? axisY - 200 : axisY + 110, width: 140, height: 54, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 27 }),
        newText({ x: x - 70, y: above ? axisY - 188 : axisY + 122, width: 140, height: 40, text: year, fontSize: 24, color: p.accent, fontWeight: 900, align: "center", fontFamily: p.font }),
        newText({ x: x - 160, y: above ? axisY - 300 : axisY + 180, width: 320, height: 50, text: title, fontSize: 34, color: p.ink, fontWeight: 900, align: "center", fontFamily: p.font }),
        newText({ x: x - 160, y: above ? axisY - 246 : axisY + 234, width: 320, height: 40, text: sub, fontSize: 20, color: p.ink, fontWeight: 500, align: "center", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "pyramid") {
    const tiers: Array<[string, number]> = [["Vision", 560], ["Strategy", 800], ["Execution", 1040]];
    tiers.forEach(([label, w], i) => {
      const y = 240 + i * 200;
      const hot = i === 0;
      els.push(
        newShape("trapezoid", { x: (1920 - w) / 2, y, width: w, height: 186, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: 660, y: y + 56, width: 600, height: 70, text: label, fontSize: 38, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "center", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "funnel") {
    const stages: Array<[string, string]> = [["Visitors", "100%"], ["Signups", "42%"], ["Active users", "18%"], ["Customers", "6%"]];
    const widths = [1100, 820, 560, 320];
    stages.forEach(([label, pct], i) => {
      const w = widths[i];
      const y = 190 + i * 190;
      const hot = i === stages.length - 1;
      els.push(
        newShape("trapezoid", { x: (1920 - w) / 2, y, width: w, height: 170, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: 660, y: y + 52, width: 600, height: 60, text: label, fontSize: 34, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "center", fontFamily: p.font }),
        newText({ x: (1920 - w) / 2 + w + 36, y: y + 58, width: 220, height: 50, text: pct, fontSize: 26, color: p.accent, fontWeight: 800, align: "left", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "orgchart") {
    const line = (x: number, y: number, w: number, h: number) =>
      newShape("rect", { x, y, width: w, height: h, fill: p.border, stroke: p.border, strokeWidth: 0 });
    els.push(
      newShape("capsule", { x: 760, y: 150, width: 400, height: 140, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
      newText({ x: 790, y: 190, width: 340, height: 60, text: "DiapoLab", fontSize: 34, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
      line(956, 290, 8, 60),
      line(560, 350, 800, 8),
      line(556, 358, 8, 32),
      line(1356, 358, 8, 32),
    );
    (["Design", "Engineering"] as const).forEach((label, i) => {
      const x = i === 0 ? 350 : 1150;
      els.push(
        newShape("rect", { x, y: 390, width: 420, height: 130, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 20 }),
        newText({ x: x + 20, y: 432, width: 380, height: 50, text: label, fontSize: 30, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
        line(x + 206, 520, 8, 40),
      );
    });
    els.push(line(270, 560, 580, 8), line(1070, 560, 580, 8));
    const leaves: Array<[string, number]> = [["Brand", 100], ["Product", 680], ["Platform", 900], ["Research", 1480]];
    leaves.forEach(([label, x]) => {
      els.push(
        line(x + 166, 568, 8, 32),
        newShape("rect", { x, y: 600, width: 340, height: 130, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 20 }),
        newText({ x: x + 20, y: 642, width: 300, height: 50, text: label, fontSize: 26, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "hub") {
    const cx = 960, cy = 540;
    const labels = ["Data", "Design", "Code", "Users"];
    els.push(
      newShape("circle", { x: cx - 180, y: cy - 180, width: 360, height: 360, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
      newText({ x: cx - 140, y: cy - 32, width: 280, height: 70, text: "Core", fontSize: 40, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
    );
    labels.forEach((label, i) => {
      const deg = 45 + i * 90;
      const a = (deg * Math.PI) / 180;
      const sx = cx + Math.cos(a) * 480;
      const sy = cy + Math.sin(a) * 480;
      els.push(
        newShape("rect", { x: cx + Math.cos(a) * 270 - 70, y: cy + Math.sin(a) * 270 - 5, width: 140, height: 10, fill: p.border, stroke: p.border, strokeWidth: 0, rotation: deg }),
        newShape("circle", { x: sx - 130, y: sy - 130, width: 260, height: 260, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: sx - 110, y: sy - 26, width: 220, height: 50, text: label, fontSize: 30, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "journey") {
    const top: Array<[string, string]> = [["Discover", "Find the product"], ["Sign up", "Create an account"], ["Value", "First win"]];
    const bottom: Array<[string, string]> = [["Advocate", "Tell the world"], ["Upgrade", "Go Pro"], ["Habit", "Weekly use"]];
    const w = 340, h = 150;
    top.forEach(([label, sub], i) => {
      const x = 180 + i * 500;
      els.push(
        newShape("capsule", { x, y: 260, width: w, height: h, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: x + 20, y: 296, width: w - 40, height: 50, text: label, fontSize: 28, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
        newText({ x: x + 20, y: 348, width: w - 40, height: 40, text: sub, fontSize: 18, color: p.ink, fontWeight: 500, align: "center", fontFamily: p.font }),
      );
      if (i < top.length - 1) els.push(newShape("arrow", { x: x + w + 40, y: 300, width: 80, height: 56, fill: p.accent, stroke: p.accent, strokeWidth: 2 }));
    });
    els.push(newShape("arrow", { x: 1500, y: 430, width: 56, height: 80, fill: p.accent, stroke: p.accent, strokeWidth: 2, rotation: 90 }));
    bottom.forEach(([label, sub], i) => {
      const x = 1180 - i * 500;
      const hot = i === bottom.length - 1;
      els.push(
        newShape("capsule", { x, y: 540, width: w, height: h, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: x + 20, y: 576, width: w - 40, height: 50, text: label, fontSize: 28, color: hot ? p.onAccent : p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
        newText({ x: x + 20, y: 628, width: w - 40, height: 40, text: sub, fontSize: 18, color: hot ? p.onAccent : p.ink, fontWeight: 500, align: "center", fontFamily: p.font }),
      );
      if (i < bottom.length - 1) els.push(newShape("arrow", { x: x - 120, y: 580, width: 80, height: 56, fill: p.accent, stroke: p.accent, strokeWidth: 2, rotation: 180 }));
    });
    return els;
  }

  if (kind === "pillars") {
    els.push(
      newShape("rect", { x: 360, y: 220, width: 1200, height: 140, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 24 }),
      newText({ x: 460, y: 252, width: 1000, height: 70, text: "Vision", fontSize: 40, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
    );
    (["Design", "Build", "Grow"] as const).forEach((label, i) => {
      const x = 520 + i * 330;
      els.push(
        newShape("rect", { x, y: 400, width: 220, height: 380, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 18 }),
        newText({ x: x + 10, y: 550, width: 200, height: 60, text: label, fontSize: 32, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
      );
    });
    els.push(
      newShape("rect", { x: 360, y: 820, width: 1200, height: 130, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 18 }),
      newText({ x: 460, y: 852, width: 1000, height: 60, text: "Foundation — shared standards", fontSize: 28, color: p.ink, fontWeight: 700, align: "center", fontFamily: p.font }),
    );
    return els;
  }

  if (kind === "layers") {
    const bands: Array<[string, string]> = [
      ["Interface", "What people see and touch"],
      ["Experience", "Flows, motion and feedback"],
      ["Logic", "Rules, state and data"],
      ["Platform", "Infra, build and deploy"],
    ];
    bands.forEach(([label, sub], i) => {
      const y = 230 + i * 210;
      const hot = i === 0;
      els.push(
        newShape("rect", { x: 320, y, width: 1280, height: 180, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 22 }),
        newText({ x: 370, y: y + 56, width: 420, height: 70, text: label, fontSize: 36, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "left", fontFamily: p.font }),
        newText({ x: 820, y: y + 68, width: 720, height: 50, text: sub, fontSize: 20, color: hot ? p.onAccent : p.ink, fontWeight: 500, align: "left", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "venn") {
    els.push(
      newShape("circle", { x: 540, y: 290, width: 520, height: 520, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, opacity: 0.85 }),
      newShape("circle", { x: 860, y: 290, width: 520, height: 520, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth, opacity: 0.55 }),
      newText({ x: 560, y: 460, width: 300, height: 60, text: "Team A", fontSize: 34, color: p.ink, fontWeight: 900, align: "center", fontFamily: p.font }),
      newText({ x: 1060, y: 460, width: 300, height: 60, text: "Team B", fontSize: 34, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
      newText({ x: 810, y: 660, width: 300, height: 60, text: "Shared goals", fontSize: 26, color: p.onAccent, fontWeight: 800, align: "center", fontFamily: p.font }),
    );
    return els;
  }

  if (kind === "rings") {
    const cx = 960, cy = 540;
    els.push(
      newShape("circle", { x: cx - 400, y: cy - 400, width: 800, height: 800, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, opacity: 0.9 }),
      newShape("circle", { x: cx - 270, y: cy - 270, width: 540, height: 540, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, opacity: 0.9 }),
      newShape("circle", { x: cx - 150, y: cy - 150, width: 300, height: 300, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
      newText({ x: cx - 100, y: cy - 34, width: 200, height: 70, text: "Core", fontSize: 36, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
      newText({ x: cx - 100, y: cy - 380, width: 200, height: 50, text: "Vision", fontSize: 26, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
      newText({ x: cx - 100, y: cy - 250, width: 200, height: 50, text: "Strategy", fontSize: 26, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
    );
    return els;
  }

  if (kind === "roadmap") {
    const lanes: Array<[string, string, number]> = [
      ["Now", "In progress this quarter", 500],
      ["Next", "Planned next quarter", 800],
      ["Later", "On the horizon", 1100],
    ];
    lanes.forEach(([label, sub, w], i) => {
      const y = 260 + i * 220;
      const hot = i === 0;
      els.push(
        newShape("capsule", { x: 420, y, width: w, height: 160, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: 470, y: y + 34, width: w - 100, height: 60, text: label, fontSize: 34, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "left", fontFamily: p.font }),
        newText({ x: 470, y: y + 94, width: w - 100, height: 40, text: sub, fontSize: 18, color: hot ? p.onAccent : p.ink, fontWeight: 500, align: "left", fontFamily: p.font }),
      );
    });
    els.push(
      newShape("arrow", { x: 1580, y: 310, width: 90, height: 56, fill: p.border, stroke: p.border, strokeWidth: 2 }),
      newText({ x: 1580, y: 250, width: 240, height: 50, text: "Horizon", fontSize: 22, color: p.ink, fontWeight: 700, align: "left", fontFamily: p.font }),
    );
    return els;
  }

  if (kind === "kanban") {
    const columns: Array<[string, Array<string>]> = [
      ["To do", ["Wireframes", "Copy pass"]],
      ["Doing", ["Editor polish", "Share flow"]],
      ["Done", ["Pages bar", "FlowCraft"]],
    ];
    columns.forEach(([label, cards], i) => {
      const x = 200 + i * 560;
      els.push(
        newShape("rect", { x, y: 260, width: 480, height: 660, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 24, opacity: 0.55 }),
        newText({ x: x + 30, y: 300, width: 420, height: 50, text: label, fontSize: 30, color: p.ink, fontWeight: 900, align: "left", fontFamily: p.font }),
      );
      cards.forEach((card, j) => {
        const cy = 400 + j * 190;
        const hot = i === 2 && j === 1;
        els.push(
          newShape("rect", { x: x + 30, y: cy, width: 420, height: 150, fill: hot ? p.accent : p.border, stroke: p.border, strokeWidth: hot ? p.strokeWidth : 2, cornerRadius: 16, opacity: hot ? 1 : 0.28 }),
          newText({ x: x + 55, y: cy + 48, width: 370, height: 55, text: card, fontSize: 24, color: hot ? p.onAccent : p.ink, fontWeight: 700, align: "left", fontFamily: p.font }),
        );
      });
    });
    return els;
  }

  if (kind === "matrix") {
    els.push(
      newText({ x: 280, y: 150, width: 400, height: 50, text: "Impact", fontSize: 24, color: p.ink, fontWeight: 700, align: "left", fontFamily: p.font }),
      newText({ x: 65, y: 515, width: 300, height: 50, text: "Effort", fontSize: 24, color: p.ink, fontWeight: 700, align: "center", fontFamily: p.font, rotation: -90 }),
    );
    const quads: Array<[string, string, number, number, boolean]> = [
      ["Quick wins", "Do these first", 280, 250, true],
      ["Big bets", "Invest to win big", 1000, 250, false],
      ["Fill-ins", "Only if time", 280, 650, false],
      ["Time sinks", "Avoid or cut", 1000, 650, false],
    ];
    quads.forEach(([label, sub, x, y, hot]) => {
      els.push(
        newShape("rect", { x, y, width: 640, height: 340, fill: hot ? p.accent : p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 24 }),
        newText({ x: x + 40, y: y + 60, width: 560, height: 70, text: label, fontSize: 34, color: hot ? p.onAccent : p.ink, fontWeight: 900, align: "left", fontFamily: p.font }),
        newText({ x: x + 40, y: y + 140, width: 560, height: 50, text: sub, fontSize: 20, color: hot ? p.onAccent : p.ink, fontWeight: 500, align: "left", fontFamily: p.font }),
      );
    });
    return els;
  }

  if (kind === "swimlane") {
    const lanes: Array<[string, Array<[string, string]>]> = [
      ["Discover", [["Interviews", "12 chats"], ["Survey", "430 answers"], ["Insights", "Top 3 pains"]]],
      ["Design", [["Wireframes", "Lo-fi pass"], ["Prototype", "Clickable"], ["Test", "5 users"]]],
      ["Deliver", [["Build", "Sprints 1–3"], ["Ship", "Beta launch"], ["Measure", "Adoption +18%"]]],
    ];
    const laneW = 1700, laneH = 250, laneGap = 30, startY = 140;
    lanes.forEach(([lane, tasks], li) => {
      const y = startY + li * (laneH + laneGap);
      els.push(
        newShape("rect", { x: 110, y, width: laneW, height: laneH, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth, cornerRadius: 22 }),
        newShape("capsule", { x: 140, y: y + laneH / 2 - 40, width: 230, height: 80, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
        newText({ x: 155, y: y + laneH / 2 - 14, width: 200, height: 50, text: lane, fontSize: 28, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
      );
      tasks.forEach(([title, sub], ti) => {
        const x = 430 + ti * 440;
        els.push(
          newShape("rect", { x, y: y + 40, width: 380, height: 170, fill: "#ffffff", stroke: p.border, strokeWidth: Math.max(1, p.strokeWidth - 1), cornerRadius: 18 }),
          newShape("circle", { x: x + 26, y: y + 66, width: 22, height: 22, fill: p.accent, stroke: p.accent, strokeWidth: 0 }),
          newText({ x: x + 62, y: y + 58, width: 300, height: 50, text: title, fontSize: 24, color: p.ink, fontWeight: 800, align: "left", fontFamily: p.font }),
          newText({ x: x + 62, y: y + 112, width: 300, height: 46, text: sub, fontSize: 18, color: p.ink, fontWeight: 500, align: "left", fontFamily: p.font }),
        );
      });
    });
    return els;
  }

  // mindmap
  const cx = 960, cy = 540;
  const branches: Array<[string, number]> = [
    ["Research", 150], ["Content", 180], ["Design", 210],
    ["Data", 330], ["Outreach", 0], ["Growth", 30],
  ];
  els.push(
    newShape("capsule", { x: cx - 150, y: cy - 70, width: 300, height: 140, fill: p.accent, stroke: p.border, strokeWidth: p.strokeWidth }),
    newText({ x: cx - 130, y: cy - 28, width: 260, height: 60, text: "Idea", fontSize: 36, color: p.onAccent, fontWeight: 900, align: "center", fontFamily: p.font }),
  );
  branches.forEach(([label, deg]) => {
    const a = (deg * Math.PI) / 180;
    const nx = cx + Math.cos(a) * 560;
    const ny = cy + Math.sin(a) * 560;
    els.push(
      newShape("rect", { x: cx + Math.cos(a) * 330 - 110, y: cy + Math.sin(a) * 330 - 4, width: 220, height: 8, fill: p.border, stroke: p.border, strokeWidth: 0, rotation: deg }),
      newShape("capsule", { x: nx - 160, y: ny - 55, width: 320, height: 110, fill: p.soft, stroke: p.border, strokeWidth: p.strokeWidth }),
      newText({ x: nx - 140, y: ny - 20, width: 280, height: 50, text: label, fontSize: 26, color: p.ink, fontWeight: 800, align: "center", fontFamily: p.font }),
    );
  });
  return els;
}

/* Refined tile: frosted card, gradient chip, subtle lift + blue glow on hover. */
function ActionTile({
  Icon,
  label,
  active = false,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const state = active
    ? "border-blue-500/50 bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_8px_20px_-8px_rgba(59,130,246,0.45)]"
    : "border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_12px_26px_-10px_rgba(37,99,235,0.22)]";
  const chip = active
    ? "bg-linear-to-tr from-blue-500 to-indigo-600 text-white shadow-xs"
    : "bg-slate-100/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600";
  return (
    <button onClick={onClick} className={`group relative flex h-20 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-0 active:scale-[0.97] ${state}`}>
      <span className={`grid size-9 place-items-center rounded-xl transition-all duration-200 ${chip}`}>
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 group-hover:text-slate-800">
        {label}
      </span>
    </button>
  );
}

export function ElementsPanel() {
  const { add, elements, selectedId, update } = useEditor();
  const addGroup = (els: AnyElement[]) => {
    const groupId = crypto.randomUUID();
    els.forEach((element) => add({ ...element, groupId }));
  };

  // Pick a Presets-panel theme for new diagrams; if a FlowCraft group is
  // selected on the slide, restyle it live by mapping old theme colors to the
  // new palette (accent nodes, soft nodes, borders and label inks).
  const restyleFlowGroup = (style: UiStyle) => {
    setFlowStyle(style);
    const sel = elements.find((element) => element.id === selectedId);
    const gid = sel && "groupId" in sel ? sel.groupId : undefined;
    if (!gid) return;
    const accs = new Set(Object.values(UI_STYLE_THEMES).map((t) => t.accent));
    const softs = new Set(Object.values(UI_STYLE_THEMES).map((t) => t.bg));
    const borders = new Set(Object.values(UI_STYLE_THEMES).map((t) => t.border));
    const inks = new Set(Object.values(UI_STYLE_THEMES).map((t) => t.fg));
    const onAccents = new Set(Object.values(UI_STYLE_THEMES).map((t) => t.onAccent));
    const theme = UI_STYLE_THEMES[style];
    for (const element of elements) {
      if (!("groupId" in element) || element.groupId !== gid) continue;
      if (element.type === "shape") {
        const patch: Partial<ShapeElement> = {};
        if (accs.has(element.fill)) {
          patch.fill = theme.accent;
          if (element.gradient) patch.gradient = { ...element.gradient, from: theme.accent, to: FLOW_ACCENT2[style] };
        } else if (softs.has(element.fill)) {
          patch.fill = theme.bg;
          if (element.gradient) patch.gradient = { ...element.gradient, from: theme.bg };
        }
        if (borders.has(element.stroke)) patch.stroke = theme.border;
        if (Object.keys(patch).length) update(element.id, patch);
      } else if (element.type === "text") {
        if (inks.has(element.color)) update(element.id, { color: theme.fg });
        else if (onAccents.has(element.color)) update(element.id, { color: theme.onAccent });
      }
    }
  };
  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [flowStyle, setFlowStyle] = useState<UiStyle>("cyber");
  const [imageUrl, setImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const filteredIcons = ICONS.filter(({ label }) =>
    label.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );

  const addByUrl = () => {
    const trimmed = imageUrl.trim();
    setUrlError(null);
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("Lien invalide — doit commencer par http:// ou https://");
      return;
    }
    add(newImage(trimmed));
    setImageUrl("");
  };

  const addFile = async (file: File) => {
    setUploading(true);
    setUrlError(null);
    try {
      if (file.type.startsWith("video/")) {
        if (file.size > 25 * 1024 * 1024) throw new Error("Video files must be smaller than 25 MB.");
        const reader = new FileReader();
        const src = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the video."));
          reader.readAsDataURL(file);
        });
        add(newVideo(src));
      } else {
        add(newImage(await prepareImage(file)));
      }
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="panel-content">
      <PanelHeader kicker="Elements" title="Building blocks" description="Drop images, shapes and icons onto your slide." icon={Sparkles} />

      {/* Upload zone */}
      <label className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300/90 bg-white/70 px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-[0_12px_26px_-12px_rgba(37,99,235,0.25)]">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-100/80 text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
        </span>
        <span className="text-xs font-semibold text-slate-700">
          {uploading ? "Preparing media…" : "Upload image, GIF or video"}
        </span>
        <span className="text-[9px] text-slate-400">Images, GIFs & videos · video ≤ 25 MB</span>
        <input type="file" accept="image/*,video/*" className="sr-only" disabled={uploading} onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void addFile(file);
          event.target.value = "";
        }} />
      </label>

      {/* Add image by URL — permanent, survives refresh & design sharing. */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
          <Link2 className="size-4 shrink-0 text-slate-400" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            placeholder="Coller le lien d'une image…"
            aria-label="Image URL"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={addByUrl}
            className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-700 active:scale-95"
          >
            Ajouter
          </button>
        </label>
        {urlError && (
          <p className="px-1 text-[10px] font-medium text-rose-500">{urlError}</p>
        )}
      </div>

      {/* Section tiles */}
      <div className="panel-action-grid">
        <ActionTile
          Icon={Shapes}
          label="Shapes"
          active={section === "shapes"}
          onClick={() => setSection(section === "shapes" ? null : "shapes")}
        />
        <ActionTile
          Icon={Star}
          label="Icons"
          active={section === "icons"}
          onClick={() => setSection(section === "icons" ? null : "icons")}
        />
        <ActionTile
          Icon={Network}
          label="FlowCraft"
          active={section === "flowcraft"}
          onClick={() => setSection(section === "flowcraft" ? null : "flowcraft")}
        />
        <ActionTile
          Icon={Youtube}
          label="Embeds"
          active={section === "embeds"}
          onClick={() => setSection(section === "embeds" ? null : "embeds")}
        />
      </div>

      {section === "shapes" && <ShapesPanel embedded />}

      {section === "flowcraft" && (
        <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><GitBranch className="size-4 text-blue-600" /> FlowCraft diagrams</div>
            <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[9px] font-bold text-blue-600">17 diagrams</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">Drop a connected visual story built from editable shapes, gradients and labels.</p>
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Theme — from the Presets panel</span>
            <ChipGroup
              value={flowStyle}
              onChange={restyleFlowGroup}
              label="FlowCraft theme"
              options={(Object.keys(UI_STYLE_THEMES) as UiStyle[]).map((value) => ({ value, label: UI_STYLE_THEMES[value].label }))}
            />
          </div>
          {FLOWCRAFT_SECTIONS.map((sec) => (
            <div key={sec.label} className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{sec.label}</span>
              <div className="grid grid-cols-2 gap-2">
                {sec.kinds.map((kind) => {
                  const meta = FLOWCRAFT_META[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      title={meta.description}
                      onClick={() => addGroup(createFlowCraft(kind, flowStyle))}
                      className="group flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_10px_22px_-8px_rgba(37,99,235,0.28)] active:translate-y-0 active:scale-[0.97]"
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 group-hover:text-blue-600">
                        <meta.Icon className="size-3.5 text-slate-400 group-hover:text-blue-600" /> {meta.label}
                      </span>
                      <span className="text-[9px] leading-tight text-slate-400">{meta.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-[9px] leading-relaxed text-slate-400">Tip: select a diagram on the slide, then pick a theme to restyle it.</p>
        </div>
      )}

      {/* Web embeds — YouTube, Spotify, Maps, Figma… as live iframes on the slide */}
      {section === "embeds" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Youtube className="size-4 text-blue-600" /> Web embeds</div>
            <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[9px] font-bold text-blue-600">live iframes</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">Paste a link — YouTube, Spotify, SoundCloud, Google Maps, Figma, Vimeo… It plays live on the slide.</p>
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white">
            <Link2 className="size-4 shrink-0" />
            <input
              value={embedUrl}
              onChange={(event) => setEmbedUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && embedUrl.trim()) {
                  add(newEmbed(embedUrl));
                  setEmbedUrl("");
                }
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              aria-label="Embed URL"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            disabled={!embedUrl.trim()}
            onClick={() => {
              add(newEmbed(embedUrl));
              setEmbedUrl("");
            }}
            className="rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            Add embed to canvas
          </button>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><Youtube className="size-4" /><span className="text-[8px] font-medium">YouTube</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><Music2 className="size-4" /><span className="text-[8px] font-medium">Spotify</span></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-1 py-2 text-slate-500"><MapPin className="size-4" /><span className="text-[8px] font-medium">Maps</span></div>
          </div>
          <p className="text-[9px] leading-relaxed text-slate-400">PDF / PPTX exports replace embeds with a linked placeholder card (iframes can't be captured).</p>
        </div>
      )}

      {section === "icons" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
            <Search className="size-4" />
            <input
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
              placeholder="Search all Lucide icons"
              aria-label="Search icons"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="panel-section-label">Add to canvas</div>
          <div className="grid grid-cols-3 gap-2">
            {filteredIcons.map(({ name, label, Icon }) => (
              <button
                key={name}
                title={`Add ${label}`}
                onClick={() => add(newIcon(name))}
                className="group flex h-20 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:text-blue-600 hover:shadow-[0_10px_22px_-8px_rgba(37,99,235,0.28)] active:translate-y-0 active:scale-[0.97]"
              >
                <Icon className="size-6 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                <span className="w-full truncate px-1.5 text-[8px] font-medium text-slate-400 group-hover:text-slate-600">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
