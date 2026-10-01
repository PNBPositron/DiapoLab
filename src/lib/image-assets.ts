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

/** Resize and encode once on import, before the image enters design history or persistence. */
export async function prepareImage(file: File, maxSide = 1920): Promise<string> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Choose a PNG, JPEG, WebP, GIF or other raster image.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("Image too large (max 25 MB).");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Could not read this image.");
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL("image/webp", attempt > 1 ? 0.7 : 0.8);
      if (result.length < 1_300_000 || attempt === 4) return result;
      scale *= 0.75;
    }
    throw new Error("Could not prepare this image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
