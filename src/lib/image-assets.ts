import { supabase } from "@/integrations/supabase/client";

const MAX_DIMENSION = 1920;
const MAX_BYTES = 2_500_000;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))), type, quality);
  });
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, "image/webp", quality);
  while (blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/webp", quality);
  }
  return blob;
}

export async function uploadAccountImage(file: File): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to store images in your account");
  const blob = await compressImage(file);
  const path = `${userData.user.id}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("account-images").upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signedError } = await supabase.storage
    .from("account-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError || !data?.signedUrl) throw signedError ?? new Error("Could not create image URL");
  return data.signedUrl;
}

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

export { compressImage };
