import type { AnyElement } from "@/store/editor";

export type MorphGeometry = { x: number; y: number; w: number; h: number; rotation: number };

function contentKey(element: AnyElement): string | undefined {
  if (element.type === "text") return "text:" + element.text.trim();
  if (element.type === "image") return "image:" + element.src;
  return undefined;
}

/** One-to-one matches by stable identity, exact content, then same-type order. */
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

  // Identity wins even if an element changed its visual type between slides.
  for (const target of incoming)
    assign(
      target,
      [...remaining].find((source) => source.id === target.id),
    );

  // Exact content is the next-best signal, still consuming each source once.
  for (const target of incoming) {
    if (matches.has(target.id)) continue;
    const key = contentKey(target);
    if (key)
      assign(
        target,
        [...remaining].find((source) => contentKey(source) === key),
      );
  }

  // Last resort: preserve stacking order among elements of the same type.
  for (const target of incoming) {
    if (!matches.has(target.id))
      assign(
        target,
        [...remaining].find((source) => source.type === target.type),
      );
  }
  return matches;
}
