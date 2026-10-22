import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacypolicy")({
  component: PrivacyPolicy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — DiapoLab" },
      {
        name: "description",
        content:
          "How DiapoLab handles your designs, account data, AI prompts and published templates.",
      },
      { property: "og:title", content: "Privacy Policy — DiapoLab" },
      {
        property: "og:description",
        content: "How DiapoLab handles your designs, account data and AI prompts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.lovable.app/privacypolicy" }],
  }),
});

function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" subtitle="last updated · September 2026">
      <Section title="What we store">
        <p>
          Designs you save, templates and themes you publish, and the likes you give are stored in
          our hosted database and linked to your account id. Unsaved work stays in your browser.
        </p>
      </Section>
      <Section title="Account data">
        <p>
          Authentication is handled by our backend provider. We keep your email address and user id
          so we can attach your designs, templates and themes to you. We never sell this data.
        </p>
      </Section>
      <Section title="Device preferences">
        <p>
          Editor settings — theme, visible panels, motion, AI model and brand kit — are stored
          locally in your browser and never leave your device unless you publish them.
        </p>
      </Section>
      <Section title="AI features">
        <p>
          When you use the deck generator, chat edit, redesign, translate or import, the relevant
          slide content and your prompt are sent to the selected AI model provider to produce a
          response. Prompts are not used to train our own models.
        </p>
      </Section>
      <Section title="Public content">
        <p>
          Anything you publish as a template or theme becomes publicly readable, including its name
          and thumbnail. You can rename or unpublish it at any time from Settings.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can delete individual designs, unpublish templates and themes, or turn off AI features
          entirely in Settings. To request full account deletion, contact us from the email address
          on your account.
        </p>
      </Section>
    </LegalShell>
  );
}

export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white px-5 py-8 text-slate-900 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700">
            &lt; back to editor
          </Link>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-700">DiapoLab / docs</span>
        </div>
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] sm:p-10">
          <p className="mb-3 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">DiapoLab documentation</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 font-mono text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <div className="space-y-5">{children}</div>
        <nav className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6 font-mono text-[11px] text-slate-500">
          <Link to="/privacypolicy" className="underline hover:text-teal">
            privacy
          </Link>
          <Link to="/license" className="underline hover:text-teal">
            license
          </Link>
          <Link to="/marketplace" className="underline hover:text-teal">
            marketplace
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.5)] transition-shadow hover:shadow-[0_22px_60px_-32px_rgba(37,99,235,0.22)] sm:p-7">
      <h2 className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-700">{title}</h2>
      <div className="space-y-2 font-mono text-[12px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
