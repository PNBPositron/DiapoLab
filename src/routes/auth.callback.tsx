import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

function AuthCallback() {
  useEffect(() => {
    const finish = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      const next = new URLSearchParams(window.location.search).get("next");
      if (code) await supabase.auth.exchangeCodeForSession(code);
      window.location.replace(next?.startsWith("/") ? next : "/");
    };
    void finish();
  }, []);

  return <main className="grid min-h-screen place-items-center bg-ink font-mono text-sm text-teal">Completing GitHub sign-in…</main>;
}
