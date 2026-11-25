import { useEffect, useState } from "react";
import { Loader2, Upload, UserRound, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getProfile, saveProfile, type Profile } from "@/lib/profiles";

/** Standalone profile editor — lives outside the Settings dialog and is
 *  opened from the account menu in the toolbar. */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    getProfile(user.id)
      .then((value) => setProfile(value ?? { id: user.id, display_name: user.user_metadata?.full_name ?? "", username: "", pronouns: "", avatar_url: "" }))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"));
  }, [user]);

  const update = (key: keyof Omit<Profile, "id">, value: string) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!profile) return;
    setBusy(true); setSaved(false);
    try { setProfile(await saveProfile(profile)); setSaved(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to save profile"); }
    finally { setBusy(false); }
  };

  if (!user) return null;

  const inputCls = "mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-3 sm:p-6" onClick={onClose}>
      <div className="relative my-3 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:my-6" onClick={(event) => event.stopPropagation()}>
        <header className="relative border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 pr-12">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
              <UserRound className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold tracking-tight text-slate-900">Your profile</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">Choose how your published work appears to the community.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close profile" className="absolute right-4 top-4 grid size-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <X className="size-4" />
          </button>
        </header>

        <div className="bg-white p-4 sm:p-6">
          {!profile ? (
            <div className="flex items-center gap-2 py-6 text-xs text-slate-500">
              <Loader2 className="size-3.5 animate-spin text-blue-600" /> Loading profile…
            </div>
          ) : (
            <>
              {profile.avatar_url && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <img src={profile.avatar_url} alt="" className="size-12 shrink-0 rounded-full border border-slate-200 bg-white object-cover" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{profile.display_name || user.email}</div>
                    <div className="truncate text-xs text-slate-500">{profile.pronouns}{profile.username ? " · @" + profile.username : ""}</div>
                  </div>
                </div>
              )}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Display name<input value={profile.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} className={inputCls} placeholder="Your name" /></label>
                <label className="text-xs font-semibold text-slate-700">Username<input value={profile.username ?? ""} onChange={(e) => update("username", e.target.value)} className={inputCls} placeholder="your_username" /></label>
                <label className="text-xs font-semibold text-slate-700">Pronouns<input value={profile.pronouns ?? ""} onChange={(e) => update("pronouns", e.target.value)} className={inputCls} placeholder="they/them" /></label>
                <label className="text-xs font-semibold text-slate-700">Profile photo URL<input value={profile.avatar_url ?? ""} onChange={(e) => update("avatar_url", e.target.value)} className={inputCls} placeholder="https://…" /></label>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Save profile
                </button>
                {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
              </div>
              {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
