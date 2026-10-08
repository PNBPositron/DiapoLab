import { supabase } from "@/integrations/supabase/client";

export type ThemeTokens = {
  ink: string;
  paper: string;
  surface: string;
  surface2: string;
  grid: string;
  teal: string;
  tealDeep: string;
  blue: string;
  blueDeep: string;
};

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  ink: "#1b1f2b",
  paper: "#252a38",
  surface: "#2f3547",
  surface2: "#3a4157",
  grid: "#4b5470",
  teal: "#eef3ff",
  tealDeep: "#b9c4dd",
  blue: "#7aa2ff",
  blueDeep: "#3f5bd1",
};

export const THEME_TOKEN_FIELDS: Array<{ key: keyof ThemeTokens; label: string }> = [
  { key: "ink", label: "chrome / ink" },
  { key: "paper", label: "canvas bg" },
  { key: "surface", label: "surface" },
  { key: "surface2", label: "surface 2" },
  { key: "grid", label: "grid" },
  { key: "teal", label: "text" },
  { key: "tealDeep", label: "text muted" },
  { key: "blue", label: "accent" },
  { key: "blueDeep", label: "accent deep" },
];

export type PublicTheme = {
  id: string;
  user_id: string;
  name: string;
  tokens: ThemeTokens;
  created_at: string;
};

export const CUSTOM_THEME_PREFIX = "custom:";

export function themeCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--ink": tokens.ink,
    "--paper": tokens.paper,
    "--surface": tokens.surface,
    "--surface-2": tokens.surface2,
    "--grid": tokens.grid,
    "--teal": tokens.teal,
    "--teal-deep": tokens.tealDeep,
    "--blue": tokens.blue,
    "--blue-deep": tokens.blueDeep,
  };
}

export function normalizeTokens(raw: unknown): ThemeTokens {
  const t = (raw ?? {}) as Partial<ThemeTokens>;
  return { ...DEFAULT_THEME_TOKENS, ...t };
}

export async function listPublicThemes(): Promise<PublicTheme[]> {
  const { data, error } = await supabase
    .from("public_themes")
    .select("id, user_id, name, tokens, created_at")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw error;
  return ((data ?? []) as unknown as PublicTheme[]).map((t) => ({
    ...t,
    tokens: normalizeTokens(t.tokens),
  }));
}

export async function listMyPublicThemes(): Promise<PublicTheme[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("public_themes")
    .select("id, user_id, name, tokens, created_at")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as PublicTheme[]).map((t) => ({
    ...t,
    tokens: normalizeTokens(t.tokens),
  }));
}

export async function publishTheme(name: string, tokens: ThemeTokens): Promise<PublicTheme> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to publish a theme");
  const { data, error } = await supabase
    .from("public_themes")
    .insert({ user_id: u.user.id, name, tokens: tokens as unknown as never })
    .select("id, user_id, name, tokens, created_at")
    .single();
  if (error) throw error;
  return {
    ...(data as unknown as PublicTheme),
    tokens: normalizeTokens((data as never as PublicTheme).tokens),
  };
}

export async function deletePublicTheme(id: string): Promise<void> {
  const { error } = await supabase.from("public_themes").delete().eq("id", id);
  if (error) throw error;
}
