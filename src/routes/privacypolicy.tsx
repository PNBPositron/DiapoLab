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
    links: [{ rel: "canonical", href: "https://positronstudio.lovable.app/privacypolicy" }],
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
    <div className="min-h-screen bg-ink px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="font-mono text-[11px] text-teal/60 underline hover:text-teal">
          &lt; back to editor
        </Link>
        <h1 className="mt-4 font-display text-2xl tracking-[0.2em] text-teal">
          ▸ {title.toUpperCase()}
        </h1>
        <p className="mb-8 font-mono text-[11px] text-teal/50">{subtitle}</p>
        <div className="space-y-6">{children}</div>
        <nav className="mt-12 flex gap-4 border-t border-teal/20 pt-6 font-mono text-[11px] text-teal/60">
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
    <section className="brutal-border-2 bg-surface p-4">
      <h2 className="mb-2 font-display text-[12px] tracking-[0.2em] text-teal">{title}</h2>
      <div className="space-y-2 font-mono text-[12px] leading-relaxed text-teal/70">{children}</div>
    </section>
  );
}
