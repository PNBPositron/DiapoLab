import { createFileRoute } from "@tanstack/react-router";

const LLAMA_PARSE_URL = "https://api.cloud.llamaindex.ai/api/parsing";

export const Route = createFileRoute("/api/llamaparse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LLAMA_PARSE_API_KEY;
        if (!apiKey) return Response.json({ error: "LlamaParse is not configured." }, { status: 503 });

        const incoming = await request.formData().catch(() => null);
        const file = incoming?.get("file");
        if (!(file instanceof File)) return Response.json({ error: "Upload a file." }, { status: 400 });
        if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Files must be smaller than 10 MB." }, { status: 413 });

        const form = new FormData();
        form.append("file", file, file.name);
        form.append("result_type", "markdown");
        form.append("language", "en");

        const upload = await fetch(`${LLAMA_PARSE_URL}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          body: form,
        });
        const uploadPayload = (await upload.json().catch(() => null)) as { id?: string; error?: string } | null;
        if (!upload.ok || !uploadPayload?.id) {
          return Response.json({ error: uploadPayload?.error || "LlamaParse could not accept the file." }, { status: 502 });
        }

        const jobId = uploadPayload.id;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const statusResponse = await fetch(`${LLAMA_PARSE_URL}/job/${jobId}`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          });
          const status = (await statusResponse.json().catch(() => null)) as { status?: string; error?: string } | null;
          if (["ERROR", "FAILED", "CANCELLED"].includes(status?.status ?? "")) {
            return Response.json({ error: status?.error || "LlamaParse failed to process the file." }, { status: 502 });
          }
          if (status?.status === "SUCCESS") {
            const resultResponse = await fetch(`${LLAMA_PARSE_URL}/job/${jobId}/result/markdown`, {
              headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
            });
            const result = (await resultResponse.json().catch(() => null)) as { markdown?: string; error?: string } | null;
            if (!resultResponse.ok || !result?.markdown) return Response.json({ error: result?.error || "LlamaParse returned no markdown." }, { status: 502 });
            return Response.json({ markdown: result.markdown, html: markdownToHtml(result.markdown), filename: file.name });
          }
        }

        return Response.json({ error: "LlamaParse timed out. Try a smaller file." }, { status: 504 });
      },
    },
  },
});

function markdownToHtml(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, "<br />")}</p>`)
    .filter((block) => block !== "<p></p>")
    .join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

type _Route = typeof Route;
void (0 as unknown as _Route);
