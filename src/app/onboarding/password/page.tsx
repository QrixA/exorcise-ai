"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }), [password]);

  const strength = useMemo(() => {
    const score = Object.values(checks).filter(Boolean).length;
    if (score === 0) return { label: "", color: "", width: "0%" };
    if (score === 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
    if (score === 2) return { label: "Fair", color: "bg-orange-500", width: "50%" };
    if (score === 3) return { label: "Strong", color: "bg-yellow-500", width: "75%" };
    return { label: "Very Strong", color: "bg-emerald-500", width: "100%" };
  }, [checks]);

  const allValid = Object.values(checks).every(Boolean) && password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-password", newPassword: password, token: new URLSearchParams(window.location.search).get("token") || "" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        router.push("/onboarding/2fa");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-accent text-sm font-bold">✓</div>
          <div className="w-16 h-0.5 bg-accent" />
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">2</div>
          <div className="w-16 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-muted text-sm">3</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-family-logo)" }}>
            🔑 Buat Password Akun Kamu
          </h2>
          <p className="text-muted text-sm mb-6">Gunakan password yang kuat dan unik.</p>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm pr-12"
                placeholder="••••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm hover:text-text"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div className="mb-4">
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className={`text-xs ${strength.color.replace("bg-", "text-")}`}>
                  {strength.label}
                </p>
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-1.5 mb-4 text-xs">
              {[
                { ok: checks.length, label: "Minimal 8 karakter" },
                { ok: checks.upper, label: "Mengandung huruf besar" },
                { ok: checks.number, label: "Mengandung angka" },
                { ok: checks.special, label: "Mengandung karakter spesial (!@#$...)" },
              ].map((c, i) => (
                <div key={i} className={`flex items-center gap-2 ${c.ok ? "text-emerald-400" : "text-muted"}`}>
                  <span>{c.ok ? "✓" : "○"}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>

            <label className="block text-xs text-muted uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm mb-1"
              placeholder="••••••••"
            />
            {confirm && password !== confirm && (
              <p className="text-red-400 text-xs mb-4">Password tidak cocok</p>
            )}
            {confirm && password === confirm && confirm.length > 0 && (
              <p className="text-emerald-400 text-xs mb-4">✓ Password cocok</p>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!allValid || loading}
              className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-40 mt-2"
            >
              {loading ? "Setting password..." : "Set Password & Lanjut →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
