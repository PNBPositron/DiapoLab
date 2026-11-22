import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfileByUsername, isSubscribed, toggleSubscription, profileLabel, type Profile } from "@/lib/profiles";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";

export const Route = createFileRoute("/profile/$username")({
  component: PublicProfile,
  head: () => ({
    meta: [
      { title: "Creator profile — DiapoLab" },
      { name: "description", content: "Browse published decks and templates by DiapoLab community creators." },
      { property: "og:title", content: "Creator profile — DiapoLab" },
      { property: "og:description", content: "Community creator profile on DiapoLab." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PublicProfile() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProfileByUsername(username), listPublicTemplates()]).then(async ([found, all]) => {
      if (!found) throw new Error("Creator not found");
      setProfile(found);
      setTemplates(all.filter((template) => template.user_id === found.id));
      setSubscribed(await isSubscribed(found.id));
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not load profile")).finally(() => setBusy(false));
  }, [username]);

  const subscribe = async () => {
    if (!profile) return;
    setBusy(true);
    try { await toggleSubscription(profile.id, subscribed); setSubscribed(!subscribed); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update subscription"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
              <img src="/favicon.ico" alt="DiapoLab" className="size-6 rounded-lg object-contain" />
              <span>DiapoLab</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">Creator profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="size-3.5" /> Marketplace
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-600">{error}</div>
        ) : busy && !profile ? (
          <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin text-blue-600" /> Loading profile…
          </div>
        ) : profile && (
          <>
            <section className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-7" />
                  )}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">{profileLabel(profile)}</h1>
                  <p className="mt-0.5 text-sm text-slate-500">
                    @{profile.username}{profile.pronouns ? ` · ${profile.pronouns}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={subscribe}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                  subscribed
                    ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {subscribed ? <Check className="size-3.5 text-blue-600" /> : null}
                {subscribed ? "Subscribed" : "Subscribe"}
              </button>
            </section>

            <h2 className="mt-8 font-display text-sm font-semibold text-slate-900">Published templates</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  to="/t/$id"
                  params={{ id: template.id }}
                  search={{ share: undefined }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/20"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{template.name}</h3>
                  <p className="mt-1 text-xs tabular-nums text-slate-500">{template.pages?.length ?? 0} slides</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
