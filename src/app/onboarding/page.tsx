"use client";

import { useRouter } from "next/navigation";

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl animate-fade-up">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">1</div>
          <div className="w-16 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-muted text-sm">2</div>
          <div className="w-16 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-muted text-sm">3</div>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4" style={{ filter: "drop-shadow(0 0 30px rgba(124,58,237,0.5))" }}>
            👻
          </div>
          <h1
            className="text-3xl font-bold tracking-wider glow-text mb-2"
            style={{ fontFamily: "var(--font-family-logo)" }}
          >
            Exorcise AI
          </h1>
          <p className="text-accent-light text-lg font-semibold">
            Selamat datang di Early Access! 🎉
          </p>
          <p className="text-muted text-sm mt-2">
            Kamu salah satu orang pertama yang mendapat akses.
          </p>
        </div>

        {/* Security Warning Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-4">
            ⚠️ PERINGATAN KEAMANAN AKUN
          </h3>
          <p className="text-text/80 text-sm mb-4 leading-relaxed">
            Sebelum mulai, kamu <strong className="text-glow">WAJIB</strong> melakukan 2 hal berikut:
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 bg-input/50 rounded-lg p-3">
              <span className="text-xl">🔑</span>
              <span className="text-sm">Set password akun kamu</span>
            </div>
            <div className="flex items-center gap-3 bg-input/50 rounded-lg p-3">
              <span className="text-xl">🛡️</span>
              <span className="text-sm">Aktifkan Two-Factor Authentication (2FA)</span>
            </div>
          </div>
          <p className="text-muted text-xs leading-relaxed">
            Ini wajib dilakukan sebelum bisa menggunakan Exorcise AI.
            Keamanan akunmu adalah prioritas kami. Platform ini masih dalam tahap Beta —
            data akunmu berharga, jadi pastikan akunmu terlindungi! 🙏
          </p>
        </div>

        <button
          onClick={() => router.push("/onboarding/password")}
          className="w-full btn-accent text-white font-semibold py-4 rounded-lg text-lg"
        >
          Mulai Setup Akun →
        </button>
      </div>
    </div>
  );
}
