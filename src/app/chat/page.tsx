"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Verify session and onboarding status
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.user) {
          router.push("/login");
          return;
        }
        // Check pending 2FA
        if (data.pending2fa) {
          router.push("/login/verify");
          return;
        }
        // Check onboarding
        if (!data.user.onboardingDone) {
          router.push("/onboarding");
          return;
        }
        setAuthorized(true);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="text-5xl mb-4" style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>
            👻
          </div>
          <p className="text-muted text-sm">Loading Exorcise AI...</p>
          <div className="mt-4">
            <svg className="animate-spin h-6 w-6 text-accent mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="w-full h-screen">
      {/* Embed the existing Exorcise AI chatbot HTML */}
      <iframe
        src="/chatbot.html"
        className="w-full h-full border-0"
        title="Exorcise AI Chat"
      />
    </div>
  );
}
