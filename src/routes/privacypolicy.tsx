import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, BookOpen, User, HardDrive, CloudCog, Sparkles, Globe2, SlidersHorizontal } from "lucide-react";

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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.vercel.app/privacypolicy" }],
  }),
});

const PP_SECTIONS = [
  { icon: <CloudCog className="size-3.5" />, id: "what-we-store" },
  { icon: <User className="size-3.5" />, id: "account-data" },
  { icon: <HardDrive className="size-3.5" />, id: "device-preferences" },
  { icon: <Sparkles className="size-3.5" />, id: "ai-features" },
  { icon: <Globe2 className="size-3.5" />, id: "public-content" },
  { icon: <SlidersHorizontal className="size-3.5" />, id: "your-choices" },
];

function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" subtitle="last updated · October 2026" icon={<ShieldCheck className="size-5" />} kicker="DiapoLab documentation">
      <Section title="What we store" icon={<CloudCog className="size-4" />}>
        <p>
          Designs you save, templates and themes you publish, and the likes you give are stored in
          our hosted database and linked to your account id. Unsaved work stays in your browser.
        </p>
      </Section>
      <Section title="Account data" icon={<User className="size-4" />}>
        <p>
          Authentication is handled by our backend provider. We keep your email address and user id
          so we can attach your designs, templates and themes to you. We never sell this data.
        </p>
      </Section>
      <Section title="Device preferences" icon={<HardDrive className="size-4" />}>
        <p>
          Editor settings — theme, visible panels, motion, AI model and brand kit — are stored
          locally in your browser and never leave your device unless you publish them.
        </p>
      </Section>
      <Section title="AI features" icon={<Sparkles className="size-4" />}>
        <p>
          When you use the deck generator, chat edit, redesign, translate or import, the relevant
          slide content and your prompt are sent to the selected AI model provider to produce a
          response. Prompts are not used to train our own models.
        </p>
      </Section>
      <Section title="Public content" icon={<Globe2 className="size-4" />}>
        <p>
          Anything you publish as a template or theme becomes publicly readable, including its name
          and thumbnail. You can rename or unpublish it at any time from Settings.
        </p>
      </Section>
      <Section title="Your choices" icon={<SlidersHorizontal className="size-4" />}>
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
  icon,
  kicker = "DiapoLab documentation",
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-slate-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 88% -10%, rgba(37,99,235,0.16) 0%, transparent 55%), radial-gradient(circle at 8% 120%, rgba(99,102,241,0.1) 0%, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-12">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="size-3.5" /> back to editor
            </Link>
            <Link
              to="/wiki"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur transition hover:border-blue-300 hover:text-blue-600"
            >
              <BookOpen className="size-3.5" /> wiki
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]">
              {icon ?? <ShieldCheck className="size-5" />}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">{kicker}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-5">{children}</div>
        <nav className="mt-12 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          {[
            { to: "/privacypolicy" as const, label: "Privacy policy" },
            { to: "/license" as const, label: "License" },
            { to: "/wiki" as const, label: "Wiki" },
            { to: "/marketplace" as const, label: "Marketplace" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-blue-300 hover:text-blue-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}

export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/80 hover:shadow-[0_16px_40px_-16px_rgba(37,99,235,0.18)]">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
            {icon}
          </span>
        )}
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-800">{title}</h2>
      </div>
      <div className="space-y-2 px-5 py-4 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
