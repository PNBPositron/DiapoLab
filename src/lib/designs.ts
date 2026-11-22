import { supabase } from "@/integrations/supabase/client";
import type { Page } from "@/store/editor";

export type SavedDesign = {
  id: string;
  name: string;
  canvas_w: number;
  canvas_h: number;
  pages: Page[];
  thumbnail: string | null;
  updated_at: string;
};

export async function listDesigns(): Promise<SavedDesign[]> {
  const { data, error } = await supabase
    .from("designs")
    .select("id, name, canvas_w, canvas_h, pages, thumbnail, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedDesign[];
}

export async function saveDesign(input: {
  id?: string | null;
  name: string;
  canvas_w: number;
  canvas_h: number;
  pages: Page[];
  thumbnail?: string | null;
}): Promise<SavedDesign> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");

  const payload = {
    user_id: user.id,
    name: input.name,
    canvas_w: input.canvas_w,
    canvas_h: input.canvas_h,
    pages: input.pages as unknown as never,
    thumbnail: input.thumbnail ?? null,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("designs")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SavedDesign;
  }
  const { data, error } = await supabase
    .from("designs")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as SavedDesign;
}

export async function deleteDesign(id: string) {
  const { error } = await supabase.from("designs").delete().eq("id", id);
  if (error) throw error;
}

export async function createPrivateShare(designId: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to create a private link");
  const token = crypto.randomUUID().replaceAll("-", "");
  const { error } = await (supabase as any).from("design_shares").insert({
    design_id: designId,
    user_id: userData.user.id,
    token,
  });
  if (error) throw error;
  return token;
}
