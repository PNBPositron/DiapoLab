import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./list-designs";

export default defineTool({
  name: "get_design",
  title: "Get a design",
  description: "Fetch one of the signed-in user's designs, including all slide/page content.",
  inputSchema: { id: z.string().uuid().describe("Design id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed;
    const { data, error } = await supabaseForUser(ctx)
      .from("designs")
      .select("id, name, canvas_w, canvas_h, pages, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Design not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { design: data },
    };
  },
});
