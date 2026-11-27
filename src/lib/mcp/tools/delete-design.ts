import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthed } from "./list-designs";

export default defineTool({
  name: "delete_design",
  title: "Delete a design",
  description: "Permanently delete one of the signed-in user's designs.",
  inputSchema: { id: z.string().uuid().describe("Design id to delete.") },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthed;
    const { error } = await supabaseForUser(ctx).from("designs").delete().eq("id", id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Deleted design ${id}` }] };
  },
});
