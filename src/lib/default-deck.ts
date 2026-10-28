import type {
  AnyElement,
  Page,
  QuizElement,
  ShapeElement,
  TextElement,
} from "@/store/editor";

/* ------------------------------------------------------------------ */
/* Built-in starter deck — the default design shown on a new file.     */
/* Cyber theme (dark canvas, cyan accent, glitch titles, pill nav,    */
/* progress bar) reusing the layout of the AI deck, re-themed as a     */
/* presentation of DiapoLab itself. Text & shapes only — no assets.   */
/* ------------------------------------------------------------------ */

const BG = "#050508";
const CYAN = "#00f5ff";
const CYAN_SOFT = "#7dfbff";
const INK = "#f4fffe";
const SUB = "#d3e6e8";
const MUTED = "#6f8f95";
const RULE = "#16313a";
const PROG_BG = "#0a1a20";
const GREEN = "#27ff5a";
const RED = "#ff1a3c";
const BLUE = "#2f5bff";
const ALERT = "#ff2a3d";
const QUIZ_BG = "#091217";

let seq = 0;
const nid = (p: string) => `dd_${p}_${(seq++).toString(36)}`;

type Txt = Partial<TextElement> & {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};
const T = (o: Txt): TextElement =>
  ({
    id: nid("t"),
    type: "text",
    rotation: 0,
    align: "left",
    color: INK,
    fontWeight: 700,
    fontFamily: "Inter",
    ...o,
  }) as TextElement;

type Shp = Partial<ShapeElement> & {
  x: number;
  y: number;
  width: number;
  height: number;
};
const S = (o: Shp): ShapeElement =>
  ({
    id: nid("s"),
    type: "shape",
    shape: "rect",
    rotation: 0,
    fill: CYAN,
    stroke: CYAN,
    strokeWidth: 0,
    ...o,
  }) as ShapeElement;

/** RGB-split glitch headline: 3 offset ghosts + the crisp text on top. */
const glitch = (
  els: AnyElement[],
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  color = INK,
) => {
  const base = { text, width: w, height: h, fontSize: size, fontFamily: "Orbitron", fontWeight: 900 };
  els.push(T({ ...base, x, y: y + 2, color: GREEN }));
  els.push(T({ ...base, x: x - 3, y, color: RED }));
  els.push(T({ ...base, x: x + 3, y, color: BLUE }));
  els.push(T({ ...base, x, y, color }));
};

/** Brand chip + glitched wordmark, top-left. */
const brand = (els: AnyElement[]) => {
  els.push(S({ x: 100, y: 42, width: 14, height: 14, cornerRadius: 7 }));
  glitch(els, "DIAPOLAB STUDIO", 124, 34, 520, 28, 18);
};

/** Pill navigation 01–09 (active pill behind the current slide). */
const nav = (els: AnyElement[], active: number) => {
  for (let i = 1; i <= 9; i++) {
    const x = 1428 + (i - 1) * 48;
    if (i === active) {
      els.push(
        S({
          x,
          y: 28,
          width: 40,
          height: 40,
          cornerRadius: 20,
          interaction: { moveToSlide: i },
        }),
      );
    }
    els.push(
      T({
        text: String(i).padStart(2, "0"),
        x,
        y: 38,
        width: 40,
        height: 20,
        fontSize: 14,
        align: "center",
        color: i === active ? BG : MUTED,
        fontFamily: "Orbitron",
        fontWeight: i === active ? 900 : 700,
        interaction: { moveToSlide: i },
      }),
    );
  }
};

/** Progress bar + footer count + prev/next round buttons. */
const footer = (els: AnyElement[], idx: number, name: string, total = 9) => {
  const w = Math.round((1920 * idx) / total);
  els.push(S({ x: 0, y: 1074, width: 1920, height: 6, fill: PROG_BG, stroke: PROG_BG }));
  els.push(S({ x: 0, y: 1074, width: w, height: 6 }));
  els.push(
    T({
      text: `${String(idx).padStart(2, "0")} / ${String(total).padStart(2, "0")} // ${name}`,
      x: 100,
      y: 1036,
      width: 500,
      height: 24,
      fontSize: 16,
      fontWeight: 600,
      color: MUTED,
    }),
  );
  const prevIdx = idx - 1;
  const nextIdx = idx + 1;
  els.push(
    S({
      x: 1716,
      y: 1020,
      width: 44,
      height: 44,
      cornerRadius: 22,
      fill: BG,
      stroke: prevIdx >= 1 ? CYAN : RULE,
      strokeWidth: 2,
      ...(prevIdx >= 1 ? { interaction: { moveToSlide: prevIdx } } : {}),
    }),
  );
  els.push(
    T({
      text: "←",
      x: 1716,
      y: 1030,
      width: 44,
      height: 28,
      fontSize: 22,
      align: "center",
      fontWeight: 700,
      color: prevIdx >= 1 ? CYAN : "#1f4a52",
      ...(prevIdx >= 1 ? { interaction: { moveToSlide: prevIdx } } : {}),
    }),
  );
  const hasNext = nextIdx <= total;
  els.push(
    S({
      x: 1776,
      y: 1020,
      width: 44,
      height: 44,
      cornerRadius: 22,
      fill: hasNext ? CYAN : BG,
      stroke: hasNext ? CYAN : RULE,
      strokeWidth: 2,
      ...(hasNext ? { interaction: { moveToSlide: nextIdx } } : {}),
    }),
  );
  els.push(
    T({
      text: "→",
      x: 1776,
      y: 1030,
      width: 44,
      height: 28,
      fontSize: 22,
      align: "center",
      fontWeight: 700,
      color: hasNext ? BG : "#1f4a52",
      ...(hasNext ? { interaction: { moveToSlide: nextIdx } } : {}),
    }),
  );
};

/** Eyebrow line + glitch title + soft subtitle + description. */
const heading = (
  els: AnyElement[],
  eyebrow: string,
  title: string,
  size: number,
  sub?: string,
  desc?: string,
  titleW = 1500,
) => {
  els.push(
    T({ text: eyebrow, x: 100, y: 112, width: 700, height: 22, fontSize: 16, color: CYAN, fontWeight: 700 }),
  );
  glitch(els, title, 100, 148, titleW, Math.round(size * 1.3), size);
  let y = 148 + Math.round(size * 1.3) + 22;
  if (sub) {
    els.push(T({ text: sub, x: 100, y, width: titleW, height: 38, fontSize: 26, color: CYAN_SOFT, fontWeight: 600 }));
    y += 52;
  }
  if (desc) {
    els.push(
      T({ text: desc, x: 100, y, width: Math.min(960, titleW), height: 100, fontSize: 24, color: SUB, fontWeight: 400 }),
    );
  }
};

/** Feature card: top rule + cyan heading + description. */
const card = (els: AnyElement[], x: number, y: number, w: number, h: number, title: string, desc: string) => {
  els.push(S({ x, y, width: w, height: 2, fill: RULE, stroke: RULE }));
  els.push(
    T({
      text: title,
      x,
      y: y + 24,
      width: w,
      height: 36,
      fontSize: 24,
      color: CYAN_SOFT,
      fontFamily: "Orbitron",
      fontWeight: 900,
    }),
  );
  els.push(
    T({ text: desc, x, y: y + 78, width: w, height: h - 80, fontSize: 22, color: SUB, fontWeight: 400 }),
  );
};

/** Clickable contents row. */
const row = (els: AnyElement[], y: number, num: string, title: string, desc: string, target: number) => {
  els.push(
    S({ x: 100, y, width: 1720, height: 108, fill: BG, stroke: BG, interaction: { moveToSlide: target } }),
  );
  els.push(S({ x: 100, y, width: 1720, height: 2, fill: RULE, stroke: RULE }));
  els.push(
    T({
      text: num,
      x: 100,
      y: y + 34,
      width: 80,
      height: 40,
      fontSize: 28,
      color: CYAN,
      fontFamily: "Orbitron",
      fontWeight: 900,
      interaction: { moveToSlide: target },
    }),
  );
  els.push(
    T({
      text: title,
      x: 310,
      y: y + 34,
      width: 740,
      height: 40,
      fontSize: 28,
      fontFamily: "Orbitron",
      fontWeight: 900,
      interaction: { moveToSlide: target },
    }),
  );
  els.push(
    T({
      text: desc,
      x: 1090,
      y: y + 28,
      width: 640,
      height: 60,
      fontSize: 22,
      color: SUB,
      fontWeight: 400,
      interaction: { moveToSlide: target },
    }),
  );
  els.push(
    T({
      text: "→",
      x: 1760,
      y: y + 28,
      width: 60,
      height: 48,
      fontSize: 36,
      align: "right",
      color: CYAN,
      fontWeight: 700,
      interaction: { moveToSlide: target },
    }),
  );
};

/** Timeline item (label + title + description under a rule). */
const milestone = (els: AnyElement[], x: number, label: string, title: string, desc: string, descH = 84) => {
  els.push(S({ x, y: 612, width: 270, height: 2, fill: RULE, stroke: RULE }));
  els.push(
    T({
      text: label,
      x,
      y: 636,
      width: 250,
      height: 56,
      fontSize: 32,
      color: CYAN_SOFT,
      fontFamily: "Orbitron",
      fontWeight: 900,
    }),
  );
  els.push(
    T({
      text: title,
      x,
      y: 716,
      width: 270,
      height: 28,
      fontSize: 17,
      color: CYAN,
      fontFamily: "Orbitron",
      fontWeight: 800,
    }),
  );
  els.push(T({ text: desc, x, y: 756, width: 270, height: descH, fontSize: 20, color: SUB, fontWeight: 400 }));
};

/** Build one quiz with a stable correctId. */
const quizEl = (
  x: number,
  y: number,
  question: string,
  options: string[],
  correct: number,
): QuizElement => {
  const q = {
    id: nid("q"),
    type: "quiz",
    x,
    y,
    width: 560,
    height: 366,
    rotation: 0,
    bgColor: QUIZ_BG,
    fgColor: CYAN,
    accentColor: CYAN,
    uiStyle: "midnight",
    question,
    options: options.map((text) => ({ id: nid("o"), text })),
  } as unknown as QuizElement;
  q.correctId = q.options[correct].id;
  return q;
};

const page = (id: string, elements: AnyElement[], idx: number, name: string): Page => ({
  id,
  elements,
  bgColor: BG,
  duration: 4,
  transition: "morph",
  notes:
    idx === 1
      ? "Welcome slide — press R to replay the animations, arrow keys to navigate."
      : undefined,
});

/* ---------------------------- Slide 01 ---------------------------- */
const s1: AnyElement[] = [];
brand(s1);
nav(s1, 1);
s1.push(
  T({
    text: "PRESENTATIONS · APPS · MOTION",
    x: 100,
    y: 168,
    width: 900,
    height: 26,
    fontSize: 18,
    color: CYAN,
    fontWeight: 700,
  }),
);
glitch(s1, "DIAPOLAB", 100, 232, 1100, 190, 132);
s1.push(
  T({
    text: "Design, animate and present slides — with apps inside.",
    x: 100,
    y: 540,
    width: 900,
    height: 80,
    fontSize: 28,
    color: SUB,
    fontWeight: 500,
  }),
);
s1.push(
  S({ x: 100, y: 656, width: 300, height: 64, cornerRadius: 32, interaction: { moveToSlide: 2 } }),
);
s1.push(
  T({
    text: "START  →",
    x: 100,
    y: 674,
    width: 300,
    height: 28,
    fontSize: 20,
    align: "center",
    color: BG,
    fontFamily: "Orbitron",
    fontWeight: 900,
    interaction: { moveToSlide: 2 },
  }),
);
s1.push(S({ x: 100, y: 836, width: 940, height: 2, fill: RULE, stroke: RULE }));
const stats1: Array<[string, string]> = [
  ["SLIDE TRANSITIONS", "20 STYLES"],
  ["OBJECT ANIMATIONS", "16 PRESETS"],
  ["EXPORT", "PPTX · PDF"],
];
stats1.forEach(([label, value], i) => {
  s1.push(
    T({ text: label, x: 100 + i * 320, y: 858, width: 300, height: 20, fontSize: 14, color: MUTED, fontWeight: 700 }),
  );
  s1.push(
    T({
      text: value,
      x: 100 + i * 320,
      y: 886,
      width: 300,
      height: 32,
      fontSize: 20,
      fontFamily: "Orbitron",
      fontWeight: 800,
    }),
  );
});
footer(s1, 1, "TITLE");

/* ---------------------------- Slide 02 ---------------------------- */
const s2: AnyElement[] = [];
brand(s2);
nav(s2, 2);
glitch(s2, "CONTENTS", 100, 106, 900, 84, 64);
s2.push(
  T({
    text: "7 SECTIONS · CLICK A ROW",
    x: 1100,
    y: 148,
    width: 720,
    height: 24,
    fontSize: 16,
    align: "right",
    color: MUTED,
    fontWeight: 600,
  }),
);
const contents: Array<[string, string, string]> = [
  ["03", "THE EDITOR", "Canvas, elements, properties, pages and master style."],
  ["04", "APPS INSIDE", "Photopea, paint, video, web search and runtime apps."],
  ["05", "MOTION", "Transitions, entrance animations, delays and replay."],
  ["06", "CHARTS & QUIZ", "Data widgets and engagement, styled by theme."],
  ["07", "IMPORT & EXPORT", "PPTX with motion preserved, PDF, publish online."],
  ["08", "SHORTCUTS", "Move faster with the palette and presenter keys."],
  ["09", "QUIZ", "Test what you remember — six quick questions."],
];
contents.forEach(([num, title, desc], i) => row(s2, 230 + i * 108, num, title, desc, i + 3));
s2.push(S({ x: 100, y: 986, width: 1720, height: 2, fill: RULE, stroke: RULE }));
footer(s2, 2, "CONTENTS");

/* ---------------------------- Slide 03 ---------------------------- */
const s3: AnyElement[] = [];
brand(s3);
nav(s3, 3);
heading(
  s3,
  "03 // THE EDITOR",
  "ONE CANVAS, EVERY TOOL",
  52,
  "Compose, restyle and reuse — without leaving the slide",
  "Click any element to edit it in the properties panel. Guides snap everything into place, and the master style pushes one slide's look to the whole deck.",
  980,
);
const editorCards: Array<[string, string]> = [
  ["TEXT & SHAPES", "Type, draw, mask and layer — with smart alignment guides."],
  ["IMAGES & VIDEO", "Crop, filter and trim clips, or open Photopea right inside."],
  ["UI COMPONENTS", "Drop mockups: windows, browsers, terminals, phones."],
  ["PROPERTIES PANEL", "Color, font, shadow, effects — every option at hand."],
  ["PAGES & MASTER STYLE", "Push the current look to every slide in one click."],
  ["AI REDESIGN", "Auto-layout suggestions restyle the composition."],
];
editorCards.forEach(([title, desc], i) =>
  card(s3, 100 + i * 290, 612, 270, 240, title, desc),
);
footer(s3, 3, "THE EDITOR");

/* ---------------------------- Slide 04 ---------------------------- */
const s4: AnyElement[] = [];
brand(s4);
nav(s4, 4);
heading(
  s4,
  "04 // APPS",
  "APPS INSIDE YOUR SLIDES",
  52,
  "A studio, not just a canvas",
  "Apps open in windows over the editor, hand their result back to the slide, and can be closed, minimized or set fullscreen — just like desktop windows.",
  1500,
);
const appCards: Array<[string, string]> = [
  ["PHOTOPEA", "Full image editing in an embedded window — insert the PNG."],
  ["PAINT", "Sketch with brushes and shapes, insert as an image."],
  ["VIDEO STUDIO", "Trim, mute, change speed, set a poster frame."],
  ["WEB SEARCH", "Find pages, insert selected text or a screenshot."],
  ["RUNTIME APPS", "Sandboxed mini-apps that generate elements — try Glitch Title Maker."],
  ["WIDGET PACKS", "Install packs from Add-ons and reuse them anywhere."],
];
appCards.forEach(([title, desc], i) =>
  card(s4, 100 + i * 290, 640, 270, 240, title, desc),
);
footer(s4, 4, "APPS");

/* ---------------------------- Slide 05 ---------------------------- */
const s5: AnyElement[] = [];
brand(s5);
nav(s5, 5);
heading(
  s5,
  "05 // MOTION",
  "MOTION THAT PLAYS",
  56,
  "Cinematic transitions and per-object animations",
  "Pick a transition per slide, an entrance animation per object, then stagger them with delays in the Timeline. Press R while presenting to replay everything.",
  1500,
);
const motionCards: Array<[string, string]> = [
  ["20 TRANSITIONS", "Fade, morph, cube, neon, warp, prism, origami and more."],
  ["16 ANIMATIONS", "Entrance presets: pop, glitch, blur-in, slingshot…"],
  ["TIMELINE & DELAYS", "Stagger objects with per-element delays."],
  ["REPLAY WITH R", "Replay all animations during the presentation."],
  ["REDUCED MOTION", "Animations respect prefers-reduced-motion."],
  ["MORPH", "Paired elements glide between slides."],
];
motionCards.forEach(([title, desc], i) =>
  card(s5, 100 + i * 290, 640, 270, 240, title, desc),
);
footer(s5, 5, "MOTION");

/* ---------------------------- Slide 06 ---------------------------- */
const s6: AnyElement[] = [];
brand(s6);
nav(s6, 6);
heading(
  s6,
  "06 // DATA",
  "CHARTS, QUIZ & BLOCKS",
  56,
  "Engagement built in — no code required",
  undefined,
  1500,
);
const dataCards: Array<[string, string]> = [
  ["CHARTS", "Bar, line, area, pie and donut follow your visual theme."],
  ["QUIZ & POLLS", "Interactive quizzes and live audience polls."],
  ["MY BLOCKS", "Save any selection and reuse it in every design."],
  ["12 UI STYLES", "Cyber, glass, XP, aqua, matrix… same component, new skin."],
];
dataCards.forEach(([title, desc], i) =>
  card(s6, 100 + i * 440, 320, 400, 260, title, desc),
);
s6.push(S({ x: 100, y: 876, width: 1720, height: 2, fill: RULE, stroke: RULE }));
s6.push(
  T({
    text: "EVERYTHING FOLLOWS THE THEME YOU PICK — ONE CLICK RESTYLES THE DECK",
    x: 100,
    y: 904,
    width: 1720,
    height: 40,
    fontSize: 24,
    align: "center",
    color: ALERT,
    fontFamily: "Orbitron",
    fontWeight: 900,
  }),
);
footer(s6, 6, "DATA");

/* ---------------------------- Slide 07 ---------------------------- */
const s7: AnyElement[] = [];
brand(s7);
nav(s7, 7);
heading(
  s7,
  "07 // IMPORT & EXPORT",
  "IN & OUT",
  56,
  "Your deck travels well",
  "PPTX import and export keep your transitions and animations; PDF shares a pixel-perfect copy; publishing posts a template online for everyone.",
  980,
);
milestone(s7, 100, "PPTX", "POWERPOINT", "Import and export decks — transitions and animations included.");
milestone(s7, 390, "PDF", "SHARE", "A pixel-perfect copy of every slide.");
milestone(s7, 680, "PUBLISH", "ONLINE", "Post your deck as a public template.");
milestone(s7, 970, "VERSIONS", "HISTORY", "Snapshot and restore any point in time.");
milestone(s7, 1260, "CLOUD", "SYNC", "Your designs open on any device.");
milestone(s7, 1550, "SAFETY", "SANDBOX", "Runtime apps run sandboxed — scripts only, no network.", 110);
footer(s7, 7, "IMPORT & EXPORT");

/* ---------------------------- Slide 08 ---------------------------- */
const s8: AnyElement[] = [];
brand(s8);
nav(s8, 8);
s8.push(
  T({ text: "08 // SHORTCUTS", x: 100, y: 112, width: 700, height: 22, fontSize: 16, color: CYAN, fontWeight: 700 }),
);
glitch(s8, "MOVE FASTER", 100, 156, 900, 84, 64);
const shortcutCol = (x: number, title: string, items: Array<[string, string]>) => {
  s8.push(S({ x, y: 156, width: 820, height: 2, fill: RULE, stroke: RULE }));
  s8.push(
    T({
      text: title,
      x: x + 76,
      y: 180,
      width: 744,
      height: 40,
      fontSize: 26,
      fontFamily: "Orbitron",
      fontWeight: 900,
    }),
  );
  items.forEach(([key, label], i) => {
    const y = 252 + i * 90;
    s8.push(S({ x: x + 2, y: y + 11, width: 12, height: 12, cornerRadius: 3 }));
    s8.push(
      T({ text: `${key} — ${label}`, x: x + 34, y, width: 786, height: 34, fontSize: 22, color: CYAN_SOFT, fontWeight: 600 }),
    );
  });
};
shortcutCol(100, "EDITOR", [
  ["⌘ / Ctrl + K", "Open the command palette"],
  ["⌘ / Ctrl + Z", "Undo — Shift to redo"],
  ["Delete", "Remove the selection"],
  ["⌘ / Ctrl + D", "Duplicate the selection"],
]);
shortcutCol(1000, "PRESENTING", [
  ["R", "Replay the slide animations"],
  ["← →", "Previous / next slide"],
  ["Home", "Jump to the first slide"],
  ["Esc", "Exit the presentation"],
]);
footer(s8, 8, "SHORTCUTS");

/* ---------------------------- Slide 09 ---------------------------- */
const s9: AnyElement[] = [];
brand(s9);
nav(s9, 9);
glitch(s9, "DIAPOLAB QUIZ", 100, 106, 1300, 76, 56);
s9.push(
  T({
    text: "6 QUESTIONS · ONE CORRECT ANSWER EACH",
    x: 100,
    y: 188,
    width: 1000,
    height: 24,
    fontSize: 16,
    color: MUTED,
    fontWeight: 600,
  }),
);
s9.push(
  quizEl(100, 244, "Which image editor is embedded in DiapoLab?", ["Photopea", "Photoshop", "GIMP", "Figma"], 0),
);
s9.push(
  quizEl(680, 244, "Which key replays animations while presenting?", ["R", "P", "A", "Esc"], 0),
);
s9.push(
  quizEl(1260, 244, "What do runtime apps do?", [
    "Generate elements from sandboxed code",
    "Edit videos",
    "Translate slides",
    "Host your deck",
  ], 0),
);
s9.push(
  quizEl(100, 634, "Which transition glides paired elements between slides?", ["Morph", "Fade", "Cube", "None"], 0),
);
s9.push(
  quizEl(680, 634, "Where are saved blocks stored?", ["In your browser, reusable everywhere", "In PowerPoint", "On a public server", "Only on one slide"], 0),
);
s9.push(
  quizEl(1260, 634, "What does the master style do?", [
    "Pushes one slide's look to the whole deck",
    "Exports the deck",
    "Adds a quiz",
    "Changes the canvas size",
  ], 0),
);
footer(s9, 9, "QUIZ");

export const DEFAULT_PAGES: Page[] = [
  page("dd_slide_01_title", s1, 1, "TITLE"),
  page("dd_slide_02_contents", s2, 2, "CONTENTS"),
  page("dd_slide_03_editor", s3, 3, "THE EDITOR"),
  page("dd_slide_04_apps", s4, 4, "APPS"),
  page("dd_slide_05_motion", s5, 5, "MOTION"),
  page("dd_slide_06_data", s6, 6, "DATA"),
  page("dd_slide_07_export", s7, 7, "IMPORT & EXPORT"),
  page("dd_slide_08_shortcuts", s8, 8, "SHORTCUTS"),
  page("dd_slide_09_quiz", s9, 9, "QUIZ"),
];
