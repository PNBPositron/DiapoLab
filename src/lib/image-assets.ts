export function stripEmbeddedImages<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripEmbeddedImages) as T;
  if (!value || typeof value !== "object") return value;
  const copy = { ...(value as Record<string, unknown>) };
  for (const [key, entry] of Object.entries(copy)) {
    if (typeof entry === "string" && entry.startsWith("data:image/")) delete copy[key];
    else copy[key] = stripEmbeddedImages(entry);
  }
  return copy as T;
}

export function isEmbeddedImage(value: string | undefined) {
  return Boolean(value?.startsWith("data:image/"));
}
