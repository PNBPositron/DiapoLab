import {
  newText,
  newShape,
  newChart,
  newUi,
  newButton,
  newQuiz,
  type AnyElement,
  type Page,
  type SlideTransition,
} from "@/store/editor";

/* ------------------------------------------------------------------ */
/* Built-in starter decks — complete multi-slide skeletons that work   */
/* offline, unlike the community templates (which need Supabase).      */
/* They are designed for the default 1920x1080 canvas.                 */
/* ------------------------------------------------------------------ */

const uid = () => "sd_" + Math.random().toString(36).slice(2, 10);

const pg = (bg: string, elements: AnyElement[], transition: SlideTransition = "fade"): Page => ({
  id: uid(),
  elements,
  bgColor: bg,
  duration: 3,
  transition,
});

const heading = (text: string, color: string, y = 160) =>
  newText({ x: 140, y, width: 1400, height: 140, text, fontSize: 84, color, fontWeight: 900, fontFamily: "Archivo Black" });

const body = (text: string, color: string, y = 340, size = 36) =>
  newText({ x: 140, y, width: 1300, height: 120, text, fontSize: size, color, fontWeight: 500, fontFamily: "Inter" });

export type StarterDeck = {
  id: string;
  name: string;
  description: string;
  accent: string;
  pages: Page[];
};

/* ── Pitch deck — dark, high-energy startup story ─────────────────── */
const pitch: Page[] = [
  pg("#0a0f1f", [
    newShape("accent_slash", { x: 140, y: 120, width: 90, height: 220, fill: "#ff0080", stroke: "transparent", strokeWidth: 0 }),
    heading("NorthStar", "#ffffff", 380),
    body("The deck that gets you funded — problem, traction, team, ask.", "#7df9ff", 560),
  ]),
  pg("#0a0f1f", [
    heading("The problem", "#7df9ff"),
    body("Teams lose hours formatting slides instead of telling their story. Existing tools are either too rigid or too empty.", "#e2e8f0", 340),
    newUi("alert", "midnight", { x: 140, y: 560, width: 900, title: "Time lost per deck", body: "4+ hours of pure formatting, every single time.", accentColor: "#ff0080" }),
  ]),
  pg("#0a0f1f", [
    heading("Traction", "#7df9ff"),
    newChart("bar", { x: 140, y: 340, width: 1000, height: 560, bgColor: "#0a0f1f", fgColor: "#7df9ff", title: "Monthly active decks", data: [
      { label: "Jan", value: 12 }, { label: "Feb", value: 28 }, { label: "Mar", value: 64 }, { label: "Apr", value: 121 },
    ], colors: ["#7df9ff", "#ff0080", "#ffd84a", "#4d7cff"] }),
  ]),
  pg("#0a0f1f", [
    heading("The team", "#7df9ff"),
    newUi("profile", "midnight", { x: 140, y: 340, width: 520, title: "Ada Lovelace", body: "CEO — product & vision", accentColor: "#7df9ff" }),
    newUi("profile", "midnight", { x: 700, y: 340, width: 520, title: "Alan Kay", body: "CTO — engineering", accentColor: "#7df9ff" }),
  ]),
  pg("#0a0f1f", [
    heading("The ask", "#7df9ff"),
    body("We're raising 1.2M EUR to ship the collaboration layer and grow to 10k teams.", "#e2e8f0", 340),
    newButton({ x: 140, y: 560, width: 360, height: 100, text: "Let's talk", bgColor: "#ff0080", fgColor: "#ffffff", borderColor: "#ff0080", action: "link" }),
  ]),
];

/* ── Course deck — light, structured lesson plan ───────────────────── */
const course: Page[] = [
  pg("#f8fafc", [
    newText({ x: 140, y: 380, width: 1500, height: 90, text: "UNIT 3 · LESSON 1", fontSize: 30, color: "#2b6cff", fontWeight: 800, fontFamily: "Archivo Black" }),
    heading("Introduction to Genetics", "#0f172a", 470),
  ]),
  pg("#f8fafc", [
    heading("Today's plan", "#0f172a"),
    newUi("list", "aqua", { x: 140, y: 340, width: 700, height: 480, title: "Agenda", items: ["What is DNA?", "From genes to traits", "Mendel's experiments", "Quiz & recap"] }),
    newUi("quote", "aqua", { x: 900, y: 340, width: 560, height: 300, title: "Genetics is the grammar of life.", body: "Course handbook, ch. 3" }),
  ]),
  pg("#f8fafc", [
    heading("From genes to traits", "#0f172a"),
    body("DNA carries the instructions. Genes are segments that code for traits. In this lesson we follow one trait through a family tree.", "#334155"),
    newShape("hex_ring", { x: 1300, y: 420, width: 420, height: 420, fill: "#2b6cff", stroke: "#2b6cff", strokeWidth: 4, opacity: 0.2 }),
  ]),
  pg("#f8fafc", [
    heading("Check your knowledge", "#0f172a"),
    newQuiz({ x: 320, y: 340, question: "Which molecule carries genetic instructions?", options: [
      { id: "q1a", text: "ATP" }, { id: "q1b", text: "DNA" }, { id: "q1c", text: "RNA polymerase" }, { id: "q1d", text: "Lipids" },
    ], correctId: "q1b" }),
  ]),
  pg("#f8fafc", [
    heading("Recap", "#0f172a"),
    newUi("list", "aqua", { x: 140, y: 340, width: 700, height: 440, title: "Key takeaways", items: ["DNA = the instruction manual", "Genes code for traits", "Mendel showed how traits pass on"] }),
    newUi("alert", "aqua", { x: 900, y: 340, width: 560, title: "Homework", body: "Read chapter 3.2 and prepare one question for next class.", accentColor: "#2b6cff" }),
  ]),
];

/* ── Report deck — clean corporate review ──────────────────────────── */
const report: Page[] = [
  pg("#ffffff", [
    newText({ x: 140, y: 380, width: 1500, height: 90, text: "FY 2026 · Q4", fontSize: 30, color: "#2563eb", fontWeight: 800, fontFamily: "Archivo Black" }),
    heading("Business Review", "#0f172a", 470),
    body("Operations · Finance · Roadmap — presented by the exec team.", "#64748b", 600, 30),
  ]),
  pg("#ffffff", [
    heading("Key figures", "#0f172a"),
    newUi("stat", "material", { x: 140, y: 340, width: 420, title: "Revenue", body: "+18% QoQ", value: 1840000, accentColor: "#2563eb" }),
    newUi("stat", "material", { x: 600, y: 340, width: 420, title: "Customers", body: "+2,400 new", value: 12400, accentColor: "#2563eb" }),
    newUi("stat", "material", { x: 1060, y: 340, width: 420, title: "Churn", body: "-0.4 pts", value: 460, accentColor: "#2563eb" }),
  ]),
  pg("#ffffff", [
    heading("Revenue trend", "#0f172a"),
    newChart("line", { x: 140, y: 340, width: 1100, height: 560, bgColor: "#ffffff", fgColor: "#0f172a", title: "Quarterly revenue (EUR)", data: [
      { label: "Q1", value: 940 }, { label: "Q2", value: 1120 }, { label: "Q3", value: 1390 }, { label: "Q4", value: 1840 },
    ], colors: ["#2563eb"] }),
  ]),
  pg("#ffffff", [
    heading("Roadmap", "#0f172a"),
    newUi("timeline", "material", { x: 140, y: 360, width: 1400, height: 300, title: "Next two quarters", items: ["Q1 — Collaboration layer", "Q2 — Marketplace v2"], accentColor: "#2563eb" }),
  ]),
  pg("#ffffff", [
    heading("Conclusion", "#0f172a"),
    body("A record quarter. The plan for 2027 focuses on retention and the enterprise segment.", "#334155"),
    newUi("quote", "material", { x: 140, y: 520, width: 900, height: 280, title: "Under-promise, over-deliver — and keep the deck clean.", body: "CEO closing note", accentColor: "#2563eb" }),
  ]),
];

export const STARTER_DECKS: StarterDeck[] = [
  {
    id: "starter-pitch",
    name: "Startup pitch",
    description: "Problem, traction, team, ask",
    accent: "#ff0080",
    pages: pitch,
  },
  {
    id: "starter-course",
    name: "Course lesson",
    description: "Agenda, content, quiz & recap",
    accent: "#2b6cff",
    pages: course,
  },
  {
    id: "starter-report",
    name: "Business report",
    description: "KPIs, chart, roadmap & conclusion",
    accent: "#2563eb",
    pages: report,
  },
];
