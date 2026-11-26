import type { PublicTemplate } from "@/lib/designs";
import type {
  AnyElement,
  ButtonElement,
  ChartElement,
  ChartKind,
  Page,
  QrElement,
  QuizElement,
  ShapeElement,
  TableElement,
  TextElement,
  UiElement,
  UiKind,
  UiStyle,
} from "@/store/editor";
import {
  UI_STYLE_THEMES,
  chartStylePatch,
  quizStylePatch,
  tableStylePatch,
} from "@/store/editor";

const W = 1920;
const H = 1080;

const t = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<TextElement> = {},
): TextElement => ({
  id,
  type: "text",
  x,
  y,
  width,
  height,
  rotation: 0,
  text,
  fontSize: 48,
  fontFamily: "Plus Jakarta Sans",
  fontWeight: 700,
  color: "#0f172a",
  align: "left",
  ...opts,
});

const rect = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<ShapeElement> = {},
): ShapeElement => ({
  id,
  type: "shape",
  shape: "rect",
  x,
  y,
  width,
  height,
  rotation: 0,
  fill: "#e2e8f0",
  stroke: "#cbd5e1",
  strokeWidth: 0,
  cornerRadius: 20,
  ...opts,
});

const ui = (
  id: string,
  kind: UiKind,
  uiStyle: UiStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<UiElement> = {},
): UiElement => {
  const theme = UI_STYLE_THEMES[uiStyle] ?? UI_STYLE_THEMES.cyber;
  return {
    id,
    type: "ui",
    kind,
    uiStyle,
    x,
    y,
    width,
    height,
    rotation: 0,
    title: "",
    body: "",
    value: 0,
    items: [],
    accentColor: theme.accent,
    ...opts,
  };
};

const chart = (
  id: string,
  kind: ChartKind,
  uiStyle: UiStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<ChartElement> = {},
): ChartElement => {
  const patch = chartStylePatch(uiStyle);
  return {
    id,
    type: "chart",
    chart: kind,
    x,
    y,
    width,
    height,
    rotation: 0,
    data: [
      { label: "Q1", value: 38 },
      { label: "Q2", value: 54 },
      { label: "Q3", value: 72 },
      { label: "Q4", value: 96 },
    ],
    colors: patch.colors ?? ["#2563eb", "#7dd3fc", "#f472b6", "#facc15"],
    bgColor: patch.bgColor ?? "#ffffff",
    fgColor: patch.fgColor ?? "#0f172a",
    title: "Growth Overview",
    showValues: true,
    showAxes: true,
    uiStyle,
    ...opts,
  };
};

const table = (
  id: string,
  uiStyle: UiStyle,
  x: number,
  y: number,
  width: number,
  height: number,
  rows: string[][],
  opts: Partial<TableElement> = {},
): TableElement => {
  const patch = tableStylePatch(uiStyle);
  return {
    id,
    type: "table",
    x,
    y,
    width,
    height,
    rotation: 0,
    rows,
    headerRow: true,
    zebra: true,
    firstColBold: true,
    bgColor: patch.bgColor ?? "#ffffff",
    fgColor: patch.fgColor ?? "#0f172a",
    accentColor: patch.accentColor ?? "#2563eb",
    tableStyle: uiStyle,
    fontSize: 20,
    ...opts,
  };
};

const btn = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<ButtonElement> = {},
): ButtonElement => ({
  id,
  type: "button",
  x,
  y,
  width,
  height,
  rotation: 0,
  text,
  bgColor: "#2563eb",
  fgColor: "#ffffff",
  borderColor: "#1d4ed8",
  borderWidth: 0,
  cornerRadius: 14,
  fontSize: 28,
  fontFamily: "Plus Jakarta Sans",
  fontWeight: 700,
  action: "next-slide",
  ...opts,
});

const quiz = (
  id: string,
  uiStyle: UiStyle,
  mode: "quiz" | "poll",
  x: number,
  y: number,
  width: number,
  height: number,
  question: string,
  options: string[],
  opts: Partial<QuizElement> = {},
): QuizElement => {
  const patch = quizStylePatch(uiStyle);
  const mapped = options.map((label, i) => ({ id: `${id}-o${i}`, text: label }));
  return {
    id,
    type: "quiz",
    mode,
    x,
    y,
    width,
    height,
    rotation: 0,
    question,
    options: mapped,
    correctId: mapped[0]?.id ?? "",
    bgColor: patch.bgColor ?? "#ffffff",
    fgColor: patch.fgColor ?? "#0f172a",
    accentColor: patch.accentColor ?? "#2563eb",
    uiStyle,
    ...opts,
  };
};

const qr = (
  id: string,
  value: string,
  x: number,
  y: number,
  size: number,
  fgColor = "#0f172a",
  bgColor = "#ffffff",
): QrElement => ({
  id,
  type: "qr",
  x,
  y,
  width: size,
  height: size,
  rotation: 0,
  value,
  fgColor,
  bgColor,
});

const page = (
  id: string,
  bgColor: string,
  elements: AnyElement[],
  transition: Page["transition"] = "fade",
): Page => ({
  id,
  bgColor,
  elements,
  transition,
  duration: 3,
});

/* -------------------------------------------------------------------------- */
/* Built-in Multi-Slide Presentation Decks                                    */
/* -------------------------------------------------------------------------- */

const SAAS_SERIES_A: Page[] = [
  page(
    "saas-1",
    "linear-gradient(135deg, #0b132b 0%, #162447 55%, #1f4068 100%)",
    [
      rect("saas-1-glow", 1220, -140, 820, 820, {
        shape: "circle",
        fill: "#3b82f6",
        opacity: 0.16,
      }),
      ui("saas-1-badge", "badge", "midnight", 140, 210, 340, 74, {
        title: "SERIES A · 2026",
        accentColor: "#60a5fa",
      }),
      t("saas-1-title", "Automating supply chains with real-time telemetry", 140, 320, 1280, 250, {
        fontSize: 96,
        fontWeight: 800,
        color: "#f8fafc",
      }),
      t(
        "saas-1-sub",
        "Connecting 4,200 regional warehouses into a unified predictive logistics network.",
        140,
        610,
        1040,
        120,
        { fontSize: 34, fontWeight: 400, color: "#cbd5e1" },
      ),
      btn("saas-1-btn", "Explore the deck →", 140, 790, 340, 84, {
        bgColor: "#3b82f6",
        fgColor: "#ffffff",
      }),
    ],
    "fade",
  ),
  page(
    "saas-2",
    "#f8fafc",
    [
      t("saas-2-kicker", "01 · PROBLEM & OPPORTUNITY", 140, 95, 640, 48, {
        fontSize: 22,
        color: "#2563eb",
      }),
      t("saas-2-h", "Legacy planning breaks under multi-tier volatility", 140, 150, 1500, 100, {
        fontSize: 60,
        fontWeight: 800,
      }),
      ui("saas-2-c1", "card", "aqua", 140, 300, 780, 590, {
        title: "Before: Fragmented Spreadsheets",
        body: "Manual weekly forecasts, siloed ERP exports, and 14-day blind spots whenever port or carrier delays strike.",
        accentColor: "#e11d48",
      }),
      ui("saas-2-c2", "card", "aurora", 980, 300, 800, 590, {
        title: "With Northstar OS",
        body: "Live SKU velocity streaming, automated safety-stock rebalancing, and sub-minute supplier rerouting across 38 countries.",
        accentColor: "#2563eb",
      }),
    ],
    "slide",
  ),
  page(
    "saas-3",
    "#ffffff",
    [
      t("saas-3-kicker", "02 · TRACTION", 140, 95, 600, 48, {
        fontSize: 22,
        color: "#2563eb",
      }),
      t("saas-3-h", "3.4× ARR growth with 138% net dollar retention", 140, 150, 1580, 100, {
        fontSize: 58,
        fontWeight: 800,
      }),
      ui("saas-3-s1", "stat", "aqua", 140, 290, 480, 230, {
        title: "Annual Recurring Revenue",
        value: 8400,
        body: "$8.4M ARR (+240% YoY)",
      }),
      ui("saas-3-s2", "stat", "aqua", 140, 550, 480, 230, {
        title: "Enterprise Customers",
        value: 142,
        body: "Avg ACV $59,000",
      }),
      chart("saas-3-chart", "area", "aurora", 670, 290, 1110, 640, {
        title: "Quarterly Net Revenue ($K)",
        data: [
          { label: "Q1 '25", value: 920 },
          { label: "Q2 '25", value: 1380 },
          { label: "Q3 '25", value: 2150 },
          { label: "Q4 '25", value: 3290 },
          { label: "Q1 '26", value: 4820 },
        ],
      }),
    ],
    "morph",
  ),
  page(
    "saas-4",
    "#f8fafc",
    [
      t("saas-4-kicker", "03 · UNIT ECONOMICS", 140, 95, 600, 48, {
        fontSize: 22,
        color: "#2563eb",
      }),
      t("saas-4-h", "Predictable enterprise expansion across tiers", 140, 150, 1480, 100, {
        fontSize: 58,
        fontWeight: 800,
      }),
      table(
        "saas-4-tbl",
        "aqua",
        140,
        300,
        1640,
        580,
        [
          ["Metric", "2024 Actual", "2025 Actual", "2026 Plan"],
          ["Gross Margin", "78%", "82%", "85%"],
          ["CAC Payback", "14 months", "9 months", "7 months"],
          ["Net Dollar Retention", "118%", "138%", "142%"],
          ["Enterprise Logos", "48", "142", "310"],
        ],
        { fontSize: 26 },
      ),
    ],
    "slide",
  ),
  page(
    "saas-5",
    "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
    [
      t("saas-5-h", "Raising $18M Series A to scale autonomous routing", 140, 150, 1600, 120, {
        fontSize: 64,
        fontWeight: 800,
        color: "#ffffff",
      }),
      ui("saas-5-tl", "timeline", "midnight", 140, 330, 1040, 460, {
        title: "18-Month Milestone Plan",
        body: "Engineering · EU Launch · Carrier Graph",
        value: 65,
        items: ["ML Forecasting v3", "Rotterdam & Singapore Hubs", "Autonomous Carrier API"],
      }),
      ui("saas-5-card", "card", "midnight", 1230, 330, 550, 460, {
        title: "Use of Funds",
        body: "55% R&D & Data Engineering\n30% Enterprise Go-to-Market\n15% Partner Ecosystem",
        accentColor: "#60a5fa",
      }),
    ],
    "fade",
  ),
];

const CYBER_SYSTEMS: Page[] = [
  page(
    "cyb-1",
    "linear-gradient(150deg, #050814 0%, #0b1428 60%, #091d2e 100%)",
    [
      rect("cyb-1-ring", 1320, 180, 480, 480, {
        shape: "circle",
        fill: "transparent",
        stroke: "#22d3ee",
        strokeWidth: 3,
        opacity: 0.45,
      }),
      ui("cyb-1-kbd", "kbd", "cyber", 140, 200, 360, 100, {
        title: "SYS // ARCH v4.2",
        body: "Zero-trust mesh",
      }),
      t("cyb-1-h", "Edge Compute & Telemetry Fabric", 140, 340, 1200, 220, {
        fontSize: 92,
        fontWeight: 800,
        fontFamily: "Space Grotesk",
        color: "#ecfeff",
      }),
      t("cyb-1-sub", "Sub-12ms global packet verification across 64 edge PoPs.", 140, 590, 1050, 90, {
        fontSize: 32,
        fontWeight: 400,
        color: "#67e8f9",
      }),
    ],
    "fade",
  ),
  page(
    "cyb-2",
    "#060b16",
    [
      t("cyb-2-h", "Runtime Verification Pipeline", 120, 85, 1100, 90, {
        fontSize: 56,
        color: "#d9f5ff",
      }),
      ui("cyb-2-code", "code", "cyber", 120, 210, 840, 680, {
        title: "verifyEdgeNode.ts",
        body: 'export async function verifyNode(pkt: Packet) {\n  const sig = await ed25519.verify(pkt.hash);\n  if (!sig.valid) throw new PolicyReject();\n  return dispatchToMesh(pkt.region, sig.ttl);\n}',
      }),
      ui("cyb-2-term", "terminal", "cyber", 1000, 210, 800, 680, {
        title: "mesh-ctl — live cluster",
        body: "mesh status --all",
        items: [
          "$ mesh verify --regions=eu,us,apac",
          "✓ 64/64 edge PoPs attested (8.4ms p99)",
          "✓ Zero policy drift detected",
          "$ telemetry stream --active",
        ],
      }),
    ],
    "slide",
  ),
  page(
    "cyb-3",
    "#060b16",
    [
      t("cyb-3-h", "Throughput vs Legacy Gateways", 120, 85, 1200, 90, {
        fontSize: 56,
        color: "#d9f5ff",
      }),
      chart("cyb-3-ch", "bar", "cyber", 120, 210, 1060, 680, {
        title: "Requests / Second (Thousands)",
        data: [
          { label: "Legacy", value: 18 },
          { label: "Proxy v2", value: 42 },
          { label: "Mesh v3", value: 78 },
          { label: "Edge v4", value: 134 },
        ],
      }),
      ui("cyb-3-s1", "stat", "cyber", 1220, 210, 580, 320, {
        title: "Availability SLA",
        value: 99,
        body: "99.995% uptime across 12 months",
      }),
      ui("cyb-3-s2", "progress", "cyber", 1220, 570, 580, 320, {
        title: "Cluster Capacity",
        body: "Headroom reserved for traffic spikes",
        value: 74,
      }),
    ],
    "fade",
  ),
  page(
    "cyb-4",
    "#050a14",
    [
      t("cyb-4-h", "Live Operations Readiness", 120, 85, 1100, 90, {
        fontSize: 56,
        color: "#d9f5ff",
      }),
      ui("cyb-4-list", "list", "cyber", 120, 220, 940, 620, {
        title: "Pre-Deployment Checks",
        items: [
          "mTLS certificates rotated automatically",
          "Failover drills passed in < 400ms",
          "Audit stream archived to cold vault",
          "On-call runbooks synchronized",
        ],
      }),
      ui("cyb-4-clk", "clock", "cyber", 1120, 220, 680, 360, {
        title: "NOC Cluster Clock",
        body: "Live synchronization",
      }),
      ui("cyb-4-al", "alert", "cyber", 1120, 620, 680, 220, {
        title: "All Nodes Green",
        body: "Cluster telemetry nominal across every availability zone.",
      }),
    ],
    "slide",
  ),
];

const LIQUID_GLASS_LAUNCH: Page[] = [
  page(
    "gls-1",
    "linear-gradient(135deg, #e0f2fe 0%, #ede9fe 52%, #fce7f3 100%)",
    [
      rect("gls-1-blob1", 1180, 120, 580, 580, {
        shape: "circle",
        fill: "#818cf8",
        opacity: 0.28,
      }),
      rect("gls-1-blob2", 1420, 460, 420, 420, {
        shape: "circle",
        fill: "#38bdf8",
        opacity: 0.3,
      }),
      ui("gls-1-hero", "card", "glass", 140, 200, 1180, 640, {
        title: "Introducing Aura 2.0",
        body: "Fluid spatial interfaces designed for calm, tactile daily work — now across desktop, tablet, and pocket.",
      }),
      ui("gls-1-b", "badge", "aurora", 1400, 240, 360, 120, {
        title: "SPRING RELEASE",
      }),
    ],
    "fade",
  ),
  page(
    "gls-2",
    "linear-gradient(140deg, #eff6ff 0%, #f5f3ff 100%)",
    [
      t("gls-2-h", "Built for clarity in every surface", 140, 95, 1400, 96, {
        fontSize: 60,
        fontWeight: 800,
      }),
      ui("gls-2-c1", "card", "glass", 140, 250, 520, 340, {
        title: "Adaptive Depth",
        body: "Background tinting and layered translucency keep hierarchy effortless.",
      }),
      ui("gls-2-c2", "card", "glass", 700, 250, 520, 340, {
        title: "Instant Sync",
        body: "Sub-second state convergence across every active workspace.",
      }),
      ui("gls-2-c3", "card", "glass", 1260, 250, 520, 340, {
        title: "Zero Clutter",
        body: "Contextual controls appear only when your cursor arrives.",
      }),
      ui("gls-2-pr", "progress", "aurora", 140, 640, 1640, 220, {
        title: "Design System Adoption",
        body: "94% of core views migrated to adaptive glass tokens",
        value: 94,
      }),
    ],
    "morph",
  ),
  page(
    "gls-3",
    "linear-gradient(135deg, #e0f2fe 0%, #f5f3ff 100%)",
    [
      t("gls-3-h", "One workspace, every viewport", 140, 90, 1200, 90, {
        fontSize: 58,
      }),
      ui("gls-3-br", "browser", "glass", 140, 220, 1140, 680, {
        title: "Aura Studio Web",
        body: "https://aura.studio/app",
      }),
      ui("gls-3-ph", "phone", "aurora", 1360, 200, 400, 720, {
        title: "Aura Mobile",
        body: "Companion view",
        items: ["Today", "Focus", "Inbox"],
      }),
    ],
    "slide",
  ),
  page(
    "gls-4",
    "linear-gradient(135deg, #f0f9ff 0%, #ede9fe 100%)",
    [
      t("gls-4-h", "Simple, transparent plans", 140, 90, 1200, 90, {
        fontSize: 58,
      }),
      ui("gls-4-p1", "pricing", "glass", 200, 230, 480, 660, {
        title: "Personal",
        body: "$0 / month",
        items: ["Unlimited local projects", "Standard themes", "PNG & PDF export"],
      }),
      ui("gls-4-p2", "pricing", "aurora", 720, 210, 480, 700, {
        title: "Studio",
        body: "$18 / month",
        items: ["Shared brand kits", "Real-time sync", "4K video & PPTX export"],
      }),
      ui("gls-4-p3", "pricing", "glass", 1240, 230, 480, 660, {
        title: "Organization",
        body: "$45 / seat",
        items: ["SSO & audit controls", "Custom typography", "Priority support"],
      }),
    ],
    "slide",
  ),
  page(
    "gls-5",
    "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #fae8ff 100%)",
    [
      t("gls-5-h", "Available Worldwide Today", 160, 180, 1600, 120, {
        fontSize: 72,
        align: "center",
      }),
      ui("gls-5-tm", "timer", "aurora", 460, 350, 1000, 380, {
        title: "Live Q&A Opens In",
        body: "Interactive stage countdown",
        value: 180,
      }),
    ],
    "fade",
  ),
];

const NEO_BRUTAL_STUDIO: Page[] = [
  page(
    "neo-1",
    "#ffd84a",
    [
      rect("neo-1-blk", 120, 140, 1680, 800, {
        fill: "#fff3d0",
        stroke: "#0f0f0f",
        strokeWidth: 6,
        cornerRadius: 0,
        shadow: { color: "#0f0f0f", blur: 0, x: 16, y: 16 },
      }),
      ui("neo-1-bdg", "badge", "neobrutalist", 200, 220, 380, 96, {
        title: "CREATIVE REPORT",
      }),
      t("neo-1-h", "BOLD BRANDS DON'T WHISPER.", 200, 350, 1480, 260, {
        fontSize: 108,
        fontFamily: "Archivo Black",
        fontWeight: 900,
        color: "#0f0f0f",
      }),
      t("neo-1-s", "2026 Identity, Motion & Interactive Campaign Playbook", 200, 660, 1280, 90, {
        fontSize: 34,
        fontWeight: 600,
        color: "#1e293b",
      }),
    ],
    "fade",
  ),
  page(
    "neo-2",
    "#fff3d0",
    [
      t("neo-2-h", "FOUR RULES OF IMPACT", 120, 85, 1200, 95, {
        fontSize: 64,
        fontFamily: "Archivo Black",
      }),
      ui("neo-2-l", "list", "neobrutalist", 120, 220, 880, 680, {
        title: "STUDIO MANIFESTO",
        items: [
          "High-contrast typography first",
          "Unapologetic geometric color blocks",
          "Interactive demos over static mocks",
          "Ship fast and refine in public",
        ],
      }),
      ui("neo-2-q", "quote", "neobrutalist", 1040, 220, 760, 400, {
        title: "Clarity with attitude beats polite invisibility every single time.",
        body: "Studio Founders",
      }),
      ui("neo-2-k", "kbd", "neobrutalist", 1040, 660, 760, 240, {
        title: "CMD + PLAY",
        body: "Try clicking the widgets live",
      }),
    ],
    "slide",
  ),
  page(
    "neo-3",
    "#e0f2fe",
    [
      t("neo-3-h", "CAMPAIGN VELOCITY", 120, 85, 1100, 95, {
        fontSize: 64,
        fontFamily: "Archivo Black",
      }),
      chart("neo-3-ch", "bar", "neobrutalist", 120, 220, 1020, 680, {
        title: "Launch Reach (K)",
        data: [
          { label: "Week 1", value: 45 },
          { label: "Week 2", value: 88 },
          { label: "Week 3", value: 140 },
          { label: "Week 4", value: 215 },
        ],
      }),
      ui("neo-3-s1", "stat", "neobrutalist", 1200, 220, 600, 310, {
        title: "Share Rate",
        value: 312,
        body: "+312% organic lift",
      }),
      ui("neo-3-s2", "stat", "neobrutalist", 1200, 590, 600, 310, {
        title: "Conversion",
        value: 19,
        body: "19.4% landing CTR",
      }),
    ],
    "slide",
  ),
  page(
    "neo-4",
    "#ffe4e6",
    [
      t("neo-4-h", "VOTE WITH THE AUDIENCE", 120, 85, 1300, 95, {
        fontSize: 64,
        fontFamily: "Archivo Black",
      }),
      quiz(
        "neo-4-poll",
        "neobrutalist",
        "poll",
        120,
        220,
        980,
        660,
        "Which visual direction hits hardest for Q3?",
        ["High-contrast Neobrutal", "Frosted Liquid Glass", "Editorial Serif Grid", "Cyber Telemetry"],
      ),
      ui("neo-4-rt", "rating", "neobrutalist", 1160, 220, 640, 320, {
        title: "Creative Energy",
        body: "Live rating",
        value: 5,
      }),
      ui("neo-4-cnt", "counter", "neobrutalist", 1160, 580, 640, 300, {
        title: "Applause Counter",
        body: "Tap to increment",
        value: 12,
      }),
    ],
    "fade",
  ),
];

const SWISS_EDITORIAL: Page[] = [
  page(
    "sws-1",
    "#faf9f6",
    [
      rect("sws-1-rule", 140, 140, 1640, 4, { fill: "#141414", cornerRadius: 0 }),
      t("sws-1-idx", "ANNUAL REPORT · ISSUE 08", 140, 175, 800, 48, {
        fontSize: 22,
        color: "#e2231a",
      }),
      t("sws-1-h", "Precision Craft at Global Scale", 140, 310, 1400, 260, {
        fontSize: 104,
        fontFamily: "Playfair Display",
        fontWeight: 700,
        color: "#141414",
      }),
      rect("sws-1-dot", 1560, 330, 180, 180, {
        shape: "circle",
        fill: "#e2231a",
      }),
      t("sws-1-f", "Zurich · Kyoto · Montreal — Fiscal Year 2026", 140, 880, 1200, 56, {
        fontSize: 26,
        fontWeight: 500,
        color: "#52525b",
      }),
    ],
    "fade",
  ),
  page(
    "sws-2",
    "#faf9f6",
    [
      t("sws-2-h", "Executive Perspective", 140, 100, 1200, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
      }),
      rect("sws-2-r", 140, 200, 1640, 2, { fill: "#141414", cornerRadius: 0 }),
      ui("sws-2-q", "quote", "editorial", 140, 260, 960, 560, {
        title: "Simplicity is achieved when every remaining element earns its place on the page.",
        body: "Elena Vance — Managing Partner",
      }),
      ui("sws-2-c", "card", "swiss", 1160, 260, 620, 560, {
        title: "2026 Priorities",
        body: "Disciplined capital allocation, zero-waste manufacturing, and long-term architectural partnerships.",
      }),
    ],
    "slide",
  ),
  page(
    "sws-3",
    "#faf9f6",
    [
      t("sws-3-h", "Revenue Allocation & Segment Margin", 140, 90, 1400, 90, {
        fontSize: 54,
        fontFamily: "Playfair Display",
      }),
      chart("sws-3-pie", "donut", "swiss", 140, 230, 740, 650, {
        title: "Mix by Division (%)",
        data: [
          { label: "Hardware", value: 42 },
          { label: "Software", value: 33 },
          { label: "Services", value: 25 },
        ],
      }),
      table(
        "sws-3-tbl",
        "swiss",
        930,
        230,
        850,
        650,
        [
          ["Division", "Revenue", "Margin", "YoY"],
          ["Hardware", "$84.2M", "46%", "+14%"],
          ["Software", "$66.0M", "81%", "+38%"],
          ["Advisory", "$50.1M", "52%", "+19%"],
        ],
        { fontSize: 22 },
      ),
    ],
    "slide",
  ),
  page(
    "sws-4",
    "#faf9f6",
    [
      t("sws-4-h", "Regional Studio Footprint", 140, 90, 1200, 90, {
        fontSize: 54,
        fontFamily: "Playfair Display",
      }),
      ui("sws-4-s1", "stat", "editorial", 140, 240, 510, 320, {
        title: "Europe & UK",
        value: 48,
        body: "48 active client programs",
      }),
      ui("sws-4-s2", "stat", "editorial", 705, 240, 510, 320, {
        title: "North America",
        value: 62,
        body: "62 enterprise deployments",
      }),
      ui("sws-4-s3", "stat", "editorial", 1270, 240, 510, 320, {
        title: "Asia-Pacific",
        value: 34,
        body: "34 regional studios",
      }),
      ui("sws-4-pr", "progress", "swiss", 140, 620, 1640, 240, {
        title: "Carbon-Neutral Supply Target",
        body: "Verified across 14 partner plants",
        value: 88,
      }),
    ],
    "morph",
  ),
  page(
    "sws-5",
    "#141414",
    [
      t("sws-5-h", "Thank you for reviewing our 2026 report.", 140, 260, 1200, 220, {
        fontSize: 78,
        fontFamily: "Playfair Display",
        color: "#faf9f6",
      }),
      t("sws-5-sub", "Investor Relations · studio@northwind.example", 140, 520, 1000, 80, {
        fontSize: 30,
        color: "#a1a1aa",
      }),
      qr("sws-5-qr", "https://diapolab.vercel.app", 1480, 340, 280, "#141414", "#faf9f6"),
    ],
    "fade",
  ),
];

const WORKSHOP_INTERACTIVE: Page[] = [
  page(
    "wrk-1",
    "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)",
    [
      t("wrk-1-h", "Design Sprint Live Workshop", 140, 180, 1080, 200, {
        fontSize: 82,
        fontWeight: 800,
        color: "#0f172a",
      }),
      t("wrk-1-s", "Interactive facilitation deck with live timer, clock, quiz & feedback poll.", 140, 410, 1020, 100, {
        fontSize: 32,
        color: "#334155",
      }),
      ui("wrk-1-clk", "clock", "nordic", 1260, 200, 520, 340, {
        title: "Session Clock",
        body: "Real-time",
      }),
      ui("wrk-1-cnt", "counter", "nordic", 1260, 580, 520, 280, {
        title: "Attendees Checked In",
        body: "Tap + as folks join",
        value: 18,
      }),
    ],
    "fade",
  ),
  page(
    "wrk-2",
    "#ffffff",
    [
      t("wrk-2-h", "Exercise 1: Map the User Bottleneck", 140, 95, 1400, 95, {
        fontSize: 56,
      }),
      ui("wrk-2-lst", "list", "nordic", 140, 230, 940, 640, {
        title: "Group Checklist",
        items: [
          "Pick one high-friction onboarding step",
          "Sketch 3 rapid wireframes in silence",
          "Vote with dot stickers",
          "Select one prototype to test",
        ],
      }),
      ui("wrk-2-tm", "timer", "nordic", 1140, 230, 640, 640, {
        title: "Sprint Timer (5m)",
        body: "Click Start during present mode",
        value: 300,
      }),
    ],
    "slide",
  ),
  page(
    "wrk-3",
    "#f8fafc",
    [
      t("wrk-3-h", "Quick Knowledge Check", 140, 95, 1200, 95, {
        fontSize: 56,
      }),
      quiz(
        "wrk-3-q",
        "aqua",
        "quiz",
        240,
        240,
        1440,
        640,
        "Which research signal best validates problem-solution fit early?",
        [
          "Users complete the core workflow unassisted",
          "High social media impression count",
          "Long feature backlog",
          "Brighter button gradients",
        ],
      ),
    ],
    "slide",
  ),
  page(
    "wrk-4",
    "linear-gradient(135deg, #ecfeff 0%, #eef2ff 100%)",
    [
      t("wrk-4-h", "Session Retro & Rating", 140, 95, 1200, 95, {
        fontSize: 56,
      }),
      ui("wrk-4-rt", "rating", "aurora", 140, 250, 780, 420, {
        title: "How actionable was today's sprint?",
        body: "Click a star in present mode",
        value: 5,
      }),
      ui("wrk-4-pr", "profile", "aurora", 980, 250, 800, 420, {
        title: "Facilitated by Maya Lin",
        body: "Principal Product Designer · Follow-up notes sent",
      }),
    ],
    "fade",
  ),
];

const TECH_RFC: Page[] = [
  page(
    "rfc-1",
    "linear-gradient(160deg, #091d42 0%, #0e3168 100%)",
    [
      ui("rfc-1-bdg", "badge", "blueprint", 140, 190, 340, 80, { title: "RFC-042 · APPROVED" }),
      t("rfc-1-h", "Event-Sourced Sync Engine", 140, 310, 1380, 200, {
        fontSize: 88,
        fontFamily: "JetBrains Mono",
        color: "#e0f2fe",
      }),
      t("rfc-1-s", "Deterministic CRDT snapshots + compact binary replication", 140, 540, 1280, 90, {
        fontSize: 32,
        color: "#93c5fd",
      }),
    ],
    "fade",
  ),
  page(
    "rfc-2",
    "#0b2550",
    [
      t("rfc-2-h", "Rollout Phases", 140, 90, 1000, 90, { fontSize: 56, color: "#e0f2fe" }),
      ui("rfc-2-tl", "timeline", "blueprint", 140, 220, 1640, 620, {
        title: "Engineering Roadmap",
        body: "Shadow Writes · Dual Read · Full Cutover",
        value: 72,
        items: ["Shadow Log Verification", "Region-by-Region Cutover", "Legacy Queue Decommission"],
      }),
    ],
    "slide",
  ),
  page(
    "rfc-3",
    "#0b2550",
    [
      t("rfc-3-h", "Payload Benchmark & Patch Format", 140, 90, 1300, 90, {
        fontSize: 56,
        color: "#e0f2fe",
      }),
      table(
        "rfc-3-t",
        "blueprint",
        140,
        220,
        820,
        620,
        [
          ["Format", "Size", "Encode", "Decode"],
          ["JSON Diff", "42 KB", "4.8ms", "3.9ms"],
          ["MsgPack", "24 KB", "2.1ms", "1.8ms"],
          ["CRDT Bin", "9.4 KB", "0.7ms", "0.6ms"],
        ],
        { fontSize: 20 },
      ),
      ui("rfc-3-c", "code", "blueprint", 1000, 220, 780, 620, {
        title: "applyPatch.ts",
        body: "export function mergeState(local: Doc, patch: Uint8Array) {\n  const clock = decodeLamport(patch);\n  return clock > local.clock ? apply(local, patch) : local;\n}",
      }),
    ],
    "slide",
  ),
  page(
    "rfc-4",
    "#0b2550",
    [
      t("rfc-4-h", "Security & Rollback Readiness", 140, 90, 1200, 90, { fontSize: 56, color: "#e0f2fe" }),
      ui("rfc-4-l", "list", "blueprint", 140, 230, 1640, 600, {
        title: "Production Sign-Off",
        items: [
          "Automated snapshot checksum on every write",
          "One-click feature flag fallback within 5 seconds",
          "Zero PII persisted in replication frames",
        ],
      }),
    ],
    "fade",
  ),
];

const EMERALD_ECO: Page[] = [
  page(
    "eco-1",
    "linear-gradient(155deg, #041d17 0%, #093529 100%)",
    [
      ui("eco-1-b", "badge", "emerald", 140, 200, 380, 80, { title: "SUSTAINABILITY 2026" }),
      t("eco-1-h", "Net-Zero Supply & Circular Materials", 140, 320, 1360, 220, {
        fontSize: 88,
        color: "#ecfdf5",
      }),
      t("eco-1-s", "Measurable decarbonization across packaging, logistics, and energy.", 140, 580, 1180, 90, {
        fontSize: 32,
        color: "#a7f3d0",
      }),
    ],
    "fade",
  ),
  page(
    "eco-2",
    "#06221b",
    [
      t("eco-2-h", "Verified Impact Metrics", 140, 95, 1100, 90, { fontSize: 56, color: "#ecfdf5" }),
      ui("eco-2-s1", "stat", "emerald", 140, 240, 510, 300, {
        title: "Emissions Cut",
        value: 46,
        body: "-46% Scope 1 & 2",
      }),
      ui("eco-2-s2", "stat", "emerald", 705, 240, 510, 300, {
        title: "Renewable Grid",
        value: 92,
        body: "92% clean facility power",
      }),
      ui("eco-2-s3", "stat", "emerald", 1270, 240, 510, 300, {
        title: "Recycled Fiber",
        value: 100,
        body: "100% plastic-free boxes",
      }),
      ui("eco-2-pr", "progress", "emerald", 140, 610, 1640, 250, {
        title: "2030 Net-Zero Milestone Progress",
        body: "On track ahead of 2027 audit",
        value: 76,
      }),
    ],
    "morph",
  ),
  page(
    "eco-3",
    "#06221b",
    [
      t("eco-3-h", "Carbon Intensity Trend", 140, 95, 1100, 90, { fontSize: 56, color: "#ecfdf5" }),
      chart("eco-3-ch", "line", "emerald", 140, 220, 1640, 650, {
        title: "Tons CO2e per $M Revenue",
        data: [
          { label: "2022", value: 94 },
          { label: "2023", value: 78 },
          { label: "2024", value: 58 },
          { label: "2025", value: 41 },
          { label: "2026", value: 29 },
        ],
      }),
    ],
    "slide",
  ),
  page(
    "eco-4",
    "#06221b",
    [
      t("eco-4-h", "Partner Commitments", 140, 95, 1100, 90, { fontSize: 56, color: "#ecfdf5" }),
      ui("eco-4-q", "quote", "emerald", 140, 240, 1640, 560, {
        title: "Every material decision is audited from extraction to second-life recovery.",
        body: "Head of Sustainability · 2026 Impact Audit",
      }),
    ],
    "fade",
  ),
];

const OBSIDIAN_LUXURY: Page[] = [
  page(
    "obs-1",
    "linear-gradient(160deg, #09090b 0%, #18181b 100%)",
    [
      ui("obs-1-b", "badge", "obsidian", 140, 200, 360, 80, { title: "EXECUTIVE BRIEF" }),
      t("obs-1-h", "Private Wealth & Treasury Advisory", 140, 320, 1380, 220, {
        fontSize: 88,
        fontFamily: "Playfair Display",
        color: "#fafaf9",
      }),
      t("obs-1-s", "2026 Portfolio Strategy · Capital Preservation & Yield", 140, 580, 1180, 90, {
        fontSize: 32,
        color: "#fcd34d",
      }),
    ],
    "fade",
  ),
  page(
    "obs-2",
    "#09090b",
    [
      t("obs-2-h", "Asset Allocation Target", 140, 95, 1100, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
        color: "#fafaf9",
      }),
      chart("obs-2-ch", "pie", "obsidian", 140, 230, 740, 640, {
        title: "Strategic Mix",
        data: [
          { label: "Equities", value: 45 },
          { label: "Fixed Inc", value: 30 },
          { label: "Infra", value: 15 },
          { label: "Cash", value: 10 },
        ],
      }),
      ui("obs-2-c", "card", "obsidian", 940, 230, 840, 640, {
        title: "Key Principles",
        body: "Diversified real-asset yield balanced with short-duration liquidity sleeves and disciplined downside hedging.",
      }),
    ],
    "slide",
  ),
  page(
    "obs-3",
    "#09090b",
    [
      t("obs-3-h", "Quarterly Yield Comparison", 140, 95, 1200, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
        color: "#fafaf9",
      }),
      table(
        "obs-3-t",
        "obsidian",
        140,
        230,
        1640,
        600,
        [
          ["Sleeve", "Benchmark", "Portfolio", "Alpha"],
          ["Core Equities", "8.2%", "10.1%", "+1.9%"],
          ["Investment Grade", "4.6%", "5.4%", "+0.8%"],
          ["Real Infrastructure", "6.8%", "8.3%", "+1.5%"],
        ],
        { fontSize: 24 },
      ),
    ],
    "slide",
  ),
  page(
    "obs-4",
    "#09090b",
    [
      t("obs-4-h", "Client Advisory Team", 140, 95, 1100, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
        color: "#fafaf9",
      }),
      ui("obs-4-p1", "profile", "obsidian", 140, 260, 780, 320, {
        title: "Arthur Sterling, CFA",
        body: "Chief Investment Officer",
      }),
      ui("obs-4-p2", "profile", "obsidian", 1000, 260, 780, 320, {
        title: "Claire Beaumont",
        body: "Head of Private Treasury",
      }),
    ],
    "fade",
  ),
];

const BOARD_QUARTERLY: Page[] = [
  page(
    "brd-1",
    "#0f172a",
    [
      t("brd-1-h", "Q4 Business & Operations Review", 140, 260, 1480, 200, {
        fontSize: 88,
        color: "#ffffff",
      }),
      t("brd-1-s", "Revenue · Retention · Product Velocity · 2026 Outlook", 140, 490, 1200, 80, {
        fontSize: 32,
        color: "#93c5fd",
      }),
    ],
    "fade",
  ),
  page(
    "brd-2",
    "#ffffff",
    [
      t("brd-2-h", "Headline Scorecard", 140, 90, 1000, 90, { fontSize: 56 }),
      ui("brd-2-s1", "stat", "material", 140, 230, 510, 260, {
        title: "Quarterly Bookings",
        value: 12400,
        body: "$12.4M (+34% YoY)",
      }),
      ui("brd-2-s2", "stat", "material", 705, 230, 510, 260, {
        title: "Active Teams",
        value: 2890,
        body: "+410 net new this quarter",
      }),
      ui("brd-2-s3", "stat", "material", 1270, 230, 510, 260, {
        title: "Gross Margin",
        value: 83,
        body: "+2.4 pts vs plan",
      }),
      chart("brd-2-ch", "bar", "material", 140, 530, 1640, 410, {
        title: "Monthly Revenue Trend ($K)",
        data: [
          { label: "Jul", value: 3100 },
          { label: "Aug", value: 3450 },
          { label: "Sep", value: 3890 },
          { label: "Oct", value: 4120 },
          { label: "Nov", value: 4480 },
          { label: "Dec", value: 5100 },
        ],
      }),
    ],
    "slide",
  ),
  page(
    "brd-3",
    "#f8fafc",
    [
      t("brd-3-h", "Wins & Focus Areas", 140, 90, 1100, 90, { fontSize: 56 }),
      ui("brd-3-w", "list", "aqua", 140, 230, 790, 640, {
        title: "Key Wins",
        items: [
          "Closed 4 Fortune 500 multi-year renewals",
          "Shipped collaborative comment threads",
          "Cut onboarding time from 9 days to 2 days",
        ],
      }),
      ui("brd-3-f", "list", "sunset", 990, 230, 790, 640, {
        title: "Q1 Priorities",
        items: [
          "Expand EMEA enterprise support coverage",
          "Launch self-serve SSO setup wizard",
          "Scale enterprise API rate limits 4×",
        ],
      }),
    ],
    "slide",
  ),
  page(
    "brd-4",
    "#ffffff",
    [
      t("brd-4-h", "Department Budget & Headcount", 140, 90, 1200, 90, { fontSize: 56 }),
      table(
        "brd-4-t",
        "material",
        140,
        230,
        1640,
        620,
        [
          ["Team", "Headcount", "Spend vs Plan", "Status"],
          ["Engineering", "48", "98%", "On Track"],
          ["Product & Design", "16", "95%", "On Track"],
          ["Sales & CS", "34", "101%", "Hiring +3"],
          ["Operations", "12", "97%", "On Track"],
        ],
        { fontSize: 22 },
      ),
    ],
    "fade",
  ),
];

const SUNSET_BRAND: Page[] = [
  page(
    "sun-1",
    "linear-gradient(135deg, #fff1e6 0%, #ffe0cc 55%, #ffd6e0 100%)",
    [
      ui("sun-1-b", "badge", "sunset", 140, 210, 360, 84, { title: "CREATIVE LAUNCH" }),
      t("sun-1-h", "Warmth, Craft & Human Stories", 140, 330, 1340, 220, {
        fontSize: 92,
        fontFamily: "Playfair Display",
        color: "#2a140d",
      }),
      t("sun-1-s", "Reimagining hospitality experiences across 18 coastal destinations.", 140, 580, 1180, 90, {
        fontSize: 32,
        color: "#7c2d12",
      }),
    ],
    "fade",
  ),
  page(
    "sun-2",
    "#fff8f3",
    [
      t("sun-2-h", "Guest Experience Pillars", 140, 90, 1200, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
      }),
      ui("sun-2-c1", "card", "sunset", 140, 240, 520, 560, {
        title: "Local Craft",
        body: "Every suite features ceramic, textile, and woodwork commissioned from neighborhood makers.",
      }),
      ui("sun-2-c2", "card", "sunset", 700, 240, 520, 560, {
        title: "Slow Mornings",
        body: "Seasonal farm-to-table dining and sunlit courtyards built for unhurried gatherings.",
      }),
      ui("sun-2-c3", "card", "sunset", 1260, 240, 520, 560, {
        title: "Seamless Stay",
        body: "Digital check-in and curated neighborhood audio guides directly on mobile.",
      }),
    ],
    "slide",
  ),
  page(
    "sun-3",
    "#fff8f3",
    [
      t("sun-3-h", "Guest Satisfaction & Repeat Stays", 140, 90, 1200, 90, {
        fontSize: 56,
        fontFamily: "Playfair Display",
      }),
      chart("sun-3-ch", "area", "sunset", 140, 230, 1020, 640, {
        title: "Monthly Direct Bookings",
        data: [
          { label: "May", value: 420 },
          { label: "Jun", value: 580 },
          { label: "Jul", value: 790 },
          { label: "Aug", value: 840 },
          { label: "Sep", value: 690 },
        ],
      }),
      ui("sun-3-rt", "rating", "sunset", 1210, 230, 570, 300, {
        title: "Guest Review Avg",
        body: "4.9 / 5.0 across 3,400 stays",
        value: 5,
      }),
      ui("sun-3-s", "stat", "sunset", 1210, 570, 570, 300, {
        title: "Repeat Guests",
        value: 64,
        body: "64% return within 12 months",
      }),
    ],
    "fade",
  ),
];

const VAPOR_SYNTH: Page[] = [
  page(
    "vap-1",
    "linear-gradient(155deg, #1b103a 0%, #3a2376 55%, #7c3aed 100%)",
    [
      ui("vap-1-b", "badge", "vapor", 140, 210, 360, 84, { title: "SYNTH // 2084" }),
      t("vap-1-h", "Next-Gen Audio & Spatial Synth", 140, 330, 1380, 220, {
        fontSize: 88,
        fontFamily: "Orbitron",
        color: "#fdf4ff",
      }),
      t("vap-1-s", "Polyphonic analog modeling meets real-time WebAudio routing.", 140, 590, 1200, 90, {
        fontSize: 32,
        color: "#f5d0fe",
      }),
    ],
    "fade",
  ),
  page(
    "vap-2",
    "#1d1240",
    [
      t("vap-2-h", "Signal Chain & Benchmarks", 140, 90, 1200, 90, {
        fontSize: 56,
        fontFamily: "Orbitron",
        color: "#fdf4ff",
      }),
      chart("vap-2-ch", "bar", "vapor", 140, 230, 1000, 640, {
        title: "Voices Rendered @ < 2ms",
        data: [
          { label: "Classic", value: 16 },
          { label: "Hybrid", value: 32 },
          { label: "FM Pro", value: 64 },
          { label: "Spatial", value: 128 },
        ],
      }),
      ui("vap-2-tabs", "tabs", "vapor", 1180, 230, 600, 640, {
        title: "Oscillator Engine",
        body: "Dual wavetable + sub-harmonic filter bank with zero-latency modulation.",
        items: ["Oscillators", "Filters", "Effects"],
      }),
    ],
    "slide",
  ),
  page(
    "vap-3",
    "#1d1240",
    [
      t("vap-3-h", "Edition Pricing", 140, 90, 1000, 90, {
        fontSize: 56,
        fontFamily: "Orbitron",
        color: "#fdf4ff",
      }),
      ui("vap-3-p1", "pricing", "vapor", 260, 230, 640, 650, {
        title: "Core Edition",
        body: "$79 one-time",
        items: ["16-voice polyphony", "120 factory patches", "VST3 / AU / Standalone"],
      }),
      ui("vap-3-p2", "pricing", "vapor", 1020, 230, 640, 650, {
        title: "Producer Suite",
        body: "$149 one-time",
        items: ["128-voice spatial audio", "Custom wavetable editor", "Live hardware bridge"],
      }),
    ],
    "fade",
  ),
];

const GLASS_IDENTITY: Page[] = [
  page(
    "gid-1",
    "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 45%, #ede9fe 100%)",
    [
      t("gid-1-h", "Brand & Interface Guidelines", 140, 250, 1280, 180, {
        fontSize: 82,
        color: "#0f172a",
      }),
      t("gid-1-s", "Color tokens, spacing rhythm, motion curves, and interactive components.", 140, 460, 1180, 90, {
        fontSize: 32,
        color: "#475569",
      }),
      ui("gid-1-card", "profile", "glass", 140, 610, 640, 220, {
        title: "Brand Systems Team",
        body: "Version 3.4 · Updated Quarterly",
      }),
    ],
    "fade",
  ),
  page(
    "gid-2",
    "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
    [
      t("gid-2-h", "Component Anatomy", 140, 90, 1000, 90, { fontSize: 56 }),
      ui("gid-2-s", "search", "glass", 140, 230, 780, 140, {
        title: "Search design tokens…",
        body: "⌘K",
      }),
      ui("gid-2-tg", "toggle", "aurora", 140, 410, 780, 440, {
        title: "System Preferences",
        items: ["High-contrast labels", "Adaptive glass depth", "Reduced motion curves"],
      }),
      ui("gid-2-nt", "notification", "glass", 980, 230, 800, 240, {
        title: "Tokens Published",
        body: "v3.4 CSS variables synced to production",
      }),
      ui("gid-2-md", "modal", "aurora", 980, 510, 800, 340, {
        title: "Confirm Theme Update?",
        body: "Applies updated radius and contrast tokens across 24 components.",
        items: ["Cancel", "Publish"],
      }),
    ],
    "slide",
  ),
];

export const BUILTIN_TEMPLATES: PublicTemplate[] = [
  {
    id: "builtin-saas-series-a",
    user_id: "builtin",
    name: "Series A SaaS Pitch Deck",
    canvas_w: W,
    canvas_h: H,
    pages: SAAS_SERIES_A,
    thumbnail: null,
    created_at: "2026-01-15T12:00:00Z",
    style: "corporate",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-liquid-glass-launch",
    user_id: "builtin",
    name: "Liquid Glass Product Launch",
    canvas_w: W,
    canvas_h: H,
    pages: LIQUID_GLASS_LAUNCH,
    thumbnail: null,
    created_at: "2026-01-14T12:00:00Z",
    style: "glass",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-cyber-systems",
    user_id: "builtin",
    name: "Cyber Systems Architecture",
    canvas_w: W,
    canvas_h: H,
    pages: CYBER_SYSTEMS,
    thumbnail: null,
    created_at: "2026-01-13T12:00:00Z",
    style: "cyber",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-neobrutal-studio",
    user_id: "builtin",
    name: "Neo-Brutal Creative Playbook",
    canvas_w: W,
    canvas_h: H,
    pages: NEO_BRUTAL_STUDIO,
    thumbnail: null,
    created_at: "2026-01-12T12:00:00Z",
    style: "neobrutalist",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-swiss-editorial",
    user_id: "builtin",
    name: "Swiss Editorial Annual Report",
    canvas_w: W,
    canvas_h: H,
    pages: SWISS_EDITORIAL,
    thumbnail: null,
    created_at: "2026-01-11T12:00:00Z",
    style: "minimal",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-workshop-interactive",
    user_id: "builtin",
    name: "Interactive Design Sprint Workshop",
    canvas_w: W,
    canvas_h: H,
    pages: WORKSHOP_INTERACTIVE,
    thumbnail: null,
    created_at: "2026-01-10T12:00:00Z",
    style: "minimal",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-tech-rfc",
    user_id: "builtin",
    name: "Engineering Blueprint RFC",
    canvas_w: W,
    canvas_h: H,
    pages: TECH_RFC,
    thumbnail: null,
    created_at: "2026-01-09T12:00:00Z",
    style: "cyber",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-board-quarterly",
    user_id: "builtin",
    name: "Boardroom Quarterly Review",
    canvas_w: W,
    canvas_h: H,
    pages: BOARD_QUARTERLY,
    thumbnail: null,
    created_at: "2026-01-08T12:00:00Z",
    style: "corporate",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-emerald-impact",
    user_id: "builtin",
    name: "Sustainability & Impact Report",
    canvas_w: W,
    canvas_h: H,
    pages: EMERALD_ECO,
    thumbnail: null,
    created_at: "2026-01-07T12:00:00Z",
    style: "corporate",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-obsidian-advisory",
    user_id: "builtin",
    name: "Obsidian Executive Advisory",
    canvas_w: W,
    canvas_h: H,
    pages: OBSIDIAN_LUXURY,
    thumbnail: null,
    created_at: "2026-01-06T12:00:00Z",
    style: "corporate",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-sunset-hospitality",
    user_id: "builtin",
    name: "Sunset Hospitality & Brand Story",
    canvas_w: W,
    canvas_h: H,
    pages: SUNSET_BRAND,
    thumbnail: null,
    created_at: "2026-01-05T12:00:00Z",
    style: "minimal",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-vapor-synth",
    user_id: "builtin",
    name: "Vapor Audio Keynote",
    canvas_w: W,
    canvas_h: H,
    pages: VAPOR_SYNTH,
    thumbnail: null,
    created_at: "2026-01-04T12:00:00Z",
    style: "cyber",
    creator: "builtin",
    license: "CC0",
  },
  {
    id: "builtin-glass-guidelines",
    user_id: "builtin",
    name: "Glassmorphic UI Design System",
    canvas_w: W,
    canvas_h: H,
    pages: GLASS_IDENTITY,
    thumbnail: null,
    created_at: "2026-01-03T12:00:00Z",
    style: "glass",
    creator: "builtin",
    license: "CC0",
  },
];

/* -------------------------------------------------------------------------- */
/* Single-Slide Layout Presets (insertable as new styled slides)              */
/* -------------------------------------------------------------------------- */

export type SlideLayoutPreset = {
  id: string;
  name: string;
  category: string;
  build: (style: UiStyle) => Page;
};

export const SLIDE_LAYOUT_PRESETS: SlideLayoutPreset[] = [
  {
    id: "layout-hero",
    name: "Hero Title Cover",
    category: "Openers",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-hero-${Date.now()}`,
        dark ? "#0b1120" : "#f8fafc",
        [
          ui(`lh-b-${Date.now()}`, "badge", style, 140, 210, 320, 78, { title: "PRESENTATION" }),
          t(`lh-t-${Date.now()}`, "Your Bold Keynote Title", 140, 320, 1400, 220, {
            fontSize: 92,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          t(
            `lh-s-${Date.now()}`,
            "Add a crisp subtitle explaining the takeaway or narrative in one sentence.",
            140,
            560,
            1160,
            100,
            { fontSize: 32, fontWeight: 400, color: dark ? "#cbd5e1" : "#475569" },
          ),
          btn(`lh-btn-${Date.now()}`, "Start Deck →", 140, 740, 320, 82, {
            bgColor: theme.accent,
            fgColor: theme.onAccent ?? "#ffffff",
          }),
        ],
        "fade",
      );
    },
  },
  {
    id: "layout-agenda-clock",
    name: "Agenda + Live Clock",
    category: "Openers",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-ag-${Date.now()}`,
        dark ? "#0b1120" : "#ffffff",
        [
          t(`la-t-${Date.now()}`, "Session Agenda", 140, 95, 1000, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          ui(`la-l-${Date.now()}`, "list", style, 140, 230, 940, 640, {
            title: "Today's Flow",
            items: [
              "Opening context & objectives",
              "Product walkthrough",
              "Key metrics & roadmap",
              "Open discussion & Q&A",
            ],
          }),
          ui(`la-c-${Date.now()}`, "clock", style, 1140, 230, 640, 340, {
            title: "Current Time",
            body: "Live clock",
          }),
          ui(`la-a-${Date.now()}`, "alert", style, 1140, 610, 640, 260, {
            title: "Interactive Session",
            body: "Press P for notes or L for laser pointer.",
          }),
        ],
        "slide",
      );
    },
  },
  {
    id: "layout-kpi-trio",
    name: "3-KPI Metrics Grid",
    category: "Data",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-kpi-${Date.now()}`,
        dark ? "#0b1120" : "#f8fafc",
        [
          t(`lk-t-${Date.now()}`, "Quarterly Performance", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          ui(`lk-1-${Date.now()}`, "stat", style, 140, 250, 520, 320, {
            title: "Monthly Revenue",
            value: 482,
            body: "$482K (+24% MoM)",
          }),
          ui(`lk-2-${Date.now()}`, "stat", style, 700, 250, 520, 320, {
            title: "Active Accounts",
            value: 3420,
            body: "+18% QoQ growth",
          }),
          ui(`lk-3-${Date.now()}`, "stat", style, 1260, 250, 520, 320, {
            title: "Customer NPS",
            value: 74,
            body: "Top industry quartile",
          }),
          ui(`lk-p-${Date.now()}`, "progress", style, 140, 630, 1640, 230, {
            title: "Annual Target Attainment",
            body: "Ahead of Q4 forecast",
            value: 82,
          }),
        ],
        "morph",
      );
    },
  },
  {
    id: "layout-chart-split",
    name: "Chart + Key Takeaways",
    category: "Data",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-cs-${Date.now()}`,
        dark ? "#0b1120" : "#ffffff",
        [
          t(`lcs-t-${Date.now()}`, "Growth Trajectory", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          chart(`lcs-ch-${Date.now()}`, "bar", style, 140, 230, 1020, 660, {
            title: "Quarterly Output",
          }),
          ui(`lcs-c-${Date.now()}`, "card", style, 1200, 230, 580, 660, {
            title: "What Drove Growth",
            body: "Self-serve activation doubled after reducing onboarding steps from 6 screens to 2, while enterprise expansion stayed above 130%.",
          }),
        ],
        "slide",
      );
    },
  },
  {
    id: "layout-roadmap",
    name: "Roadmap Timeline",
    category: "Strategy",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-rm-${Date.now()}`,
        dark ? "#0b1120" : "#f8fafc",
        [
          t(`lrm-t-${Date.now()}`, "Product Roadmap", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          ui(`lrm-tl-${Date.now()}`, "timeline", style, 140, 240, 1640, 620, {
            title: "2026 Delivery Phases",
            body: "Foundation · Expansion · Scale",
            value: 66,
            items: ["Q1 Core Engine", "Q2 Team Collaboration", "Q3 Enterprise API"],
          }),
        ],
        "slide",
      );
    },
  },
  {
    id: "layout-comparison",
    name: "Two-Column Comparison",
    category: "Strategy",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-cmp-${Date.now()}`,
        dark ? "#0b1120" : "#ffffff",
        [
          t(`lcmp-t-${Date.now()}`, "Before vs. After", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          ui(`lcmp-1-${Date.now()}`, "list", style, 140, 230, 790, 650, {
            title: "Current State",
            items: ["Manual handoffs across teams", "Static weekly reports", "Slow feedback loops"],
          }),
          ui(`lcmp-2-${Date.now()}`, "list", style, 990, 230, 790, 650, {
            title: "Future State",
            items: ["Automated live syncing", "Real-time shared dashboards", "Instant customer validation"],
          }),
        ],
        "slide",
      );
    },
  },
  {
    id: "layout-quote",
    name: "Editorial Quote Spotlight",
    category: "Story",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.editorial;
      const dark = Boolean(theme.dark);
      return page(
        `layout-qt-${Date.now()}`,
        dark ? "#0b1120" : "#fbfaf6",
        [
          ui(`lqt-q-${Date.now()}`, "quote", style, 180, 200, 1560, 480, {
            title: "Great presentations feel less like a lecture and more like an invitation.",
            body: "DiapoLab Editorial Kit",
          }),
          ui(`lqt-p-${Date.now()}`, "profile", style, 180, 720, 760, 210, {
            title: "Jordan Rivera",
            body: "VP of Design · Keynote Speaker",
          }),
        ],
        "fade",
      );
    },
  },
  {
    id: "layout-table",
    name: "Structured Comparison Table",
    category: "Data",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-tbl-${Date.now()}`,
        dark ? "#0b1120" : "#ffffff",
        [
          t(`ltb-t-${Date.now()}`, "Capability Matrix", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          table(
            `ltb-tb-${Date.now()}`,
            style,
            140,
            230,
            1640,
            640,
            [
              ["Capability", "Starter", "Pro", "Enterprise"],
              ["Custom Branding", "Basic", "Full Kit", "Multi-Brand"],
              ["PPTX Import/Export", "✓", "✓", "✓"],
              ["Live Interactive Widgets", "✓", "✓", "✓"],
              ["Dedicated Support", "Community", "Priority", "24/7 SLA"],
            ],
            { fontSize: 24 },
          ),
        ],
        "slide",
      );
    },
  },
  {
    id: "layout-workshop",
    name: "Interactive Poll & Timer",
    category: "Interactive",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-iw-${Date.now()}`,
        dark ? "#0b1120" : "#f8fafc",
        [
          t(`liw-t-${Date.now()}`, "Live Audience Check-In", 140, 95, 1100, 95, {
            fontSize: 58,
            color: dark ? "#f8fafc" : "#0f172a",
          }),
          quiz(
            `liw-pl-${Date.now()}`,
            style,
            "poll",
            140,
            230,
            960,
            640,
            "Which area should we focus on next?",
            ["Performance & speed", "New integrations", "Mobile companion", "Design automation"],
          ),
          ui(`liw-tm-${Date.now()}`, "timer", style, 1160, 230, 620, 320, {
            title: "Discussion Clock",
            body: "Click Start",
            value: 180,
          }),
          ui(`liw-cn-${Date.now()}`, "counter", style, 1160, 590, 620, 280, {
            title: "Questions Queued",
            body: "Tap + to count",
            value: 0,
          }),
        ],
        "fade",
      );
    },
  },
  {
    id: "layout-closing-cta",
    name: "Closing Thank-You + QR",
    category: "Closers",
    build: (style) => {
      const theme = UI_STYLE_THEMES[style] ?? UI_STYLE_THEMES.aqua;
      const dark = Boolean(theme.dark);
      return page(
        `layout-end-${Date.now()}`,
        dark ? "#0b1120" : "#0f172a",
        [
          t(`lend-t-${Date.now()}`, "Thank You & Next Steps", 140, 250, 1200, 180, {
            fontSize: 84,
            color: "#ffffff",
          }),
          t(`lend-s-${Date.now()}`, "Scan to open the shared deck or reach out directly.", 140, 450, 1100, 90, {
            fontSize: 32,
            color: "#94a3b8",
          }),
          btn(`lend-b-${Date.now()}`, "Back to Cover", 140, 620, 320, 82, {
            action: "first-slide",
            bgColor: theme.accent,
            fgColor: theme.onAccent ?? "#ffffff",
          }),
          qr(`lend-qr-${Date.now()}`, "https://diapolab.vercel.app", 1440, 300, 320, "#0f172a", "#ffffff"),
        ],
        "fade",
      );
    },
  },
];
