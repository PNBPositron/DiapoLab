// Dynamically ensures a Google Font family is loaded.
// The static <link> in __root.tsx only covers a fixed list — templates from
// the community may reference fonts outside it, which would silently fall back
// in previews (TemplatesPanel, PagesBar thumbnails…) and on the canvas.

const loaded = new Set<string>();

export function ensureFontFamily(family?: string | null) {
  if (!family) return;
  const clean = family.trim();
  if (!clean || loaded.has(clean)) return;
  loaded.add(clean);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  const q = clean.replaceAll(" ", "+");
  link.href = `https://fonts.googleapis.com/css2?family=${q}:wght@400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function ensureFontsForPages(
  pages: { elements?: Array<{ fontFamily?: string }> }[] | null | undefined,
) {
  if (!Array.isArray(pages)) return;
  for (const page of pages) {
    for (const el of page?.elements ?? []) {
      ensureFontFamily(el?.fontFamily);
    }
  }
}
