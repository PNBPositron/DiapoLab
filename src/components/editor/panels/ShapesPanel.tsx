import { useState } from "react";
import { useEditor, newShape, type ShapeKind } from "@/store/editor";
import { PanelHeader, ChipGroup, OptionGrid } from "../ui/selectors";
import { shapePathD } from "../ShapeRender";

const SHAPE_CATEGORIES: { name: string; shapes: { kind: ShapeKind; label: string }[] }[] = [
  {
    name: "Basics",
    shapes: [
      { kind: "rect", label: "Rectangle" },
      { kind: "circle", label: "Circle" },
      { kind: "triangle", label: "Triangle" },
      { kind: "diamond", label: "Diamond" },
      { kind: "hexagon", label: "Hexagon" },
      { kind: "pentagon", label: "Pentagon" },
      { kind: "octagon", label: "Octagon" },
      { kind: "parallelogram", label: "Parallelogram" },
      { kind: "trapezoid", label: "Trapezoid" },
      { kind: "capsule", label: "Capsule" },
      { kind: "semicircle", label: "Semicircle" },
      { kind: "quarter_circle", label: "Quarter circle" },
      { kind: "cross", label: "Cross" },
    ],
  },
  {
    name: "Arrows",
    shapes: [
      { kind: "arrow", label: "Arrow" },
      { kind: "chevron", label: "Chevron" },
      { kind: "pin", label: "Location pin" },
    ],
  },
  {
    name: "Stars & Nature",
    shapes: [
      { kind: "star", label: "Star" },
      { kind: "starburst", label: "Starburst" },
      { kind: "flower", label: "Flower" },
      { kind: "gear", label: "Gear" },
      { kind: "heart", label: "Heart" },
      { kind: "lightning", label: "Lightning" },
      { kind: "drop", label: "Drop" },
      { kind: "moon", label: "Moon" },
      { kind: "leaf", label: "Leaf" },
      { kind: "blob", label: "Blob" },
      { kind: "cloud", label: "Cloud" },
    ],
  },
  {
    name: "Cyber",
    shapes: [
      { kind: "holographic_grid", label: "Holographic Grid" },
      { kind: "glitch", label: "Glitch" },
      { kind: "honeycomb", label: "Honeycomb" },
      { kind: "circuit", label: "Circuit Traces" },
      { kind: "cyber_frame", label: "Panel Frame" },
      { kind: "data_shard", label: "Data Shard" },
      { kind: "tech_chevron", label: "Tech Chevron" },
      { kind: "scanner", label: "Scanner Reticle" },
      { kind: "ring", label: "Neon Ring" },
      { kind: "hex_ring", label: "Hex Ring" },
      { kind: "angular_frame", label: "Angular Frame" },
      { kind: "corner_bracket", label: "Corner Bracket" },
    ],
  },
  {
    name: "Bubbles & Badges",
    shapes: [
      { kind: "speech", label: "Speech" },
      { kind: "shield", label: "Shield" },
      { kind: "ticket", label: "Ticket" },
      { kind: "bookmark", label: "Bookmark" },
      { kind: "flag", label: "Flag" },
      { kind: "ribbon", label: "Ribbon" },
    ],
  },
  {
    name: "Decorative",
    shapes: [
      { kind: "frame_cut", label: "Cut Frame" },
      { kind: "diagonal_stripes", label: "Diagonal Stripes" },
      { kind: "dot_grid", label: "Dot Grid" },
      { kind: "dotted_triangle", label: "Dotted Triangle" },
      { kind: "accent_slash", label: "Accent Slash" },
      { kind: "wave", label: "Wave" },
    ],
  },
];

export function ShapesPanel({ embedded = false }: { embedded?: boolean }) {
  const { add } = useEditor();
  const [customFrom, setCustomFrom] = useState("#7df9ff");
  const [customTo, setCustomTo] = useState("#ff0080");
  const [customAngle, setCustomAngle] = useState(45);
  const [customKind, setCustomKind] = useState<ShapeKind>("rect");
  const [category, setCategory] = useState(SHAPE_CATEGORIES[0].name);
  const activeShapes = SHAPE_CATEGORIES.find((c) => c.name === category)?.shapes ?? [];

  const addCustomGradient = () => {
    add(
      newShape(customKind, {
        fill: customFrom,
        stroke: "transparent",
        strokeWidth: 0,
        cornerRadius: customKind === "rect" ? 24 : 0,
        gradient: { from: customFrom, to: customTo, angle: customAngle, type: "linear" },
      }),
    );
  };

  return (
    <div className="space-y-4">
      {!embedded && <PanelHeader title="Shapes" />}

      <ChipGroup
        value={category}
        options={SHAPE_CATEGORIES.map((c) => ({
          value: c.name,
          label: `${c.name} (${c.shapes.length})`,
        }))}
        onChange={setCategory}
        label="Shape categories"
      />
      <OptionGrid
        columns={3}
        label="Shapes"
        options={activeShapes.map((s) => ({
          value: s.kind,
          label: s.label,
          preview: <ShapePreview kind={s.kind} fill="#9ca3af" />,
        }))}
        onChange={(kind) => add(newShape(kind, { fill: "#9ca3af", stroke: "#0a0f1f" }))}
      />

      <div className="brutal-border-2 bg-surface p-3">
        <div className="mb-3 font-display text-[10px] uppercase tracking-[0.2em] text-teal/80">
          ▸ Custom gradient
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-mono text-[9px] text-teal/70">
            FROM
            <input
              aria-label="Gradient start color"
              type="color"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 w-12 cursor-pointer border-2 border-teal/30 bg-transparent p-0"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] text-teal/70">
            TO
            <input
              aria-label="Gradient end color"
              type="color"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 w-12 cursor-pointer border-2 border-teal/30 bg-transparent p-0"
            />
          </label>
          <label className="flex min-w-28 flex-1 flex-col gap-1 font-mono text-[9px] text-teal/70">
            ANGLE · {customAngle}°
            <input
              aria-label="Gradient angle"
              type="range"
              min="0"
              max="360"
              value={customAngle}
              onChange={(e) => setCustomAngle(Number(e.target.value))}
              className="accent-teal"
            />
          </label>
          <button
            type="button"
            onClick={addCustomGradient}
            className="brutal-border brutal-press h-8 bg-blue px-3 font-display text-[10px] tracking-[0.12em] text-ink"
          >
            ADD
          </button>
        </div>
        <div className="my-3">
          <OptionGrid
            columns={3}
            label="Custom gradient shape"
            value={customKind}
            onChange={setCustomKind}
            options={(
              [
                "rect",
                "circle",
                "triangle",
                "star",
                "heart",
                "hexagon",
                "diamond",
                "shield",
                "blob",
              ] as ShapeKind[]
            ).map((kind) => ({
              value: kind,
              label: kind === "rect" ? "Rectangle" : kind,
              preview: <ShapePreview kind={kind} fill="#9ca3af" />,
            }))}
          />
        </div>
        <div
          className="mt-3 h-5 border border-teal/30"
          style={{ background: `linear-gradient(${customAngle}deg, ${customFrom}, ${customTo})` }}
          aria-label="Custom gradient preview"
        />
      </div>
    </div>
  );
}

function ShapePreview({ kind, fill }: { kind: ShapeKind; fill: string }) {
  const stroke = fill === "#0a0f1f" ? "#7df9ff" : "#0a0f1f";
  const sw = 3;
  if (kind === "rect")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <rect x="3" y="3" width="38" height="38" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "circle")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="19" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "triangle")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon points="22,4 40,40 4,40" fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  if (kind === "star")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon
          points="22,4 27,17 41,17 30,26 34,40 22,32 10,40 14,26 3,17 17,17"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  if (kind === "arrow")
    return (
      <svg width="44" height="44" viewBox="0 0 44 44">
        <polygon
          points="3,17 28,17 28,8 41,22 28,36 28,27 3,27"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    );
  const d = shapePathD(kind);
  if (!d) return null;
  return (
    <svg width="44" height="44" viewBox="0 0 100 100">
      <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}
