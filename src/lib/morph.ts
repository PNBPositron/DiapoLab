import type { AnyElement } from "@/store/editor";

export type MorphGeometry = { x: number; y: number; w: number; h: number; rotation: number };

function contentKey(element: AnyElement): string | undefined {
  if (element.type === "text") return "text:" + element.text.trim();
  if (element.type === "image") return "image:" + element.src;
  return undefined;
}

/** Normalize text for fuzzy matching: strip accents, case and punctuation. */
function normText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when two texts are clearly the same object reworded. */
function textSimilar(a: string, b: string): boolean {
  const na = normText(a);
  const nb = normText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const short = na.length <= nb.length ? na : nb;
  const long = na.length <= nb.length ? nb : na;
  return short.length >= 8 && long.includes(short);
}

/** One-to-one matches: stable identity, unchanged content, similar text, then same-type order. */
export function matchMorphElements(outgoing: AnyElement[], incoming: AnyElement[]) {
  const remaining = new Set(outgoing);
  const matches = new Map<string, MorphGeometry>();
  const assign = (target: AnyElement, source: AnyElement | undefined) => {
    if (!source) return;
    remaining.delete(source);
    matches.set(target.id, {
      x: source.x,
      y: source.y,
      w: source.width,
      h: source.height,
      rotation: source.rotation,
    });
  };
  for (const target of incoming)
    assign(
      target,
      [...remaining].find((source) => source.id === target.id && source.type === target.type),
    );
  for (const target of incoming) {
    if (matches.has(target.id)) continue;
    const key = contentKey(target);
    if (key)
      assign(
        target,
        [...remaining].find((source) => contentKey(source) === key),
      );
  }
  // Fuzzy text pass: the same object with a reworded caption still morphs.
  for (const target of incoming) {
    if (matches.has(target.id) || target.type !== "text") continue;
    assign(
      target,
      [...remaining].find(
        (source) => source.type === "text" && textSimilar(source.text, target.text),
      ),
    );
  }
  for (const target of incoming) {
    if (!matches.has(target.id))
      assign(
        target,
        [...remaining].find((source) => source.type === target.type),
      );
  }
  return matches;
}
