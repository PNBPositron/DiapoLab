import { useId, useMemo, useState } from "react";
import { Shapes } from "lucide-react";
import {
  useEditor,
  newShape,
  type ShapeElement,
  type ShapeGradient,
  type ShapeKind,
} from "@/store/editor";
import { useSettings } from "@/store/settings";
import { PanelHeader, SearchField, ChipGroup, OptionGrid } from "../ui/selectors";
import { EVENODD_SHAPES, pathFor, STROKE_ONLY_SHAPES } from "../ShapeRender";

type ShapeItem = {
  kind: ShapeKind;
  label: string;
  tags?: string;
  w?: number;
  h?: number;
};

type ShapeCategory = {
  name: string;
  shapes: ShapeItem[];
};

const SHAPE_CATEGORIES: ShapeCategory[] = [
  {
    name: "Basics",
    shapes: [
      { kind: "rect", label: "Rectangle", tags: "box square" },
      { kind: "rounded_rect", label: "Rounded Box", tags: "card container rect" },
      { kind: "squircle", label: "Squircle", tags: "superellipse app icon" },
      { kind: "circle", label: "Circle", tags: "oval ellipse dot" },
      { kind: "triangle", label: "Triangle", tags: "pyramid" },
      { kind: "right_triangle", label: "Right Triangle", tags: "corner wedge" },
      { kind: "diamond", label: "Diamond", tags: "rhombus" },
      { kind: "hexagon", label: "Hexagon", tags: "polygon 6" },
      { kind: "pentagon", label: "Pentagon", tags: "polygon 5" },
      { kind: "octagon", label: "Octagon", tags: "polygon 8 stop" },
      { kind: "parallelogram", label: "Parallelogram", tags: "slant skew" },
      { kind: "trapezoid", label: "Trapezoid", tags: "funnel" },
      { kind: "capsule", label: "Pill", tags: "capsule button badge", w: 360, h: 150 },
      { kind: "arch", label: "Arch", tags: "door window dome" },
      { kind: "semicircle", label: "Semicircle", tags: "half dome", w: 340, h: 180 },
      { kind: "quarter_circle", label: "Quarter", tags: "corner arc" },
      { kind: "cross", label: "Plus", tags: "cross add medical" },
    ],
  },
  {
    name: "Arrows & Flow",
    shapes: [
      { kind: "arrow", label: "Arrow Right", tags: "direction next", w: 340, h: 180 },
      { kind: "arrow_left", label: "Arrow Left", tags: "direction back", w: 340, h: 180 },
      { kind: "arrow_up", label: "Arrow Up", tags: "direction growth", w: 180, h: 340 },
      { kind: "arrow_down", label: "Arrow Down", tags: "direction drop", w: 180, h: 340 },
      { kind: "double_arrow", label: "Double Arrow", tags: "sync bidirectional", w: 380, h: 170 },
      { kind: "chevron", label: "Chevron", tags: "pointer flow" },
      {
        kind: "process_step",
        label: "Process Step",
        tags: "timeline stage chevron",
        w: 360,
        h: 170,
      },
      { kind: "curved_arrow", label: "Curved Arrow", tags: "turn redirect" },
      { kind: "pin", label: "Map Pin", tags: "location marker", w: 240, h: 320 },
    ],
  },
  {
    name: "Callouts",
    shapes: [
      { kind: "speech", label: "Speech", tags: "bubble talk quote" },
      { kind: "thought_bubble", label: "Thought", tags: "cloud idea bubble" },
      { kind: "tag_badge", label: "Price Tag", tags: "label ticket", w: 340, h: 190 },
      { kind: "shield", label: "Shield", tags: "security trust badge" },
      { kind: "ticket", label: "Ticket", tags: "pass coupon", w: 360, h: 200 },
      { kind: "bookmark", label: "Bookmark", tags: "save tag", w: 220, h: 340 },
      { kind: "flag", label: "Flag", tags: "milestone marker", w: 300, h: 220 },
      { kind: "ribbon", label: "Ribbon", tags: "banner heading", w: 380, h: 170 },
      { kind: "banner_fold", label: "Banner", tags: "header strip", w: 380, h: 160 },
      { kind: "curly_brace", label: "Curly Brace", tags: "bracket group note", w: 120, h: 340 },
    ],
  },
  {
    name: "Stars & Nature",
    shapes: [
      { kind: "star", label: "Star 5", tags: "rating favorite" },
      { kind: "burst4", label: "4-Point Star", tags: "diamond star" },
      { kind: "starburst", label: "Starburst", tags: "sticker promo" },
      { kind: "seal", label: "Seal", tags: "badge verified stamp" },
      { kind: "sunburst", label: "Sunburst", tags: "sun rays radial" },
      { kind: "sparkle4", label: "Sparkle", tags: "shine glint" },
      { kind: "flower", label: "Flower", tags: "petal bloom" },
      { kind: "clover", label: "Clover", tags: "quad leaf" },
      { kind: "gear", label: "Gear", tags: "settings cog" },
      { kind: "heart", label: "Heart", tags: "love like" },
      { kind: "lightning", label: "Bolt", tags: "energy power flash" },
      { kind: "drop", label: "Drop", tags: "water liquid" },
      { kind: "moon", label: "Moon", tags: "crescent night" },
      { kind: "leaf", label: "Leaf", tags: "eco nature" },
      { kind: "blob", label: "Organic Blob", tags: "fluid backdrop" },
      { kind: "cloud", label: "Cloud", tags: "weather sky", w: 360, h: 220 },
    ],
  },
  {
    name: "Cyber",
    shapes: [
      { kind: "holographic_grid", label: "Holo Grid", tags: "matrix wireframe" },
      { kind: "glitch", label: "Glitch Shard", tags: "cyberpunk" },
      { kind: "honeycomb", label: "Honeycomb", tags: "hex mesh" },
      { kind: "circuit", label: "Circuit", tags: "tech traces lines" },
      { kind: "cyber_frame", label: "HUD Frame", tags: "panel border" },
      { kind: "data_shard", label: "Data Shard", tags: "crystal facet" },
      { kind: "tech_chevron", label: "Dual Chevron", tags: "speed forward" },
      { kind: "scanner", label: "Reticle", tags: "target focus" },
      { kind: "ring", label: "Neon Ring", tags: "donut circle halo" },
      { kind: "hex_ring", label: "Hex Ring", tags: "hollow hexagon" },
      { kind: "angular_frame", label: "Chamfer Frame", tags: "cutout border" },
      { kind: "corner_bracket", label: "Brackets", tags: "frame corners" },
    ],
  },
  {
    name: "Decorative",
    shapes: [
      { kind: "crown", label: "Crown", tags: "king award vip" },
      { kind: "gem", label: "Gem", tags: "jewel diamond" },
      { kind: "rocket", label: "Rocket", tags: "launch growth" },
      { kind: "balloon", label: "Balloon", tags: "party celebrate", w: 240, h: 340 },
      { kind: "rainbow", label: "Rainbow", tags: "arc", w: 360, h: 200 },
      { kind: "confetti", label: "Confetti", tags: "party dots" },
      { kind: "frame_cut", label: "Cut Frame", tags: "corner cutout" },
      { kind: "diagonal_stripes", label: "Stripes", tags: "pattern diagonal" },
      { kind: "dot_grid", label: "Dot Grid", tags: "pattern halftone" },
      { kind: "dotted_triangle", label: "Dot Triangle", tags: "pattern" },
      { kind: "accent_slash", label: "Slashes", tags: "accent lines" },
      { kind: "wave", label: "Wave", tags: "footer divider", w: 400, h: 180 },
    ],
  },
];

const ALL_SHAPES: ShapeItem[] = SHAPE_CATEGORIES.flatMap((c) => c.shapes);

type InsertStyleId = "outline" | "solid" | "soft" | "gradient" | "brand";

type StylePreset = {
  id: InsertStyleId;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  gradient?: ShapeGradient;
};

export function ShapesPanel({ embedded = false }: { embedded?: boolean }) {
  const { add } = useEditor();
  const brandKit = useSettings((s) => s.brandKit);
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [styleId, setStyleId] = useState<InsertStyleId>("outline");

  const styles = useMemo<StylePreset[]>(
    () => [
      {
        id: "outline",
        label: "Outline",
        fill: "#ffffff",
        stroke: "#2563eb",
        strokeWidth: 5,
      },
      {
        id: "solid",
        label: "Solid",
        fill: "#2563eb",
        stroke: "transparent",
        strokeWidth: 0,
      },
      {
        id: "soft",
        label: "Soft",
        fill: "#eff6ff",
        stroke: "#3b82f6",
        strokeWidth: 4,
      },
      {
        id: "gradient",
        label: "Gradient",
        fill: "#3b82f6",
        stroke: "transparent",
        strokeWidth: 0,
        gradient: { from: "#2563eb", to: "#7c3aed", angle: 135, type: "linear" },
      },
      {
        id: "brand",
        label: "Brand",
        fill: brandKit.primary,
        stroke: brandKit.secondary,
        strokeWidth: 4,
      },
    ],
    [brandKit.primary, brandKit.secondary],
  );

  const activeStyle = styles.find((s) => s.id === styleId) ?? styles[0];

  const visibleShapes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return ALL_SHAPES.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.kind.toLowerCase().includes(q) ||
          (s.tags && s.tags.toLowerCase().includes(q)),
      );
    }
    if (category === "All") return ALL_SHAPES;
    return SHAPE_CATEGORIES.find((c) => c.name === category)?.shapes ?? [];
  }, [category, query]);

  const handleInsert = (item: ShapeItem) => {
    const isStrokeOnly = STROKE_ONLY_SHAPES.includes(item.kind);
    const overrides: Partial<ShapeElement> = {
      width: item.w ?? 320,
      height: item.h ?? 320,
      fill: isStrokeOnly ? "transparent" : activeStyle.fill,
      stroke:
        isStrokeOnly && (activeStyle.stroke === "transparent" || activeStyle.strokeWidth <= 0)
          ? (activeStyle.gradient?.from ?? activeStyle.fill)
          : activeStyle.stroke,
      strokeWidth: isStrokeOnly && activeStyle.strokeWidth <= 0 ? 6 : activeStyle.strokeWidth,
      ...(activeStyle.gradient ? { gradient: activeStyle.gradient } : {}),
    };
    add(newShape(item.kind, overrides));
  };

  const categoryOptions = useMemo(
    () => [
      { value: "All", label: `All (${ALL_SHAPES.length})` },
      ...SHAPE_CATEGORIES.map((c) => ({
        value: c.name,
        label: `${c.name} (${c.shapes.length})`,
      })),
    ],
    [],
  );

  return (
    <div className="space-y-3.5">
      {!embedded && (
        <PanelHeader
          title="Shapes"
          description={`${ALL_SHAPES.length} vector shapes — pick a style and click to insert.`}
          icon={Shapes}
        />
      )}

      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search shapes (arrow, seal, grid…)"
      />

      {/* Live insert style switcher */}
      <div className="space-y-1.5">
        <div className="panel-section-label">Insert style</div>
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Shape insert style">
          {styles.map((s) => {
            const active = s.id === activeStyle.id;
            const swatchBg = s.gradient
              ? `linear-gradient(${s.gradient.angle}deg, ${s.gradient.from}, ${s.gradient.to})`
              : s.fill;
            const swatchBorder =
              s.stroke && s.stroke !== "transparent" && s.strokeWidth > 0
                ? `2px solid ${s.stroke}`
                : "1px solid rgba(148, 163, 184, 0.35)";
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                title={`${s.label} style`}
                onClick={() => setStyleId(s.id)}
                className={
                  "flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] font-medium transition " +
                  (active
                    ? "border-blue-500 bg-blue-50/70 text-blue-700 ring-1 ring-blue-500/30"
                    : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300")
                }
              >
                <span
                  className="block size-4 rounded-md shadow-xs"
                  style={{ background: swatchBg, border: swatchBorder }}
                  aria-hidden="true"
                />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!query.trim() && (
        <ChipGroup
          value={category}
          options={categoryOptions}
          onChange={setCategory}
          label="Shape categories"
        />
      )}

      <OptionGrid
        columns={3}
        label="Shapes"
        options={visibleShapes.map((s) => ({
          value: s.kind,
          label: s.label,
          preview: <ShapePreview kind={s.kind} stylePreset={activeStyle} />,
        }))}
        onChange={(kind) => {
          const item = visibleShapes.find((s) => s.kind === kind);
          if (item) handleInsert(item);
        }}
      />
    </div>
  );
}

function ShapePreview({ kind, stylePreset }: { kind: ShapeKind; stylePreset: StylePreset }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `sp-g-${uid}`;
  const hasGradient = Boolean(stylePreset.gradient);
  const fillRef = hasGradient ? `url(#${gradId})` : stylePreset.fill;
  const strokeOnly = STROKE_ONLY_SHAPES.includes(kind);

  const strokeColor =
    strokeOnly && (stylePreset.stroke === "transparent" || stylePreset.strokeWidth <= 0)
      ? hasGradient
        ? `url(#${gradId})`
        : stylePreset.fill
      : stylePreset.stroke;

  const strokeW = strokeOnly
    ? 6
    : stylePreset.strokeWidth > 0 && stylePreset.stroke !== "transparent"
      ? Math.max(4, stylePreset.strokeWidth)
      : 0;

  const isRounded =
    strokeOnly ||
    kind === "rounded_rect" ||
    kind === "squircle" ||
    kind === "speech" ||
    kind === "thought_bubble" ||
    kind === "cloud" ||
    kind === "flower" ||
    kind === "clover" ||
    kind === "seal" ||
    kind === "blob" ||
    kind === "drop" ||
    kind === "heart" ||
    kind === "wave";

  const gradDefs = stylePreset.gradient ? (
    <defs>
      <linearGradient
        id={gradId}
        gradientUnits="objectBoundingBox"
        x1="0"
        y1="0"
        x2={Math.cos((stylePreset.gradient.angle * Math.PI) / 180)}
        y2={Math.sin((stylePreset.gradient.angle * Math.PI) / 180)}
      >
        <stop offset="0%" stopColor={stylePreset.gradient.from} />
        <stop offset="100%" stopColor={stylePreset.gradient.to} />
      </linearGradient>
    </defs>
  ) : null;

  const shapeProps = {
    fill: strokeOnly ? "none" : fillRef,
    stroke: strokeW > 0 ? strokeColor : "none",
    strokeWidth: strokeW,
    strokeLinecap: isRounded ? ("round" as const) : undefined,
    strokeLinejoin: isRounded ? ("round" as const) : ("miter" as const),
  };

  if (kind === "rect") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {gradDefs}
        <rect x="8" y="8" width="84" height="84" {...shapeProps} />
      </svg>
    );
  }
  if (kind === "circle") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {gradDefs}
        <circle cx="50" cy="50" r="42" {...shapeProps} />
      </svg>
    );
  }
  if (kind === "triangle") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {gradDefs}
        <polygon points="50,8 92,90 8,90" {...shapeProps} />
      </svg>
    );
  }
  if (kind === "star") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {gradDefs}
        <polygon
          points="50,6 62,36 94,38 69,59 77,92 50,74 23,92 31,59 6,38 38,36"
          {...shapeProps}
        />
      </svg>
    );
  }
  if (kind === "arrow") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {gradDefs}
        <polygon points="6,36 60,36 60,12 94,50 60,88 60,64 6,64" {...shapeProps} />
      </svg>
    );
  }

  const d = pathFor(kind);
  if (!d) return null;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {gradDefs}
      <path
        d={d}
        fillRule={!strokeOnly && EVENODD_SHAPES.includes(kind) ? "evenodd" : undefined}
        {...shapeProps}
      />
    </svg>
  );
}
