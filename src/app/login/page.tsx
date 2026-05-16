"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password" | "forgot">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [particles, setParticles] = useState<Array<{ x: number; y: number; r: number; dx: number; dy: number; a: number }>>([]);

  // Floating particles
  useEffect(() => {
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      a: Math.random() * 0.4 + 0.1,
    }));
    setParticles(pts);
  }, []);

  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-email", email: email.trim() }),
      });
      const data = await res.json();

      if (!data.allowed) {
        setError(data.message);
      } else if (data.needsPassword) {
        setInfo(data.message);
      } else {
        setStep("password");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email: email.trim(), password }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        router.push(data.redirectTo || "/chat");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forgot-password", email: email.trim() }),
      });
      const data = await res.json();
      setInfo(data.message);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Floating particles background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.r * 2}px`,
              height: `${p.r * 2}px`,
              backgroundColor: `rgba(168, 85, 247, ${p.a})`,
              animation: `float ${6 + Math.random() * 8}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
      `}</style>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>
            👻
          </div>
          <h1
            className="text-3xl font-bold tracking-wider glow-text"
            style={{ fontFamily: "var(--font-family-logo)" }}
          >
            Exorcise AI
          </h1>
          <p className="text-muted text-sm mt-1 italic">
            Summon the answer. Banish the unknown.
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
          {step === "email" && (
            <form onSubmit={handleCheckEmail}>
              <h2 className="text-xl font-semibold mb-1 text-center" style={{ fontFamily: "var(--font-family-logo)" }}>
                Sign In
              </h2>
              <p className="text-muted text-sm text-center mb-6">
                Masuk ke Early Access
              </p>

              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm mb-4"
                autoFocus
                required
              />

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {info && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4 text-glow text-sm">
                  ✉️ {info}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking...
                  </span>
                ) : "Lanjutkan →"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleLogin}>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); }}
                className="text-muted text-sm hover:text-text mb-4 flex items-center gap-1"
              >
                ← Kembali
              </button>

              <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-family-logo)" }}>
                Masukkan Password
              </h2>
              <p className="text-muted text-sm mb-6">{email}</p>

              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm mb-2"
                autoFocus
                required
              />

              <button
                type="button"
                onClick={() => setStep("forgot")}
                className="text-accent-light text-xs hover:text-glow mb-4 block"
              >
                Lupa password?
              </button>

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={handleForgotPassword}>
              <button
                type="button"
                onClick={() => { setStep("password"); setError(""); setInfo(""); }}
                className="text-muted text-sm hover:text-text mb-4 flex items-center gap-1"
              >
                ← Kembali
              </button>

              <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-family-logo)" }}>
                Reset Password
              </h2>
              <p className="text-muted text-sm mb-6">
                Link reset akan dikirim ke email kamu
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm mb-4"
                required
              />

              {info && (
                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4 text-glow text-sm">
                  ✉️ {info}
                </div>
              )}
              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? "Sending..." : "Kirim Link Reset"}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted/50 mt-6">
          © 2025 Exorcise AI — All rights reserved.
        </p>
      </div>
    </div>
  );
}
