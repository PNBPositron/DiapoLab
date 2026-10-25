import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, Braces, Layers3, Sparkles, ImagePlus, Share2, WandSparkles, Search, History, Download, Github, Play } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "DiapoLab — The visual workspace for expressive decks" },
      { name: "description", content: "Design, search, version, and publish expressive presentations with DiapoLab." },
    ],
  }),
});

const workflows = ["Startup pitch", "Product launch", "Workshop", "Portfolio", "Quarterly review", "Research story"];

function HomePage() {
  return <Navigate to="/" />;

  /* Legacy route retained only so the generated route tree stays valid. */
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="logo-wordmark flex items-center gap-2 text-sm font-semibold tracking-tight"><img src="/favicon.ico" alt="DiapoLab logo" className="size-8 rounded-lg object-contain" />DiapoLab</Link>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-slate-500 md:flex"><Link to="/marketplace" className="hover:text-slate-950">Marketplace</Link><Link to="/wiki" className="hover:text-slate-950">Wiki</Link></nav>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Open editor <ArrowRight className="size-3.5" /></Link>
      </header>
      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-10 lg:pt-20">
        <div className="pointer-events-none absolute -left-24 top-8 size-72 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="relative">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-blue-600">A canvas for clear thinking</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-0.06em] text-slate-950 sm:text-7xl">Make the idea visible.</h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600">DiapoLab turns rough thoughts into expressive decks you can edit, search, version, export, and share without losing the structure underneath.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start creating <ArrowRight className="size-4" /></Link><Link to="/marketplace" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"><Play className="size-4" /> Explore templates</Link></div>
          <div className="mt-10 flex flex-wrap gap-5 text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><History className="size-4 text-blue-600" />Version history</span><span className="flex items-center gap-2"><Layers3 className="size-4 text-blue-600" />Build your deck</span><span className="flex items-center gap-2"><Download className="size-4 text-blue-600" />Export anywhere</span></div>
        </div>
        <div className="relative rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"><div className="rounded-[1.45rem] bg-slate-950 p-5 text-white"><div className="mb-8 flex items-center justify-between"><span className="text-xs font-semibold">A living deck</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] text-emerald-300">saved 12s ago</span></div><div className="grid grid-cols-[1.2fr_.8fr] gap-3"><div className="rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-300 p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Slide 04</p><p className="mt-12 text-2xl font-semibold leading-tight">Ideas deserve a shape.</p></div><div className="flex flex-col gap-3"><div className="rounded-xl border border-white/10 bg-white/10 p-3"><div className="flex items-center gap-2 text-[10px] text-white/60"><Layers3 className="size-3" /> Slide canvas</div><div className="mt-3 h-2 rounded-full bg-white/70" /><div className="mt-2 h-2 w-2/3 rounded-full bg-white/25" /></div><div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex items-center gap-2 text-[10px] text-white/60"><History className="size-3" /> 8 versions</div><div className="mt-3 flex gap-1"><span className="h-8 flex-1 rounded bg-blue-400" /><span className="h-8 flex-1 rounded bg-indigo-400" /><span className="h-8 flex-1 rounded bg-cyan-300" /></div></div></div></div></div></div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10"><div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">One editor, many workflows</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">From first sketch to final share.</h2><p className="mt-3 text-base leading-relaxed text-slate-600">Every tool is designed to keep the creative surface fast while making the system underneath useful to people and machines.</p></div><div className="grid gap-4 lg:grid-cols-3"><Feature icon={Layers3} title="Compose visually" text="Build pitch decks, launches, lessons, reports, portfolios, carousels, and interactive stories from a responsive canvas." /><Feature icon={History} title="Move with confidence" text="Capture slide versions as you work, compare changes, and restore a previous direction without losing the current draft." /><Feature icon={Braces} title="Keep it structured" text="Every page and element has an explicit JSON shape for imports, automations, and LLM workflows." /></div></section>
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10"><div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-9"><div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Start with momentum</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Pick a story. Make it yours.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">Templates are a starting point, not a ceiling. Open one, remix the system, then publish your own plugin or deck.</p><Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-50">Browse the marketplace <ArrowRight className="size-3.5" /></Link></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{workflows.map((idea, i) => <div key={idea} className="rounded-xl border border-white/10 bg-white/[.06] px-4 py-4"><span className="font-mono text-[10px] text-cyan-300">0{i + 1}</span><p className="mt-6 text-sm font-semibold">{idea}</p><p className="mt-1 text-[11px] text-slate-400">A flexible starting point</p></div>)}</div></div></div></section>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 pb-8 text-xs text-slate-400 lg:px-10"><span>DiapoLab — expressive presentations, structured underneath.</span><span className="flex items-center gap-4"><Link to="/wiki" className="hover:text-slate-700">Documentation</Link><Github className="size-4" /></span></footer>
    </main>
  );
}
function Feature({ icon: Icon, title, text }: { icon: typeof Layers3; title: string; text: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="size-5 text-blue-600" /><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p></article>; }
