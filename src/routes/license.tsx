import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "./privacypolicy";

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
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/license" }],
  }),
});

function LicensePage() {
  return (
    <LegalShell title="MIT License" subtitle="permissive open source · copyright (c) 2026">
      <section className="brutal-border-2 bg-surface p-4">
        <h2 className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">In short</h2>
        <ul className="space-y-1 font-mono text-[12px] text-teal/70">
          <li>&gt; use it commercially, privately, or in your own product</li>
          <li>&gt; modify, fork and redistribute it freely</li>
          <li>&gt; keep the copyright and license notice in copies</li>
          <li>&gt; no warranty and no liability</li>
        </ul>
      </section>
      <section className="brutal-border-2 bg-surface p-4">
        <h2 className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">Full text</h2>
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-teal/70">{`MIT License

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
      <section className="brutal-border-2 bg-surface p-4">
        <h2 className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">
          Community content
        </h2>
        <p className="font-mono text-[12px] text-teal/70">
          The MIT license covers the editor itself. Templates and themes published to the
          marketplace stay the property of their authors, who grant everyone the right to use and
          remix them inside DiapoLab.
        </p>
      </section>
    </LegalShell>
  );
}
