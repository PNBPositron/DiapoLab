import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfileByUsername,
  isSubscribed,
  toggleSubscription,
  profileLabel,
  type Profile,
} from "@/lib/profiles";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";
import { buildBreadcrumbJsonLd, buildPageHead, absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/profile/$username")({
  component: PublicProfile,
  loader: async ({ params }): Promise<Profile | null> => {
    try {
      return await getProfileByUsername(params.username);
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const prof = loaderData as Profile | null | undefined;
    const handle = prof?.username || params.username;
    const displayName = prof?.display_name?.trim() || `@${handle}`;
    const title = `${displayName} (@${handle}) – DiapoLab Creator`;
    const description = `Browse public presentation decks and slide templates published by ${displayName} (@${handle}) on DiapoLab.`;

    return buildPageHead({
      title,
      description,
      path: `/profile/${handle}`,
      ogType: "profile",
      twitterCard: prof?.avatar_url ? "summary" : "summary_large_image",
      image: prof?.avatar_url || undefined,
      imageAlt: `${displayName} avatar`,
      jsonLd: [
        {
          "@type": "ProfilePage",
          name: title,
          url: absoluteUrl(`/profile/${handle}`),
          mainEntity: {
            "@type": "Person",
            name: displayName,
            alternateName: `@${handle}`,
            url: absoluteUrl(`/profile/${handle}`),
            ...(prof?.avatar_url ? { image: prof.avatar_url } : {}),
          },
        },
        buildBreadcrumbJsonLd([
          { name: "DiapoLab", path: "/" },
          { name: "Marketplace", path: "/marketplace" },
          { name: `@${handle}`, path: `/profile/${handle}` },
        ]),
      ],
    });
  },
});

function PublicProfile() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProfileByUsername(username), listPublicTemplates()])
      .then(async ([found, all]) => {
        if (!found) throw new Error("Creator not found");
        setProfile(found);
        setTemplates(all.filter((template) => template.user_id === found.id));
        setSubscribed(await isSubscribed(found.id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load profile"))
      .finally(() => setBusy(false));
  }, [username]);

  const subscribe = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await toggleSubscription(profile.id, subscribed);
      setSubscribed(!subscribed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update subscription");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
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
            <span className="text-xs font-medium text-slate-500">Creator profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="size-3.5" /> Marketplace
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-600">
            {error}
          </div>
        ) : busy && !profile ? (
          <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin text-blue-600" /> Loading profile…
          </div>
        ) : (
          profile && (
            <>
              <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <UserRound className="size-7" />
                    )}
                  </div>
                  <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                      {profileLabel(profile)}
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                      @{profile.username}
                      {profile.pronouns ? ` · ${profile.pronouns}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={subscribe}
                  disabled={busy}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                    subscribed
                      ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {subscribed ? <Check className="size-3.5 text-blue-600" /> : null}
                  {subscribed ? "Subscribed" : "Subscribe"}
                </button>
              </section>

              <h2 className="mt-8 font-display text-sm font-semibold text-slate-900">
                Published templates
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {templates.map((template) => (
                  <Link
                    key={template.id}
                    to="/t/$id"
                    params={{ id: template.id }}
                    search={{ share: undefined }}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/20"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                    <p className="mt-1 text-xs tabular-nums text-slate-500">
                      {template.pages?.length ?? 0} slides
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
