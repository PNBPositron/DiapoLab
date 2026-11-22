import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  pronouns: string | null;
  avatar_url: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, display_name, username, pronouns, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, display_name, username, pronouns, avatar_url")
    .ilike("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function saveProfile(input: Omit<Profile, "id">) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to edit your profile");
  const username = input.username?.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 32) || null;
  const { data, error } = await (supabase as any)
    .from("profiles")
    .upsert({ id: auth.user.id, ...input, username, updated_at: new Date().toISOString() })
    .select("id, display_name, username, pronouns, avatar_url")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function isSubscribed(creatorId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id === creatorId) return false;
  const { data, error } = await (supabase as any)
    .from("creator_subscriptions")
    .select("creator_id")
    .eq("subscriber_id", auth.user.id)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleSubscription(creatorId: string, subscribed: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to subscribe to creators");
  if (subscribed) {
    const { error } = await (supabase as any)
      .from("creator_subscriptions")
      .delete()
      .eq("subscriber_id", auth.user.id)
      .eq("creator_id", creatorId);
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from("creator_subscriptions")
      .insert({ subscriber_id: auth.user.id, creator_id: creatorId });
    if (error && !/duplicate key/i.test(error.message)) throw error;
  }
}

export function profileLabel(profile: Profile | null, fallback = "Creator") {
  return profile?.display_name?.trim() || (profile?.username ? `@${profile.username}` : fallback);
}
