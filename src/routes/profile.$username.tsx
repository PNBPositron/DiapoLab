import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getProfileByUsername, isSubscribed, toggleSubscription, profileLabel, type Profile } from "@/lib/profiles";
import { listPublicTemplates, type PublicTemplate } from "@/lib/designs";

export const Route = createFileRoute("/profile/$username")({ component: PublicProfile });

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

  return <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900"><div className="mx-auto max-w-4xl">
    <Link to="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600"><ArrowLeft className="size-3.5" /> Marketplace</Link>
    {error ? <div className="mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">{error}</div> : busy && !profile ? <div className="mt-12 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading profile…</div> : profile && <>
      <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-100 text-blue-600">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <UserRound className="size-7" />}</div><div><h1 className="text-2xl font-semibold">{profileLabel(profile)}</h1><p className="text-sm text-slate-500">@{profile.username}{profile.pronouns ? ` · ${profile.pronouns}` : ""}</p></div></div>
        <button onClick={subscribe} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">{subscribed ? <Check className="size-3.5" /> : null}{subscribed ? "Subscribed" : "Subscribe"}</button>
      </section>
      <h2 className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Published templates</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{templates.map((template) => <Link key={template.id} to="/t/$id" params={{ id: template.id }} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300"><h3 className="font-semibold">{template.name}</h3><p className="mt-1 text-xs text-slate-500">{template.pages?.length ?? 0} slides</p></Link>)}</div>
    </>}</div></main>;
}
