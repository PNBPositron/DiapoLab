import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./list-designs";

export default defineTool({
  name: "create_design",
  title: "Create a design",
  description:
    "Create a new design (deck) for the signed-in user. Pages is the array of slide objects used by the editor; pass [] for an empty deck.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Design name."),
    canvas_w: z.number().int().min(100).max(8000).default(1920),
    canvas_h: z.number().int().min(100).max(8000).default(1080),
    pages: z.array(z.record(z.string(), z.unknown())).default([]).describe("Slide/page objects."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, canvas_w, canvas_h, pages }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed;
    const { data, error } = await supabaseForUser(ctx)
      .from("designs")
      .insert({
        user_id: ctx.getUserId(),
        name,
        canvas_w: canvas_w ?? 1920,
        canvas_h: canvas_h ?? 1080,
        pages: (pages ?? []) as never,
      })
      .select("id, name, canvas_w, canvas_h, updated_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { design: data },
    };
  },
});
