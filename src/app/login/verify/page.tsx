"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VerifyTOTPPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit on 6 digits
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      submitTOTP(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function submitTOTP(totpCode: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-login", code: totpCode }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        router.push(data.redirectTo || "/chat");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-backup", code: backupCode.trim() }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else router.push(data.redirectTo || "/chat");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3" style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>🛡️</div>
          <h1 className="text-2xl font-bold glow-text" style={{ fontFamily: "var(--font-family-logo)" }}>
            Two-Factor Authentication
          </h1>
          <p className="text-muted text-sm mt-2">
            Masukkan kode 6 digit dari Authenticator App kamu
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          {!useBackup ? (
            <>
              <div className="flex justify-center gap-3 mb-6">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-input border border-border rounded-lg focus:border-accent"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {loading && (
                <div className="flex justify-center mb-4">
                  <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              <button
                onClick={() => { setUseBackup(true); setError(""); }}
                className="w-full text-center text-sm text-muted hover:text-accent-light mt-2"
              >
                Gunakan recovery code
              </button>
            </>
          ) : (
            <form onSubmit={handleBackupCode}>
              <button
                type="button"
                onClick={() => { setUseBackup(false); setError(""); }}
                className="text-muted text-sm hover:text-text mb-4 flex items-center gap-1"
              >
                ← Kembali ke TOTP
              </button>

              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Recovery Code
              </label>
              <input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                placeholder="XXXX-XXXX"
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm font-mono mb-4"
                autoFocus
              />

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
                {loading ? "Verifying..." : "Verifikasi Recovery Code"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
