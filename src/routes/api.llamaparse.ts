import { createFileRoute } from "@tanstack/react-router";

const LLAMA_PARSE_URL = "https://api.cloud.llamaindex.ai/api/parsing";

export const Route = createFileRoute("/api/llamaparse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.api;
        if (!apiKey) return Response.json({ error: "LlamaParse is not configured." }, { status: 503 });

        const incoming = await request.formData().catch(() => null);
        const file = incoming?.get("file");
        if (!(file instanceof File)) return Response.json({ error: "Upload a file." }, { status: 400 });
        if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Files must be smaller than 10 MB." }, { status: 413 });

        const form = new FormData();
        form.append("file", file, file.name);
        form.append("result_type", "markdown");
        form.append("language", "en");
        form.append("parse_mode", "parse_page_with_layout");

        const upload = await fetch(`${LLAMA_PARSE_URL}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          body: form,
        });
        const uploadText = await upload.text();
        const uploadPayload = parseApiPayload(uploadText) as {
          id?: string;
          job_id?: string;
          error?: string | { message?: string };
          detail?: string;
        } | null;
        const jobId = uploadPayload?.id ?? uploadPayload?.job_id;
        if (!upload.ok || !jobId) {
          const providerError = formatProviderError(uploadPayload?.error);
          return Response.json(
            { error: providerError || uploadPayload?.detail || `LlamaParse upload failed (${upload.status}). Check the document type and API key.` },
            { status: 502 },
          );
        }
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const statusResponse = await fetch(`${LLAMA_PARSE_URL}/job/${jobId}`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          });
          const status = (await statusResponse.json().catch(() => null)) as Record<string, unknown> | null;
          if (["ERROR", "FAILED", "CANCELLED"].includes(String(status?.status ?? "").toUpperCase())) {
            return Response.json({ error: formatProviderError(status?.error) || formatProviderError(status?.detail) || "LlamaParse failed to process the file." }, { status: 502 });
          }
          if (status?.status === "SUCCESS") {
            const resultResponse = await fetch(`${LLAMA_PARSE_URL}/job/${jobId}/result/markdown`, {
              headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json, text/plain" },
            });
            const resultText = await resultResponse.text();
            const result = parseApiPayload(resultText) as { markdown?: string; text?: string; error?: string } | string | null;
            const markdown = typeof result === "string" ? result : result?.markdown ?? result?.text;
            if (!resultResponse.ok || typeof markdown !== "string" || !markdown.trim()) {
              const error = typeof result === "object" && result?.error ? formatProviderError(result.error) : undefined;
              return Response.json({ error: error || "LlamaParse returned no markdown." }, { status: 502 });
            }
            return Response.json({ markdown, html: markdownToHtml(markdown), filename: file.name });
          }
        }

        return Response.json({ error: "LlamaParse timed out. Try a smaller file." }, { status: 504 });
      },
    },
  },
});

function parseApiPayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

function formatProviderError(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const error = value as Record<string, unknown>;
  for (const key of ["message", "detail", "error", "reason"]) {
    const candidate = error[key];
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = formatProviderError(candidate);
      if (nested) return nested;
    }
  }
  return undefined;
}

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
