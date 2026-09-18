import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
