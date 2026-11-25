import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Terminal } from "lucide-react";

export const Route = createFileRoute("/mcp-guide")({
  component: McpGuide,
  head: () => ({
    meta: [
      { title: "DiapoLab MCP" },
      { name: "description", content: "Connect an MCP client to manage DiapoLab presentations." },
    ],
  }),
});

function McpGuide() {
  const [mcpUrl, setMcpUrl] = useState("https://your-diapolab-domain/mcp");

  useEffect(() => {
    setMcpUrl(`${window.location.origin}/mcp`);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
              <img src="/favicon.ico" alt="DiapoLab" className="size-6 rounded-md object-contain" />
              <span>DiapoLab</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">MCP guide</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/wiki"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900 hover:underline hover:underline-offset-4"
            >
              <BookOpen className="size-3.5" /> Wiki
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="size-3.5" /> Back to editor
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
              <Terminal className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-600">DiapoLab MCP</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Connect an MCP client to your presentations
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
            Add DiapoLab as a remote MCP server. Your client can then list templates and designs, read presentation data, and create or delete designs when you approve those actions.
          </p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-950 p-5 text-sm text-slate-100">
            <p className="mb-2 font-mono text-xs text-slate-400">MCP server URL</p>
            <code className="break-all font-mono text-xs text-blue-300 sm:text-sm">
              {mcpUrl}
            </code>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Open your MCP client settings", "Add the URL above as a remote server", "Approve access and ask for a slide task"].map((step, index) => (
              <li key={step} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <span className="font-mono text-xs font-semibold tabular-nums text-blue-600">0{index + 1}</span>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800">{step}</p>
              </li>
            ))}
          </ol>

          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            Keep your MCP client signed in to the same DiapoLab account. Never paste private access tokens into prompts. If your client does not support remote MCP yet, use the server URL above with its OAuth-enabled connector.
          </p>
        </div>
      </main>
    </div>
  );
}
