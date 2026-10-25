/* DiapoLab PACK plugin example — import with "Import pack code".
 * Widgets are named groups of canvas elements; each one lands as a single
 * grouped block on the slide. Coordinates are in slide pixels (1920x1080). */

diapolabPack({
  name: "Editorial kit",
  author: "DiapoLab",
  version: "1.0.0",
  description: "Three ready-to-drop layout presets.",
  widgets: [
    {
      name: "Section header",
      description: "Accent bar + big title",
      elements: [
        { type: "shape", x: 140, y: 160, width: 160, height: 16, rotation: 0, shape: "rect", fill: "#2563eb", stroke: "transparent", strokeWidth: 0, cornerRadius: 8 },
        { type: "text", x: 140, y: 196, width: 900, height: 120, rotation: 0, text: "Section title", fontSize: 72, color: "#0f172a", fontWeight: 900, fontFamily: "Archivo Black", align: "left" },
        { type: "text", x: 144, y: 330, width: 760, height: 50, rotation: 0, text: "A short supporting sentence goes here.", fontSize: 26, color: "#64748b", fontWeight: 500, fontFamily: "Inter", align: "left" },
      ],
    },
    {
      name: "Quote block",
      description: "Italic pull-quote",
      elements: [
        { type: "text", x: 160, y: 420, width: 800, height: 140, rotation: 0, text: "\u201CDesign is intelligence made visible.\u201D", fontSize: 40, color: "#1e293b", fontWeight: 600, fontFamily: "Georgia", align: "left", italic: true },
      ],
    },
    {
      name: "Stat tile",
      description: "White card with a big number",
      elements: [
        { type: "shape", x: 140, y: 140, width: 460, height: 300, rotation: 0, shape: "rect", fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 2, cornerRadius: 28, shadow: { x: 0, y: 18, blur: 40, color: "rgba(15,23,42,0.14)" } },
        { type: "text", x: 184, y: 184, width: 380, height: 120, rotation: 0, text: "12.4k", fontSize: 88, color: "#0f172a", fontWeight: 900, fontFamily: "Archivo Black", align: "left" },
        { type: "text", x: 188, y: 320, width: 380, height: 50, rotation: 0, text: "+18% this month", fontSize: 24, color: "#059669", fontWeight: 700, fontFamily: "Inter", align: "left" },
      ],
    },
  ],
});
