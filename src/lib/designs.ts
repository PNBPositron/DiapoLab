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

/* ---------------- Private share links ---------------- */

export type ShareLink = {
  id: string;
  design_id: string;
  token: string;
  created_at: string;
  /** Nom du design lié — null si le design a été supprimé depuis. */
  design_name: string | null;
};

/** Liste les liens de partage privés de l'utilisateur courant (RLS owner). */
export async function listMyShareLinks(): Promise<ShareLink[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await (supabase as any)
    .from("design_shares")
    .select("id, design_id, token, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    design_id: string;
    token: string;
    created_at: string;
  }>;
  // Résolution des noms de designs séparément (le design peut avoir été supprimé).
  const ids = [...new Set(rows.map((r) => r.design_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: designs } = await supabase.from("designs").select("id, name").in("id", ids);
    for (const d of (designs ?? []) as Array<{ id: string; name: string }>) {
      names.set(d.id, d.name);
    }
  }
  return rows.map((r) => ({ ...r, design_name: names.get(r.design_id) ?? null }));
}

/** Révoque un lien de partage privé (RLS owner delete). */
export async function deleteShareLink(id: string): Promise<void> {
  const { error } = await (supabase as any).from("design_shares").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Public templates ---------------- */

export type PublicTemplate = {
  id: string;
  user_id: string;
  name: string;
  canvas_w: number;
  canvas_h: number;
  pages: Page[];
  thumbnail: string | null;
  created_at: string;
  style?: string | null;
  creator?: string | null;
  license?: string | null;
  creator_profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
};

export async function listPublicTemplates(): Promise<PublicTemplate[]> {
  const { data, error } = await supabase
    .from("public_templates")
    .select("id, user_id, name, canvas_w, canvas_h, pages, thumbnail, created_at, author_name")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const rows = (data ?? []) as unknown as PublicTemplate[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  if (!ids.length) return rows;
  const { data: profiles } = await (supabase as any).from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
  const byId = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
  return rows.map((row) => ({ ...row, creator_profile: byId.get(row.user_id) ?? null }));
}

export async function publishAsTemplate(input: {
  name: string;
  canvas_w: number;
  canvas_h: number;
  pages: Page[];
  thumbnail?: string | null;
}): Promise<PublicTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("public_templates")
    .insert({
      user_id: user.id,
      name: input.name,
      canvas_w: input.canvas_w,
      canvas_h: input.canvas_h,
      pages: input.pages as unknown as never,
      thumbnail: input.thumbnail ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PublicTemplate;
}

export async function listMyPublicTemplates(): Promise<PublicTemplate[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("public_templates")
    .select("id, user_id, name, canvas_w, canvas_h, pages, thumbnail, created_at")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PublicTemplate[];
}

export async function renamePublicTemplate(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("public_templates").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deletePublicTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("public_templates").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Template likes ---------------- */

export async function listTemplateLikeCounts(
  templateIds: string[],
): Promise<Record<string, number>> {
  if (templateIds.length === 0) return {};
  const { data, error } = await supabase
    .from("template_likes")
    .select("template_id")
    .in("template_id", templateIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ template_id: string }>) {
    counts[row.template_id] = (counts[row.template_id] ?? 0) + 1;
  }
  return counts;
}

export async function listMyLikedTemplateIds(): Promise<Set<string>> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return new Set();
  const { data, error } = await supabase
    .from("template_likes")
    .select("template_id")
    .eq("user_id", u.user.id);
  if (error) throw error;
  return new Set((data ?? []).map((r: { template_id: string }) => r.template_id));
}

export async function likeTemplate(templateId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to like templates");
  const { error } = await supabase
    .from("template_likes")
    .insert({ template_id: templateId, user_id: u.user.id });
  if (error && !/duplicate key/i.test(error.message)) throw error;
}

export async function unlikeTemplate(templateId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("template_likes")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", u.user.id);
  if (error) throw error;
}
