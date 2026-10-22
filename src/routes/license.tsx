import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalShell } from "./privacypolicy";
import { Scale, BadgeCheck, FileText, Users, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/license")({
  component: LicensePage,
  head: () => ({
    meta: [
      { title: "MIT License — DiapoLab" },
      {
        name: "description",
        content:
          "DiapoLab is open source under the MIT License. Read the permissions, conditions and limitations.",
      },
      { property: "og:title", content: "MIT License — DiapoLab" },
      {
        property: "og:description",
        content: "DiapoLab is open source under the MIT License.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/license" }],
  }),
});

const PERMISSIONS = [
  {
    icon: <BadgeCheck className="size-4" />,
    title: "Use commercially",
    desc: "Personal, commercial or inside your own product — no permission needed.",
  },
  {
    icon: <Scale className="size-4" />,
    title: "Modify & remix",
    desc: "Fork it, change it, build on it — the code is yours to adapt.",
  },
  {
    icon: <ArrowRight className="size-4" />,
    title: "Redistribute",
    desc: "Share copies freely, as long as the license notice travels along.",
  },
];

function LicensePage() {
  return (
    <LegalShell
      title="MIT License"
      subtitle="permissive open source · copyright (c) 2026"
      icon={<Scale className="size-5" />}
      kicker="DiapoLab documentation"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:border-blue-200/80 hover:shadow-[0_16px_40px_-16px_rgba(37,99,235,0.18)]">
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          DiapoLab is free software for creating, remixing, exporting and sharing
          presentations. You can use the editor in personal and commercial projects
          without asking permission.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PERMISSIONS.map((p) => (
            <div
              key={p.title}
              className="group rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/50"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors">
                {p.icon}
              </span>
              <div className="mt-2.5 text-xs font-semibold text-slate-800">{p.title}</div>
              <div className="mt-1 text-[11px] leading-snug text-slate-400">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Check className="size-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-800">In short</h2>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          <li>✓ use it commercially, privately, or in your own product</li>
          <li>✓ modify, fork and redistribute it freely</li>
          <li>✓ keep the copyright and license notice in copies</li>
          <li>✓ no warranty and no liability</li>
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
            <FileText className="size-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-800">Full text</h2>
        </div>
        <pre className="whitespace-pre-wrap bg-slate-950 px-5 py-4 font-mono text-[11px] leading-relaxed text-slate-200">{`MIT License

Copyright (c) 2026 DiapoLab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}</pre>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Users className="size-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-800">
            Community content
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The MIT license covers the editor itself. Templates and themes published to
          the <Link to="/marketplace" className="font-medium text-blue-600 underline">marketplace</Link>{" "}
          stay the property of their authors, who grant everyone the right to use and
          remix them inside DiapoLab.
        </p>
      </section>
    </LegalShell>
  );
}
