import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Server bundle: values are injected by Vite's `define` (see vite.config.ts),
// so read import.meta.env first, process.env only as a dev fallback.
const serverEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};

export function serverEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = serverEnv[key];
    if (value) return value;
  }
  return undefined;
}

export function requireSupabaseEnv() {
  const url = serverEnvValue("SUPABASE_URL", "VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = serverEnvValue(
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  if (!url || !key) {
    throw new Error("Supabase URL / publishable key are not configured for the MCP server (set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY).");
  }
  return { url, key };
}

/** Supabase client impersonating the MCP caller (bearer token from OAuth). */
export function supabaseForUser(ctx: ToolContext) {
  const { url, key } = requireSupabaseEnv();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Supabase client for public reads (no user token). */
export function supabaseAnon() {
  const { url, key } = requireSupabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const notAuthed = {
  content: [{ type: "text" as const, text: "Not authenticated" }],
  isError: true,
};

export default defineTool({
  name: "list_designs",
  title: "List my designs",
  description: "List the signed-in user's saved DiapoLab designs (decks), newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20).describe("Max designs to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed;
    const { data, error } = await supabaseForUser(ctx)
      .from("designs")
      .select("id, name, canvas_w, canvas_h, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { designs: data ?? [] },
    };
  },
});
