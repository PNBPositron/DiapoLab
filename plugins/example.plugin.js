/* ==========================================================================
   DiapoLab — Advanced example plugin
   ==========================================================================

   A DiapoLab plugin is plain JavaScript. It defines widgets — named groups
   of canvas elements — that become insertable presets in the editor
   (Presets -> Blocks -> "Plugin blocks", or the Plugins panel).

   HOW TO USE THIS FILE
   --------------------
   1. Open the Marketplace -> Plugins tab -> "Import plugin code"
   2. Paste the entire content of this file (or click "Load sample")
   3. The widgets appear in Presets -> Blocks while the plugin is enabled

   FORMAT
   ------
   diapolabPlugin({
     name: "My Plugin",            // required
     author: "You",               // optional
     version: "1.0.0",            // optional
     description: "What it adds", // optional
     widgets: [                   // required, non-empty
       {
         name: "Widget name",
         description: "Shown as tooltip",
         elements: [ /* canvas elements */ ],
         // "elements" may also be a FUNCTION returning the array —
         // it is re-evaluated at every insert, perfect for randomness.
       },
     ],
   });

   AVAILABLE ELEMENT TYPES (most useful fields)
   --------------------------------------------
   Common to all: type, x, y, width, height, rotation, animation,
                 shadow: { x, y, blur, color }, opacity

   text  : text, fontSize, color, fontWeight, fontFamily, align
            ("left"|"center"|"right"), italic, underline, letterSpacing,
            gradient: { from, to, angle }, maskShape, textTransform
   shape : shape (rect, circle, triangle, star, hexagon, heart, arrow, blob,
            speech, shield, ticket, wave, ring, capsule, honeycomb, dot_grid,
            glitch, starburst, gear, moon…), fill, stroke, strokeWidth,
            effect ("none"|"liquid_glass"|"neon"|"soft_shadow"|"inner_glow"),
            gradient: { from, to, angle }, cornerRadius, strokeStyle, maskShape
   icon  : name (lucide name in PascalCase, e.g. "Rocket"), color, strokeWidth
   image : src (URL), fit ("cover"|"contain"), maskShape, cornerRadius,
            filters: { brightness, contrast, saturate, grayscale, blur… }
   chart : chart ("bar"|"line"|"area"|"pie"|"donut"), data: [{ label, value }],
            colors: string[], bgColor, fgColor, title, showValues, uiStyle
   button: text, bgColor, fgColor, borderColor, cornerRadius, fontSize,
            action ("next-slide"|"prev-slide"|"first-slide"|"last-slide"|"link")
   ui    : kind (card, stat, badge, progress, alert, list, quote, profile,
            pricing, kbd, terminal, browser, phone, modal, tabs, timeline…),
            uiStyle ("cyber"|"glass"|"neobrutalist"|"aqua"|"midnight"…),
            title, body, value, items, accentColor
   quiz  : question, options, correctId, bgColor, fgColor, accentColor

   Coordinates are canvas pixels — a 1920x1080 slide is the default deck.
   ========================================================================== */

diapolabPlugin({
  name: "Showcase Kit",
  author: "DiapoLab",
  version: "2.0.0",
  description:
    "Ten advanced widgets: gradient hero, dot-matrix generator, KPI row, " +
    "donut chart, icon lockups, interactive buttons, glass panels and more.",

  widgets: [
    /* -- 1. Gradient hero — shapes with gradients + gradient text ------- */
    {
      name: "Gradient hero",
      description: "Diagonal gradient panel with gradient headline",
      elements: [
        {
          type: "shape",
          x: 120, y: 140, width: 1680, height: 420,
          rotation: 0,
          shape: "rect",
          fill: "#111827",
          stroke: "transparent",
          strokeWidth: 0,
          gradient: { from: "#2563eb", to: "#7c3aed", angle: 120 },
          cornerRadius: 28,
        },
        {
          type: "text",
          x: 200, y: 240, width: 1300, height: 120,
          rotation: 0,
          text: "Ship presentations at light speed",
          fontSize: 84,
          color: "#ffffff",
          fontWeight: 900,
          fontFamily: "Archivo Black",
          align: "left",
        },
        {
          type: "text",
          x: 200, y: 390, width: 900, height: 60,
          rotation: 0,
          text: "Plugins, templates and charts — all in one canvas.",
          fontSize: 28,
          color: "rgba(255,255,255,0.75)",
          fontWeight: 500,
          fontFamily: "Inter",
          align: "left",
        },
      ],
    },

    /* -- 2. KPI row — three stat cards side by side ---------------------- */
    {
      name: "KPI row",
      description: "Three glass stat cards with big numbers",
      elements: [
        {
          type: "ui", kind: "stat", uiStyle: "glass",
          x: 140, y: 620, width: 420, height: 240, rotation: 0,
          title: "Decks created", body: "+18% vs last month", value: 12480,
          accentColor: "#2563eb",
        },
        {
          type: "ui", kind: "stat", uiStyle: "glass",
          x: 590, y: 620, width: 420, height: 240, rotation: 0,
          title: "Exports", body: "PDF, PPTX, PNG & GIF", value: 8620,
          accentColor: "#7c3aed",
        },
        {
          type: "ui", kind: "stat", uiStyle: "glass",
          x: 1040, y: 620, width: 420, height: 240, rotation: 0,
          title: "Plugins installed", body: "From the community", value: 347,
          accentColor: "#059669",
        },
      ],
    },

    /* -- 3. Dot matrix — DYNAMIC generator function ---------------------- */
    {
      name: "Dot matrix 8x5",
      description: "Randomized 8x5 grid of dots, new palette each insert",
      elements: () => {
        const palettes = [
          ["#2563eb", "#7df9ff", "#111827"],
          ["#ff0080", "#ffd84a", "#0a0a0a"],
          ["#059669", "#a7f3d0", "#064e3b"],
          ["#7c3aed", "#c4b5fd", "#1e1b4b"],
        ];
        const palette = palettes[Math.floor(Math.random() * palettes.length)];
        const cols = 8, rows = 5, size = 56, gap = 24;
        const dots = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            dots.push({
              type: "shape",
              x: 140 + c * (size + gap),
              y: 620 + r * (size + gap),
              width: size, height: size, rotation: 0,
              shape: Math.random() > 0.85 ? "star" : "circle",
              fill: palette[Math.floor(Math.random() * palette.length)],
              stroke: "transparent",
              strokeWidth: 0,
            });
          }
        }
        return dots;
      },
    },

    /* -- 4. Donut chart — data viz showcase ------------------------------ */
    {
      name: "Traffic donut",
      description: "Donut chart with a matching legend",
      elements: [
        {
          type: "chart",
          x: 140, y: 640, width: 520, height: 420, rotation: 0,
          chart: "donut",
          data: [
            { label: "Direct", value: 42 },
            { label: "Social", value: 27 },
            { label: "Search", value: 19 },
            { label: "Email", value: 12 },
          ],
          colors: ["#2563eb", "#ff0080", "#ffd84a", "#059669"],
          bgColor: "#ffffff",
          fgColor: "#111827",
          title: "Traffic sources",
          showValues: true,
        },
        {
          type: "ui", kind: "list", uiStyle: "aqua",
          x: 700, y: 680, width: 420, height: 340, rotation: 0,
          title: "Top channels",
          items: ["Direct — 42%", "Social — 27%", "Search — 19%", "Email — 12%"],
          accentColor: "#2563eb",
        },
      ],
    },

    /* -- 5. Icon lockup — lucide icons + labels -------------------------- */
    {
      name: "Feature trio",
      description: "Three icons with captions",
      elements: [
        { type: "icon", x: 140, y: 640, width: 120, height: 120, rotation: 0,
          name: "Rocket", color: "#2563eb", strokeWidth: 2 },
        { type: "text", x: 140, y: 780, width: 300, height: 50, rotation: 0,
          text: "Fast export", fontSize: 24, color: "#111827",
          fontWeight: 700, fontFamily: "Inter", align: "left" },
        { type: "icon", x: 520, y: 640, width: 120, height: 120, rotation: 0,
          name: "Puzzle", color: "#7c3aed", strokeWidth: 2 },
        { type: "text", x: 520, y: 780, width: 300, height: 50, rotation: 0,
          text: "Plugin packs", fontSize: 24, color: "#111827",
          fontWeight: 700, fontFamily: "Inter", align: "left" },
        { type: "icon", x: 900, y: 640, width: 120, height: 120, rotation: 0,
          name: "BarChart3", color: "#059669", strokeWidth: 2 },
        { type: "text", x: 900, y: 780, width: 300, height: 50, rotation: 0,
          text: "Live charts", fontSize: 24, color: "#111827",
          fontWeight: 700, fontFamily: "Inter", align: "left" },
      ],
    },

    /* -- 6. Interactive buttons — click actions during playback ---------- */
    {
      name: "Nav buttons",
      description: "Previous / next / link buttons with real actions",
      elements: [
        {
          type: "button",
          x: 140, y: 900, width: 260, height: 88, rotation: 0,
          text: "PREV", bgColor: "#ffffff", fgColor: "#111827",
          borderColor: "#111827", cornerRadius: 14,
          fontSize: 26, action: "prev-slide",
        },
        {
          type: "button",
          x: 430, y: 900, width: 260, height: 88, rotation: 0,
          text: "NEXT", bgColor: "#111827", fgColor: "#ffffff",
          borderColor: "#111827", cornerRadius: 14,
          fontSize: 26, action: "next-slide",
        },
        {
          type: "button",
          x: 720, y: 900, width: 320, height: 88, rotation: 0,
          text: "GITHUB", bgColor: "#ffd84a", fgColor: "#0a0a0a",
          borderColor: "#0a0a0a", cornerRadius: 44,
          fontSize: 26, action: "link", href: "https://github.com/PNBPositron/DiapoLab",
        },
      ],
    },

    /* -- 7. Liquid glass card — effect showcase -------------------------- */
    {
      name: "Glass quote",
      description: "Liquid-glass blob behind a quote",
      elements: [
        {
          type: "shape",
          x: 1180, y: 600, width: 620, height: 360, rotation: -4,
          shape: "blob",
          fill: "#93c5fd",
          stroke: "transparent",
          strokeWidth: 0,
          effect: "liquid_glass",
        },
        {
          type: "ui", kind: "quote", uiStyle: "glass",
          x: 1240, y: 660, width: 520, height: 240, rotation: 0,
          title: "Simple things should be simple, complex things should be possible.",
          body: "Alan Kay",
          accentColor: "#2563eb",
        },
      ],
    },

    /* -- 8. Terminal — UI component showcase ----------------------------- */
    {
      name: "Deploy terminal",
      description: "Cyber-style terminal window",
      elements: [
        {
          type: "ui", kind: "terminal", uiStyle: "cyber",
          x: 1180, y: 140, width: 620, height: 380, rotation: 0,
          title: "zsh — deploy",
          items: [
            "$ diapolab build",
            "resolving plugins... ok",
            "rendering 12 slides... ok",
            "$ diapolab publish",
            "live at https://diapolab.app/t/demo",
          ],
          accentColor: "#ff0080",
        },
      ],
    },

    /* -- 9. Progress dashboard — progress + timeline --------------------- */
    {
      name: "Roadmap block",
      description: "Progress bars and a product timeline",
      elements: [
        {
          type: "ui", kind: "progress", uiStyle: "midnight",
          x: 140, y: 640, width: 500, height: 150, rotation: 0,
          title: "Editor v2", body: "shipping Q3", value: 78,
          accentColor: "#6366f1",
        },
        {
          type: "ui", kind: "progress", uiStyle: "midnight",
          x: 680, y: 640, width: 500, height: 150, rotation: 0,
          title: "Plugin SDK", body: "beta open", value: 45,
          accentColor: "#22d3ee",
        },
        {
          type: "ui", kind: "timeline", uiStyle: "aqua",
          x: 140, y: 830, width: 1040, height: 200, rotation: 0,
          title: "2026 launch plan",
          items: ["Discovery", "Prototype", "Beta", "GA"],
          value: 60,
          accentColor: "#2563eb",
        },
      ],
    },

    /* -- 10. Poll — audience interaction -------------------------------- */
    {
      name: "Audience poll",
      description: "Live poll element + hint text",
      elements: [
        {
          type: "ui", kind: "alert", uiStyle: "neobrutalist",
          x: 140, y: 580, width: 640, height: 140, rotation: 0,
          title: "VOTE NOW",
          body: "Which feature should we build next?",
          accentColor: "#ff0080",
        },
        {
          type: "text",
          x: 140, y: 740, width: 640, height: 50, rotation: 0,
          text: "Insert a Quiz/Poll from Elements for the live widget.",
          fontSize: 20, color: "#64748b", fontWeight: 500,
          fontFamily: "Inter", align: "left",
        },
      ],
    },
  ],
});
