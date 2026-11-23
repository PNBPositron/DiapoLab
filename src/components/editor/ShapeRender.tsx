import type { ShapeElement, ShapeKind } from "@/store/editor";

// Shapes drawn as outline + inner cut-out need even-odd filling to keep the hole.
export const EVENODD_SHAPES: ShapeKind[] = [
  "frame_cut",
  "ring",
  "hex_ring",
  "angular_frame",
  "tag_badge",
];

// Open line-art shapes should render with stroke only (no accidental SVG fill polygons).
export const STROKE_ONLY_SHAPES: ShapeKind[] = [
  "circuit",
  "cyber_frame",
  "scanner",
  "corner_bracket",
];

function dotGridPath(cols = 6, rows = 5, r = 3.2): string {
  const parts: string[] = [];
  const stepX = 100 / (cols + 1);
  const stepY = 100 / (rows + 1);
  for (let i = 1; i <= cols; i++) {
    for (let j = 1; j <= rows; j++) {
      const cx = i * stepX;
      const cy = j * stepY;
      parts.push(`M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`);
    }
  }
  return parts.join(" ");
}

function dottedTrianglePath(perSide = 7, r = 3): string {
  const pts: Array<[number, number]> = [
    [50, 6],
    [95, 92],
    [5, 92],
  ];
  const parts: string[] = [];
  for (let s = 0; s < 3; s++) {
    const [x1, y1] = pts[s];
    const [x2, y2] = pts[(s + 1) % 3];
    for (let i = 0; i < perSide; i++) {
      const t = i / perSide;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      parts.push(`M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`);
    }
  }
  return parts.join(" ");
}

function radialStarPath(points: number, rOuter = 47, rInner = 29, rounded = false): string {
  const step = Math.PI / points;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = i * step - Math.PI / 2;
    pts.push([+(50 + Math.cos(a) * r).toFixed(2), +(50 + Math.sin(a) * r).toFixed(2)]);
  }
  if (!rounded) {
    return `M${pts.map((p) => `${p[0]} ${p[1]}`).join(" L")} Z`;
  }
  // Smooth scalloped seal via quadratic curves through midpoints
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    +((a[0] + b[0]) / 2).toFixed(2),
    +((a[1] + b[1]) / 2).toFixed(2),
  ];
  const start = mid(pts[pts.length - 1], pts[0]);
  const segs = [`M${start[0]} ${start[1]}`];
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const m = mid(pts[i], next);
    segs.push(`Q${pts[i][0]} ${pts[i][1]} ${m[0]} ${m[1]}`);
  }
  segs.push("Z");
  return segs.join(" ");
}

function flowerPath(petals = 6, rOuter = 46, rInner = 20): string {
  const parts: string[] = [];
  const step = (Math.PI * 2) / petals;
  for (let i = 0; i < petals; i++) {
    const a0 = i * step - Math.PI / 2 - step * 0.42;
    const aMid = i * step - Math.PI / 2;
    const a1 = i * step - Math.PI / 2 + step * 0.42;
    const sx = +(50 + Math.cos(a0) * rInner).toFixed(2);
    const sy = +(50 + Math.sin(a0) * rInner).toFixed(2);
    const ex = +(50 + Math.cos(a1) * rInner).toFixed(2);
    const ey = +(50 + Math.sin(a1) * rInner).toFixed(2);
    const cx1 = +(50 + Math.cos(aMid - step * 0.28) * (rOuter * 1.12)).toFixed(2);
    const cy1 = +(50 + Math.sin(aMid - step * 0.28) * (rOuter * 1.12)).toFixed(2);
    const cx2 = +(50 + Math.cos(aMid + step * 0.28) * (rOuter * 1.12)).toFixed(2);
    const cy2 = +(50 + Math.sin(aMid + step * 0.28) * (rOuter * 1.12)).toFixed(2);
    if (i === 0) parts.push(`M${sx} ${sy}`);
    else parts.push(`L${sx} ${sy}`);
    parts.push(`C${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

const SEAL_PATH = radialStarPath(12, 47, 36, true);
const SUNBURST_PATH = radialStarPath(12, 47, 25, false);
const FLOWER_PATH = flowerPath(6, 46, 18);

// Reusable path generators (normalized 0-100 viewBox) so previews and canvas share geometry.
export function pathFor(kind: ShapeKind): string | null {
  switch (kind) {
    case "rounded_rect":
      return "M18 8 H82 A14 14 0 0 1 96 22 V78 A14 14 0 0 1 82 92 H18 A14 14 0 0 1 4 78 V22 A14 14 0 0 1 18 8 Z";
    case "squircle":
      return "M50 4 C82 4 96 18 96 50 C96 82 82 96 50 96 C18 96 4 82 4 50 C4 18 18 4 50 4 Z";
    case "right_triangle":
      return "M6 6 L94 94 H6 Z";
    case "arch":
      return "M12 94 V46 A38 38 0 0 1 88 46 V94 Z";
    case "burst4":
      return "M50 4 L63 37 L96 50 L63 63 L50 96 L37 63 L4 50 L37 37 Z";
    case "arrow_left":
      return "M94 34 H44 V10 L6 50 L44 90 V66 H94 Z";
    case "arrow_up":
      return "M50 6 L90 44 H66 V94 H34 V44 H10 Z";
    case "arrow_down":
      return "M34 6 H66 V56 H90 L50 94 L10 56 H34 Z";
    case "double_arrow":
      return "M6 50 L32 20 V37 H68 V20 L94 50 L68 80 V63 H32 V80 Z";
    case "process_step":
      return "M6 16 H74 L94 50 L74 84 H6 L26 50 Z";
    case "curved_arrow":
      return "M14 82 C14 40 40 26 68 26 V10 L94 34 L68 58 V42 C48 42 32 50 32 82 Z";
    case "thought_bubble":
      return "M24 66 C10 66 6 54 14 44 C8 32 18 18 34 20 C40 8 62 8 68 20 C84 18 94 32 86 44 C94 56 84 66 70 66 Z M27 72 A6 6 0 1 0 27 84 A6 6 0 1 0 27 72 Z M14 86 A4 4 0 1 0 14 94 A4 4 0 1 0 14 86 Z";
    case "tag_badge":
      return "M8 22 H64 L94 50 L64 78 H8 Z M23 44 A6 6 0 1 1 23 56 A6 6 0 1 1 23 44 Z";
    case "curly_brace":
      return "M64 6 C47 6 40 15 40 30 V39 C40 45 34 49 24 50 C34 51 40 55 40 61 V70 C40 85 47 94 64 94 H72 V84 H64 C55 84 52 79 52 69 V58 C52 53 48 51 43 50 C48 49 52 47 52 42 V31 C52 21 55 16 64 16 H72 V6 Z";
    case "seal":
      return SEAL_PATH;
    case "sunburst":
      return SUNBURST_PATH;
    case "clover":
      return "M50 50 C30 34 30 8 50 8 C70 8 70 34 50 50 C66 30 92 30 92 50 C92 70 66 70 50 50 C70 66 70 92 50 92 C30 92 30 66 50 50 C34 70 8 70 8 50 C8 30 34 30 50 50 Z";
    case "banner_fold":
      return "M8 22 H92 L79 50 L92 78 H8 L21 50 Z";
    case "frame_cut":
      return "M3 3 H70 L97 30 V97 H30 L3 70 Z M12 12 L12 66 L34 88 L88 88 L88 34 L66 12 Z";
    case "diagonal_stripes":
      return "M0 32 L32 0 H54 L0 54 Z M0 74 L74 0 H94 L0 94 Z M26 100 L100 26 V46 L46 100 Z M70 100 L100 70 V88 L88 100 Z";
    case "dot_grid":
      return dotGridPath();
    case "dotted_triangle":
      return dottedTrianglePath();
    case "accent_slash":
      return "M56 3 H80 L32 97 H8 Z M88 3 H99 L74 52 H63 Z";
    case "heart":
      return "M50 88 C 18 66, 6 44, 18 26 C 28 12, 44 14, 50 28 C 56 14, 72 12, 82 26 C 94 44, 82 66, 50 88 Z";
    case "diamond":
      return "M50 4 L 96 50 L 50 96 L 4 50 Z";
    case "hexagon":
      return "M25 6 L 75 6 L 96 50 L 75 94 L 25 94 L 4 50 Z";
    case "holographic_grid":
      return "M4 4 H96 V96 H4 Z M4 28 H96 M4 52 H96 M4 76 H96 M28 4 V96 M52 4 V96 M76 4 V96";
    case "glitch":
      return "M6 12 H72 L60 30 H94 L78 52 H44 L58 68 H8 L22 44 H6 Z";
    case "honeycomb":
      return "M25 5 H75 L97 50 L75 95 H25 L3 50 Z M25 5 V95 M75 5 V95 M3 50 H97";
    case "circuit":
      return "M6 20 H30 L40 30 H62 L72 20 H94 M6 50 H26 L36 40 H64 L74 50 H94 M6 80 H30 L40 70 H62 L72 80 H94 M20 6 V20 M80 6 V20 M20 80 V94 M80 80 V94 M50 30 V70";
    case "cyber_frame":
      return "M6 30 V6 H34 M66 6 H94 V30 M94 70 V94 H66 M34 94 H6 V70 M18 18 H38 L44 12 H82 V38 M82 62 V82 H62 L56 88 H18 V62";
    case "data_shard":
      return "M48 3 L90 26 L72 48 L94 70 L54 97 L8 72 L28 51 L12 28 Z M48 3 L54 97 M12 28 L90 26 M28 51 L72 48";
    case "tech_chevron":
      return "M6 18 L36 50 L6 82 L26 82 L56 50 L26 18 Z M44 18 L74 50 L44 82 L64 82 L94 50 L64 18 Z";
    case "scanner":
      return "M10 28 V10 H32 M68 10 H90 V28 M90 72 V90 H68 M32 90 H10 V72 M18 50 H82 M26 40 H74 M34 60 H66";
    case "ring":
      return "M50 5 A45 45 0 1 1 50 95 A45 45 0 1 1 50 5 M50 22 A28 28 0 1 0 50 78 A28 28 0 1 0 50 22";
    case "hex_ring":
      return "M25 7 H75 L97 50 L75 93 H25 L3 50 Z M32 25 H68 L81 50 L68 75 H32 L19 50 Z";
    case "angular_frame":
      return "M4 28 L28 4 H72 L96 28 V72 L72 96 H28 L4 72 Z M16 34 L34 16 H66 L84 34 V66 L66 84 H34 L16 66 Z";
    case "corner_bracket":
      return "M8 36 V8 H36 M64 8 H92 V36 M92 64 V92 H64 M36 92 H8 V64 M18 42 V18 H42 M58 18 H82 V42 M82 58 V82 H58 M42 82 H18 V58";
    case "pentagon":
      return "M50 4 L 96 38 L 78 94 L 22 94 L 4 38 Z";
    case "parallelogram":
      return "M22 8 L 96 8 L 78 92 L 4 92 Z";
    case "trapezoid":
      return "M22 8 L 78 8 L 96 92 L 4 92 Z";
    case "cross":
      return "M38 4 L62 4 L62 38 L96 38 L96 62 L62 62 L62 96 L38 96 L38 62 L4 62 L4 38 L38 38 Z";
    case "lightning":
      return "M58 4 L 18 56 L 44 56 L 36 96 L 82 40 L 54 40 L 64 4 Z";
    case "cloud":
      return "M22 72 C 4 72, 4 46, 22 46 C 22 28, 48 22, 54 38 C 64 26, 84 32, 84 50 C 96 50, 96 72, 84 72 Z";
    case "speech":
      return "M14 12 H86 A10 10 0 0 1 96 22 V60 A10 10 0 0 1 86 70 H46 L24 90 L28 70 H14 A10 10 0 0 1 4 60 V22 A10 10 0 0 1 14 12 Z";
    case "octagon":
      return "M33 3 H67 L97 33 V67 L67 97 H33 L3 67 V33 Z";
    case "capsule":
      return "M25 3 H75 A47 47 0 0 1 75 97 H25 A47 47 0 0 1 25 3 Z";
    case "semicircle":
      return "M5 92 A45 45 0 0 1 95 92 Z";
    case "quarter_circle":
      return "M5 95 H95 A90 90 0 0 0 5 5 Z";
    case "chevron":
      return "M6 8 L50 50 L6 92 L26 92 L70 50 L26 8 Z";
    case "starburst":
      return "M50 3 L62.2 20.4 L83.2 16.8 L79.6 37.8 L97 50 L79.6 62.2 L83.2 83.2 L62.2 79.6 L50 97 L37.8 79.6 L16.8 83.2 L20.4 62.2 L3 50 L20.4 37.8 L16.8 16.8 L37.8 20.4 Z";
    case "flower":
      return FLOWER_PATH;
    case "gear":
      return "M86 50 L84.4 60.6 L94.3 68.4 L87 80.6 L75.5 75.5 L66.8 81.8 L68.4 94.3 L54.5 97.8 L50 86 L39.4 84.4 L31.6 94.3 L19.4 87 L24.5 75.5 L18.2 66.8 L5.7 68.4 L2.2 54.5 L14 50 L15.6 39.4 L5.7 31.6 L13 19.4 L24.5 24.5 L33.2 18.2 L31.6 5.7 L45.5 2.2 L50 14 L60.6 15.6 L68.4 5.7 L80.6 13 L75.5 24.5 L81.8 33.2 L94.3 31.6 L97.8 45.5 Z";
    case "shield":
      return "M50 4 L92 18 V52 C92 76 72 90 50 96 C28 90 8 76 8 52 V18 Z";
    case "drop":
      return "M50 4 C50 4 88 46 88 66 A38 38 0 0 1 12 66 C12 46 50 4 50 4 Z";
    case "pin":
      return "M50 4 C28 4 12 20 12 42 C12 66 50 96 50 96 C50 96 88 66 88 42 C88 20 72 4 50 4 Z";
    case "flag":
      return "M18 4 H82 L68 26 L82 48 H18 Z";
    case "ticket":
      return "M8 25 H92 V42 A8 8 0 0 0 92 58 V75 H8 V58 A8 8 0 0 0 8 42 Z";
    case "bookmark":
      return "M25 4 H75 V96 L50 74 L25 96 Z";
    case "blob":
      return "M37 6 C62 -2 92 16 94 42 C96 66 78 92 52 95 C26 98 6 80 5 54 C4 30 14 12 37 6 Z";
    case "moon":
      return "M62 6 A44 44 0 1 0 62 94 A36 36 0 1 1 62 6 Z";
    case "wave":
      return "M4 62 C22 38 40 38 50 50 C60 62 78 62 96 38 V96 H4 Z";
    case "leaf":
      return "M8 92 C8 40 40 8 92 8 C92 60 60 92 8 92 Z";
    case "ribbon":
      return "M8 14 H92 L76 50 L92 86 H8 L24 50 Z";
    case "sparkle4":
      return "M50 2 C55 30 70 45 98 50 C70 55 55 70 50 98 C45 70 30 55 2 50 C30 45 45 30 50 2 Z";
    case "confetti":
      return "M18 10 H32 V18 H18 Z M58 4 A7 7 0 1 0 58.1 4 Z M76 38 H90 V46 H76 Z M28 58 A6 6 0 1 0 28.1 58 Z M60 76 H74 V84 H60 Z M10 84 H24 V92 H10 Z";
    case "crown":
      return "M8 80 V32 L30 52 L50 18 L70 52 L92 32 V80 Z";
    case "gem":
      return "M30 10 H70 L94 40 L50 94 L6 40 Z";
    case "rocket":
      return "M50 2 C66 18 72 44 66 66 L80 86 L60 78 L54 94 H46 L40 78 L20 86 L34 66 C28 44 34 18 50 2 Z";
    case "balloon":
      return "M50 2 C70 2 84 18 84 38 C84 58 66 70 55 73 L59 98 H41 L45 73 C34 70 16 58 16 38 C16 18 30 2 50 2 Z";
    case "rainbow":
      return "M50 16 A46 46 0 0 1 96 62 H78 A28 28 0 0 0 22 62 H4 A46 46 0 0 1 50 16 Z";
    default:
      return null;
  }
}

export function shapePathD(kind: ShapeKind): string | null {
  return pathFor(kind);
}

export function ShapeRender({
  element,
  fillOverride,
}: {
  element: ShapeElement;
  /** replaces the shape's own fill/gradient/image overlay (used for slide-bg knockout) */
  fillOverride?: string;
}) {
  const { shape, fill, stroke, strokeWidth, width, height, gradient, cornerRadius, imageOverlay } =
    element;
  const gradId = `g-${element.id}`;
  const imageId = `image-${element.id}`;
  const fillRef = fillOverride ?? (imageOverlay ? `url(#${imageId})` : gradient ? `url(#${gradId})` : fill);
  const defs =
    fillOverride
      ? null
      : gradient || imageOverlay ? (
      <defs>
        {imageOverlay && (
          <pattern id={imageId} patternUnits="objectBoundingBox" width="1" height="1">
            <image
              href={imageOverlay}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        )}
        {gradient &&
          ((gradient.type ?? "linear") === "radial" ? (
            <radialGradient
              id={gradId}
              gradientUnits="objectBoundingBox"
              cx="0.5"
              cy="0.5"
              r="0.75"
            >
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </radialGradient>
          ) : (
            <linearGradient
              id={gradId}
              gradientUnits="objectBoundingBox"
              x1="0"
              y1="0"
              x2={Math.cos((gradient.angle * Math.PI) / 180)}
              y2={Math.sin((gradient.angle * Math.PI) / 180)}
            >
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          ))}
        </defs>
    ) : null;
  const dash =
    element.strokeStyle === "dashed"
      ? `${Math.max(6, strokeWidth * 3)} ${Math.max(4, strokeWidth * 2)}`
      : element.strokeStyle === "dotted"
        ? `0.1 ${Math.max(4, strokeWidth * 2.2)}`
        : undefined;
  const common = {
    width: "100%",
    height: "100%",
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "none" as const,
    strokeDasharray: dash,
    strokeLinecap: element.strokeStyle === "dotted" ? ("round" as const) : undefined,
    style: { opacity: element.opacity ?? 1 },
  };
  if (shape === "rect") {
    const r = Math.max(0, cornerRadius ?? 0);
    return (
      <svg {...common}>
        {defs}
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={width - strokeWidth}
          height={height - strokeWidth}
          rx={r}
          ry={r}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }
  if (shape === "circle") {
    return (
      <svg {...common}>
        {defs}
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={width / 2 - strokeWidth / 2}
          ry={height / 2 - strokeWidth / 2}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }
  if (shape === "triangle") {
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={`${width / 2},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  if (shape === "star") {
    const cx = width / 2,
      cy = height / 2;
    const rO = Math.min(width, height) / 2 - strokeWidth;
    const rI = rO * 0.45;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rO : rI;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={pts.join(" ")}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  if (shape === "arrow") {
    const h = height;
    const w = width;
    const tail = h * 0.3;
    const headW = w * 0.35;
    return (
      <svg {...common}>
        {defs}
        <polygon
          points={`${strokeWidth},${h / 2 - tail / 2} ${w - headW},${h / 2 - tail / 2} ${w - headW},${strokeWidth} ${w - strokeWidth},${h / 2} ${w - headW},${h - strokeWidth} ${w - headW},${h / 2 + tail / 2} ${strokeWidth},${h / 2 + tail / 2}`}
          fill={fillRef}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    );
  }
  const d = pathFor(shape);
  if (d) {
    const strokeOnly = STROKE_ONLY_SHAPES.includes(shape);
    const isRounded =
      strokeOnly ||
      shape === "rounded_rect" ||
      shape === "squircle" ||
      shape === "speech" ||
      shape === "thought_bubble" ||
      shape === "cloud" ||
      shape === "flower" ||
      shape === "clover" ||
      shape === "seal" ||
      shape === "blob" ||
      shape === "drop" ||
      shape === "heart" ||
      shape === "wave";
    const resolvedStroke =
      strokeOnly && (stroke === "transparent" || strokeWidth <= 0)
        ? fillRef === "transparent"
          ? "#2563eb"
          : fillRef
        : stroke;
    const resolvedStrokeWidth =
      strokeOnly && (stroke === "transparent" || strokeWidth <= 0)
        ? 4
        : strokeWidth / 2;
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        strokeDasharray={dash}
        style={{ opacity: element.opacity ?? 1 }}
      >
        {defs}
        <path
          d={d}
          fillRule={!strokeOnly && EVENODD_SHAPES.includes(shape) ? "evenodd" : undefined}
          fill={strokeOnly ? "none" : fillRef}
          stroke={resolvedStroke}
          strokeWidth={resolvedStrokeWidth}
          strokeLinecap={isRounded ? "round" : undefined}
          strokeLinejoin={isRounded ? "round" : "miter"}
        />
      </svg>
    );
  }
  return null;
}
