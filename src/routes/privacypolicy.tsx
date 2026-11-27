import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  User,
  HardDrive,
  CloudCog,
  Cpu,
  Globe2,
  SlidersHorizontal,
} from "lucide-react";
import { buildBreadcrumbJsonLd, buildPageHead, absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/privacypolicy")({
  component: PrivacyPolicy,
  head: () =>
    buildPageHead({
      title: "Privacy Policy – DiapoLab Data & Account Handling",
      description:
        "Read how DiapoLab handles saved designs, local browser storage, account authentication, AI prompts, and published public templates.",
      path: "/privacypolicy",
      jsonLd: [
        {
          "@type": "WebPage",
          name: "Privacy Policy – DiapoLab",
          url: absoluteUrl("/privacypolicy"),
        },
        buildBreadcrumbJsonLd([
          { name: "DiapoLab", path: "/" },
          { name: "Privacy Policy", path: "/privacypolicy" },
        ]),
      ],
    }),
});

const PP_SECTIONS = [
  { icon: <CloudCog className="size-3.5" />, id: "what-we-store" },
  { icon: <User className="size-3.5" />, id: "account-data" },
  { icon: <HardDrive className="size-3.5" />, id: "device-preferences" },
  { icon: <Cpu className="size-3.5" />, id: "ai-features" },
  { icon: <Globe2 className="size-3.5" />, id: "public-content" },
  { icon: <SlidersHorizontal className="size-3.5" />, id: "your-choices" },
];

function PrivacyPolicy() {
  return (
    <LegalShell
      title="Privacy Policy"
      subtitle="Last updated · October 2026"
      icon={<ShieldCheck className="size-5" />}
      kicker="Documentation"
    >
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
      <Section title="AI features" icon={<Cpu className="size-4" />}>
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
  kicker = "Documentation",
  children,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top navigation */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900"
            >
              <img src="/favicon.ico" alt="DiapoLab" className="size-6 rounded-md object-contain" />
              <span>DiapoLab</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">{title}</span>
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

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
              {icon ?? <ShieldCheck className="size-5" />}
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-600">{kicker}</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {title}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">{children}</div>
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
              className="rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
        {icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
            {icon}
          </span>
        )}
        <h2 className="font-display text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-2 px-5 py-4 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
