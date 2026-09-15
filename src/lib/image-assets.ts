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

export type AccountImage = {
  id: string;
  name: string;
  path: string;
  url: string;
  createdAt: string;
};

function imageName(file: File) {
  const base = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return base || "uploaded-image";
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read compressed image"));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read compressed image"));
    reader.readAsDataURL(blob);
  });
}

async function signedImageUrl(path: string) {
  const { data, error } = await supabase.storage.from("account-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create image URL");
  return data.signedUrl;
}

export async function uploadAccountImage(file: File): Promise<AccountImage> {
  const { data: userData } = await supabase.auth.getUser();
  const blob = await compressImage(file);
  if (!userData.user) {
    return {
      id: crypto.randomUUID(),
      name: imageName(file),
      path: "",
      url: await blobToDataUrl(blob),
      createdAt: new Date().toISOString(),
    };
  }
  const id = crypto.randomUUID();
  const path = `${userData.user.id}/${id}.webp`;
  const name = imageName(file);
  const { error } = await supabase.storage.from("account-images").upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  const { data: row, error: rowError } = await supabase
    .from("account_images")
    .insert({ id, user_id: userData.user.id, name, path })
    .select("id, name, path, created_at")
    .single();
  if (rowError) {
    await supabase.storage.from("account-images").remove([path]);
    throw rowError;
  }
  return { id: row.id, name: row.name, path: row.path, url: await signedImageUrl(path), createdAt: row.created_at };
}

export async function listAccountImages(): Promise<AccountImage[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await supabase
    .from("account_images")
    .select("id, name, path, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(data.map(async (row) => ({
    id: row.id,
    name: row.name,
    path: row.path,
    url: await signedImageUrl(row.path),
    createdAt: row.created_at,
  })));
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
