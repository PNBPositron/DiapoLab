/* ════════════════════════════════════════════════════════════════════════
   DiapoLab — Example plugin
   ════════════════════════════════════════════════════════════════════════

   A DiapoLab plugin is plain JavaScript. It defines widgets — named groups
   of canvas elements — that become insertable presets in the editor
   (Presets → Blocks → "Plugin blocks").

   HOW TO USE THIS FILE
   ────────────────────
   1. Open the Marketplace → Plugins tab → "Import plugin code"
   2. Paste the entire content of this file (or click "Load sample")
   3. The widgets appear in Presets → Blocks while the plugin is enabled

   FORMAT
   ──────
   diapolabPlugin({
     name:        "My Plugin",             // required
     author:      "You",                   // optional
     version:     "1.0.0",                  // optional
     description: "What it adds",          // optional
     widgets: [                             // required, non-empty
       {
         name: "Widget name",              // required
         description: "Shown as tooltip", // optional
         elements: [ /* canvas elements */ ],
         // "elements" may also be a function returning the array,
         // useful for random values (dice, colors…) at each insert.
       },
     ],
   });

   AVAILABLE ELEMENT TYPES (most useful fields)
   ────────────────────────────────────────────
   Common to all: type, x, y, width, height, rotation

   text :  text, fontSize, color, fontWeight, fontFamily,
           align ("left"|"center"|"right"), italic, underline, letterSpacing
   shape:  shape (rect, circle, triangle, star, hexagon, heart, arrow, blob,
           speech, shield, ticket, wave, ring, glitch…),
           fill, stroke, strokeWidth, effect ("none"|"liquid_glass"|"neon"|
           "soft_shadow"|"inner_glow")
   chart:  chart ("bar"|"line"|"area"|"pie"), data: [{ label, value }],
           colors: string[], bgColor, fgColor, title, showValues
   image:  src (URL), fit ("cover"|"contain")
   icon :  icon (lucide name, e.g. "Rocket"), color, background, ringColor

   Coordinates are canvas pixels — a 1920×1080 slide is the default deck.
   ════════════════════════════════════════════════════════════════════════ */

diapolabPlugin({
  name: "Example Kit",
  author: "DiapoLab",
  version: "1.0.0",
  description: "Six demo widgets: text lockups, badges, a chart and a playful dice.",

  widgets: [
    /* ── 1. Minimal widget — a single element ─────────────────────── */
    {
      name: "Big title",
      description: "Archivo Black 96px, dark ink",
      elements: [
        {
          type: "text",
          x: 140, y: 200, width: 1200, height: 160,
          rotation: 0,
          text: "Make it loud",
          fontSize: 96,
          color: "#0f172a",
          fontWeight: 900,
          fontFamily: "Archivo Black",
          align: "left",
        },
      ],
    },

    /* ── 2. Composite lockup — several elements positioned together ── */
    {
      name: "Section header",
      description: "Blue accent bar + uppercase kicker + serif title",
      elements: [
        {
          type: "shape",
          x: 140, y: 300, width: 180, height: 14,
          rotation: 0,
          shape: "rect",
          fill: "#2563eb",
          stroke: "transparent",
          strokeWidth: 0,
        },
        {
          type: "text",
          x: 140, y: 330, width: 700, height: 40,
          rotation: 0,
          text: "CHAPTER ONE",
          fontSize: 22,
          color: "#2563eb",
          fontWeight: 700,
          fontFamily: "Inter",
          align: "left",
          letterSpacing: 0.25,
        },
        {
          type: "text",
          x: 140, y: 372, width: 1000, height: 110,
          rotation: 0,
          text: "The art of the first slide",
          fontSize: 64,
          color: "#0f172a",
          fontWeight: 600,
          fontFamily: "Georgia",
          align: "left",
        },
      ],
    },

    /* ── 3. Sticker badge — shape + centered text on top ──────────── */
    {
      name: "Rounded badge",
      description: "Pill badge with label",
      elements: [
        {
          type: "shape",
          x: 140, y: 560, width: 320, height: 90,
          rotation: 0,
          shape: "capsule",
          fill: "#ffd84a",
          stroke: "#0a0f1f",
          strokeWidth: 5,
        },
        {
          type: "text",
          x: 140, y: 578, width: 320, height: 54,
          rotation: 0,
          text: "NEW IN 2026",
          fontSize: 26,
          color: "#0a0f1f",
          fontWeight: 900,
          fontFamily: "Inter",
          align: "center",
        },
      ],
    },

    /* ── 4. Neon ring — showcases shape effects ────────────────────── */
    {
      name: "Neon ring",
      description: "Ring shape with the neon effect",
      elements: [
        {
          type: "shape",
          x: 520, y: 540, width: 220, height: 220,
          rotation: 0,
          shape: "ring",
          fill: "#0a0f1f",
          stroke: "#7df9ff",
          strokeWidth: 8,
          effect: "neon",
        },
      ],
    },

    /* ── 5. Data viz — a ready-to-edit chart ──────────────────────── */
    {
      name: "Quarterly chart",
      description: "Bar chart with values shown",
      elements: [
        {
          type: "chart",
          x: 820, y: 420, width: 760, height: 480,
          rotation: 0,
          chart: "bar",
          data: [
            { label: "Q1", value: 32 },
            { label: "Q2", value: 58 },
            { label: "Q3", value: 45 },
            { label: "Q4", value: 78 },
          ],
          colors: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff"],
          bgColor: "#0a0f1f",
          fgColor: "#ffffff",
          title: "Growth by quarter",
          showValues: true,
          showAxes: true,
        },
      ],
    },

    /* ── 6. Dynamic widget — elements as a function ───────────────── */
    {
      name: "Lucky dice",
      description: "Random 1-6 value each time you insert it",
      elements: () => {
        const roll = 1 + Math.floor(Math.random() * 6);
        return [
          {
            type: "shape",
            x: 140, y: 760, width: 140, height: 140,
            rotation: Math.floor(Math.random() * 24) - 12,
            shape: "rect",
            fill: "#ffffff",
            stroke: "#0a0f1f",
            strokeWidth: 6,
          },
          {
            type: "text",
            x: 140, y: 790, width: 140, height: 80,
            rotation: 0,
            text: String(roll),
            fontSize: 64,
            color: "#0a0f1f",
            fontWeight: 900,
            fontFamily: "JetBrains Mono",
            align: "center",
          },
        ];
      },
    },
  ],
});
