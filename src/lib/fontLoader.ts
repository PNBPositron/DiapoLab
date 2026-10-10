// Dynamically ensures a Google Font family is loaded — robust to fontFamily
// values that include fallbacks or quotes ("VT323, monospace", "'Anton', sans-serif").
// NOTE: the Google Fonts css2 URL must NOT request specific weights —
// families with a single weight (VT323, Anton, Bebas Neue…) return HTTP 400
// for the whole stylesheet if you ask for weights they don't have.

const loadedLinks = new Set<string>();
const loadedFonts = new Set<string>();

/** Extract the first, clean font family name from a CSS font-family value. */
export function parseFirstFamily(raw: string): string | null {
  const first = raw.split(",")[0] ?? "";
  const clean = first.replace(/["']/g, "").replace(/!important/gi, "").trim();
  if (!clean) return null;
  const generics = [
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-serif", "ui-monospace", "arial", "helvetica", "times", "georgia",
    "courier", "verdana", "tahoma", "impact", "comic sans ms",
  ];
  if (generics.includes(clean.toLowerCase())) return null;
  return clean;
}

/** Inject the Google Fonts stylesheet for a family (idempotent). */
function injectStylesheet(family: string) {
  const key = family.toLowerCase();
  if (loadedLinks.has(key)) return;
  loadedLinks.add(key);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  const q = family.replaceAll(" ", "+");
  // NO weights requested → Google serves whatever the family has. Never 400s.
  link.href = `https://fonts.googleapis.com/css2?family=${q}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Ensure a font family is actually downloaded and available for rendering.
 * Accepts a full font-family CSS value ("VT323, monospace") or a plain name.
 */
export async function ensureFontFamily(family?: string | null) {
  if (!family) return;
  const clean = family.trim();
  if (!clean) return;

  const name = parseFirstFamily(clean);
  if (!name) return;

  injectStylesheet(name);

  const key = name.toLowerCase();
  if (loadedFonts.has(key)) return;

  // Force the browser to actually download the font file(s). Try several
  // weights; families without them simply resolve — settled, never rejects.
  try {
    await Promise.allSettled([
      document.fonts.load(`400 16px "${name}"`),
      document.fonts.load(`700 16px "${name}"`),
      document.fonts.load(`900 16px "${name}"`),
    ]);
    loadedFonts.add(key);
  } catch {
    // font may not exist — ignore, browser will fall back
  }
}

/** Ensure every font family referenced by an array of slide pages is loaded. */
export async function ensureFontsForPages(
  pages: { elements?: Array<{ fontFamily?: string }> }[] | null | undefined,
) {
  if (!Array.isArray(pages)) return;
  const families = new Set<string>();
  for (const page of pages) {
    for (const el of page?.elements ?? []) {
      if (el?.fontFamily) {
        const name = parseFirstFamily(el.fontFamily);
        if (name) families.add(name);
      }
    }
  }
  await Promise.allSettled([...families].map((f) => ensureFontFamily(f)));
}
