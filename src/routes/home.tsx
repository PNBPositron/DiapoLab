import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Braces, Layers3, Sparkles, ImagePlus, Share2, WandSparkles } from "lucide-react";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "DiapoLab — AI-native presentation editor" },
      { name: "description", content: "Create expressive presentations with an editor built for structured JSON and AI workflows." },
    ],
  }),
});

function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight"><img src="/favicon.ico" alt="DiapoLab logo" className="size-8 rounded-lg object-contain" />DiapoLab</Link>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Open editor <ArrowRight className="size-3.5" /></Link>
      </header>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-10 lg:pt-24">
        <div>
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Presentation, reimagined</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">Build slides that think in systems.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">DiapoLab is a visual presentation editor where every slide is editable, shareable, and understandable by an LLM through structured JSON.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start creating <ArrowRight className="size-4" /></Link><Link to="/wiki" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300">Read the wiki</Link></div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.1)]"><div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="mb-8 flex items-center justify-between"><span className="text-xs font-semibold">A living deck</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] text-emerald-300">editable JSON</span></div><div className="space-y-3"><div className="h-3 w-2/3 rounded-full bg-white/90" /><div className="h-2 w-1/2 rounded-full bg-white/25" /><div className="grid grid-cols-3 gap-2 pt-5"><div className="h-24 rounded-lg bg-blue-500" /><div className="h-24 rounded-lg bg-indigo-400" /><div className="h-24 rounded-lg bg-cyan-300" /></div></div></div></div>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-14 lg:px-10">
        <div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Everything in one workspace</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">From first idea to shareable deck.</h2><p className="mt-3 text-base leading-relaxed text-slate-600">DiapoLab combines a familiar visual editor with a structured document model. That means you can design by hand, generate with an LLM, or move between both without rebuilding your work.</p></div>
        <div className="grid gap-4 lg:grid-cols-3"><Feature icon={Layers3} title="Native editing" text="Move, resize, style, crop, filter, mask, and arrange text, shapes, images, charts, quizzes, and more directly on the canvas." /><Feature icon={Braces} title="JSON by design" text="Slides are represented as readable JSON. Give the schema to an LLM, ask for a deck, then paste or import the result into an editable presentation." /><Feature icon={Sparkles} title="A faster starting point" text="Use templates, Unsplash photos, illustrations, reusable components, and AI guidance to explore a direction before polishing every detail." /></div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 lg:grid-cols-3 lg:px-10">
        <InfoBlock icon={ImagePlus} title="Build with real assets" text="Upload images, browse Unsplash, or add illustrations. Keep the visual language consistent with crop, filter, color, and fit controls." />
        <InfoBlock icon={Share2} title="Share when it is ready" text="Publish a presentation, create a private link, or export your deck for a meeting, handoff, or client review." />
        <InfoBlock icon={WandSparkles} title="Give AI a clear contract" text="The wiki includes a complete editor JSON example so an LLM can generate predictable slides instead of a vague mockup." />
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Layers3; title: string; text: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="size-5 text-blue-600" /><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p></article>; }

function InfoBlock({ icon: Icon, title, text }: { icon: typeof Layers3; title: string; text: string }) { return <article className="rounded-2xl bg-slate-950 p-5 text-white"><Icon className="size-5 text-cyan-300" /><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p></article>; }
