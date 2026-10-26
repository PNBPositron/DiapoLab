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
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_20%_-10%,rgba(34,211,238,0.16),transparent),radial-gradient(50rem_36rem_at_90%_110%,rgba(168,85,247,0.14),transparent)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
            <Radio className="size-3.5 animate-pulse" /> Live poll
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {connected ? <Wifi className="size-3.5 text-emerald-400" /> : <WifiOff className="size-3.5" />}
            {connected ? "Connected" : "Connecting…"}
          </span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <h1 className="text-xl font-black leading-snug tracking-tight">{question}</h1>

          {options.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">
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
                    className="relative overflow-hidden rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] disabled:cursor-default"
                    style={{
                      borderColor: mine ? "#22d3ee" : "rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.05)",
                      cursor: picked ? "default" : "pointer",
                    }}
                  >
                    {picked && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-cyan-400/20"
                        style={{ width: pct + "%", transition: "width 420ms cubic-bezier(0.16,1,0.3,1)" }}
                      />
                    )}
                    <span className="relative flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3 text-sm font-semibold">
                        <span className="grid size-6 place-items-center rounded-md bg-cyan-400 text-[11px] font-black text-slate-950">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt.text}
                      </span>
                      {picked && (
                        <span className="flex items-center gap-2 text-xs tabular-nums text-white/70">
                          {pct}%
                          {mine && <Check className="size-4 text-cyan-300" strokeWidth={3} />}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {picked && (
            <p className="mt-4 text-xs text-white/50">Vote sent — thanks! Results update live.</p>
          )}
        </div>
        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
          Made with DiapoLab
        </p>
      </div>
    </div>
  );
}
