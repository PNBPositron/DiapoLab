import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Wifi, WifiOff, Check } from "lucide-react";

export const Route = createFileRoute("/v/$key")({
  component: VotePage,
  head: () => ({
    meta: [
      { title: "Live poll — DiapoLab" },
      { name: "description", content: "Vote live on a DiapoLab poll from your phone." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type PollOption = { id: string; text: string };

function VotePage() {
  const { key } = Route.useParams();
  const [question, setQuestion] = useState("Waiting for the poll…");
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const chan = supabase.channel("poll-" + key);
    chanRef.current = chan;
    chan
      .on("broadcast", { event: "state" }, ({ payload }: any) => {
        if (payload?.question) setQuestion(payload.question);
        if (Array.isArray(payload?.options)) setOptions(payload.options);
      })
      .on("broadcast", { event: "tally" }, ({ payload }: any) => {
        if (payload?.votes) setVotes(payload.votes);
      })
      .on("broadcast", { event: "vote" }, ({ payload }: any) => {
        const id = payload?.optionId;
        if (id) setVotes((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
      })
      .on("broadcast", { event: "reset" }, () => {
        setVotes({});
        setPicked(null);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          chan.send({ type: "broadcast", event: "hello", payload: {} });
        }
      });
    return () => {
      supabase.removeChannel(chan);
      chanRef.current = null;
    };
  }, [key]);

  const cast = (optionId: string) => {
    if (picked) return;
    setPicked(optionId);
    setVotes((v) => ({ ...v, [optionId]: (v[optionId] ?? 0) + 1 }));
    chanRef.current?.send({ type: "broadcast", event: "vote", payload: { optionId } });
  };

  const total = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div className="grid min-h-screen place-items-center bg-white p-6 text-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <Radio className="size-3.5" /> Live poll
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            {connected ? (
              <Wifi className="size-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="size-3.5 text-slate-400" />
            )}
            {connected ? "Connected" : "Connecting…"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)]">
          <h1 className="font-display text-xl font-semibold leading-snug tracking-tight text-slate-900">
            {question}
          </h1>

          {options.length === 0 ? (
            <p className="mt-5 text-sm text-slate-500">
              The presenter hasn't opened this poll yet. This page updates automatically.
            </p>
          ) : (
            <div className="mt-5 flex flex-col gap-2.5">
              {options.map((opt, i) => {
                const count = votes[opt.id] ?? 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                const mine = picked === opt.id;
                return (
                  <button
                    key={opt.id}
                    disabled={!!picked}
                    onClick={() => cast(opt.id)}
                    className={`relative overflow-hidden rounded-lg border px-4 py-3 text-left transition disabled:cursor-default ${
                      mine
                        ? "border-blue-500 bg-blue-50/40"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    {picked && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-blue-500/12"
                        style={{
                          width: pct + "%",
                          transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
                        }}
                      />
                    )}
                    <span className="relative flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${
                            mine
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt.text}
                      </span>
                      {picked && (
                        <span className="flex items-center gap-2 text-xs font-semibold tabular-nums text-slate-700">
                          {pct}%
                          {mine && <Check className="size-4 text-blue-600" strokeWidth={2.5} />}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {picked && (
            <p className="mt-4 text-xs text-slate-500">Vote sent — thanks! Results update live.</p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Made with DiapoLab</p>
      </div>
    </div>
  );
}
