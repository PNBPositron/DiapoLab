/* DiapoLab APP plugin example — import with "Import app code".
 * Apps are interactive mini-tools that open in a dialog from the Add-ons
 * panel and insert canvas elements on the slide. */

diapolabApp({
  name: "Sketch tools",
  author: "DiapoLab",
  version: "1.0.0",
  description: "A custom drawing pad with a pastel palette.",
  apps: [
    {
      name: "Pastel pad",
      description: "Soft pastel doodles, inserted as an image",
      type: "paint",
      config: {
        colors: ["#fbcfe8", "#ddd6fe", "#bfdbfe", "#bbf7d0", "#fde68a", "#0f172a"],
        defaultColor: "#0f172a",
        brushSizes: [4, 8, 16, 28],
        bg: "#fffbeb",
        width: 960,
        height: 540,
      },
    },
  ],
});
