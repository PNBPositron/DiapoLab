import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "./list-designs";

export default defineTool({
  name: "get_public_template",
  title: "Get a public template",
  description: "Read a published community DiapoLab template by id, including all slide/page content. No authentication required.",
  inputSchema: { id: z.string().uuid().describe("Template id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const { data, error } = await supabaseAnon()
      .from("public_templates")
      .select("id, name, canvas_w, canvas_h, pages, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Template not found" }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { template: data } };
  },
});
