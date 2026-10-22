import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/mcp")({
  component: McpGuide,
  head: () => ({
    meta: [
      { title: "DiapoLab MCP" },
      { name: "description", content: "Connect an MCP client to manage DiapoLab presentations." },
    ],
  }),
});

function McpGuide() {
  return (
    <main className="min-h-screen bg-white px-5 py-12 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)] sm:p-10">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">DiapoLab MCP</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Use Claude or another MCP client with your presentations.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">Add DiapoLab as a remote MCP server. Your client can then list templates and designs, read presentation data, and create or delete designs when you approve those actions.</p>
        <div className="mt-8 rounded-2xl bg-slate-950 p-5 text-sm text-slate-100 shadow-xl">
          <p className="mb-3 font-mono text-xs text-slate-400">MCP server URL</p>
          <code className="break-all font-mono text-blue-300">{typeof window === "undefined" ? "https://your-diapolab-domain/.mcp" : `${window.location.origin}/.mcp`}</code>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {["Open your MCP client settings", "Add the URL as a remote server", "Approve access and ask for a slide task"].map((step, index) => (
            <li key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-mono text-xs font-bold text-blue-600">0{index + 1}</span>
              <p className="mt-2 text-sm font-semibold text-slate-800">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs leading-6 text-slate-500">Keep your MCP client signed in to the same DiapoLab account. Never paste private access tokens into prompts. If your client does not support remote MCP yet, use the server URL above with its OAuth-enabled connector.</p>
      </div>
    </main>
  );
}
