"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { getGuestProfile, getGuestLogs, clearGuestData } from "../lib/guestStore";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // If there's guest data sitting in this browser, this is someone who
        // just confirmed a magic link after using the app as a guest — migrate it.
        const guestProfile = getGuestProfile();
        const guestLogs = getGuestLogs();

        if (guestProfile || guestLogs.length > 0) {
          const pendingNewsletter = localStorage.getItem("atm_pending_newsletter_optin") === "1";

          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from("profiles").insert({
              id: session.user.id,
              ...(guestProfile || {}),
              newsletter_optin: pendingNewsletter,
            });
          }

          if (guestLogs.length > 0) {
            const rows = guestLogs.map(({ id, ...rest }) => ({ ...rest, user_id: session.user.id }));
            await supabase.from("logs").insert(rows);
          }

          clearGuestData();
          localStorage.removeItem("atm_pending_newsletter_optin");
        }

        router.replace("/dashboard");
        return;
      }

      // No account — guest mode. If they've already done onboarding locally, skip straight to the dashboard.
      if (getGuestProfile()) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
      setChecking(false);
    };
    run();
  }, [router]);

  if (checking) return null;
  return null;
}
