import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./list-designs";

export default defineTool({
  name: "list_public_templates",
  title: "List community templates",
  description: "Browse community-published DiapoLab templates, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(20) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed;
    const { data, error } = await supabaseForUser(ctx)
      .from("public_templates")
      .select("id, name, canvas_w, canvas_h, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { templates: data ?? [] } };
  },
});
