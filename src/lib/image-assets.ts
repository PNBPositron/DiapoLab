import { supabase } from "@/integrations/supabase/client";

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

async function signedImageUrl(path: string) {
  const { data, error } = await supabase.storage.from("account-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create image URL");
  return data.signedUrl;
}

export async function uploadAccountImage(file: File): Promise<AccountImage> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to save images to your account");
  const id = crypto.randomUUID();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userData.user.id}/${id}.${extension}`;
  const name = imageName(file);
  const { error } = await supabase.storage.from("account-images").upload(path, file, {
    contentType: file.type,
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
