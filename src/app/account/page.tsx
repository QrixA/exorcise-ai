"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string; email: string; name: string | null; company: string | null;
    role: string | null; hasTotpEnabled: boolean; onboardingDone: boolean;
  } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // 2FA reset state
  const [resetting2fa, setResetting2fa] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [savedCodes, setSavedCodes] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passwordChecks = useMemo(() => ({
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  }), [newPassword]);

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;
    if (score === 0) return { label: "", color: "", width: "0%" };
    if (score === 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
    if (score === 2) return { label: "Fair", color: "bg-orange-500", width: "50%" };
    if (score === 3) return { label: "Strong", color: "bg-yellow-500", width: "75%" };
    return { label: "Very Strong", color: "bg-emerald-500", width: "100%" };
  }, [passwordChecks]);

  const canChangePassword = Object.values(passwordChecks).every(Boolean) &&
    newPassword === confirmPassword && confirmPassword.length > 0 && currentPassword.length > 0;

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) { router.push("/login"); return; }
      const data = await res.json();
      if (!data.user) { router.push("/login"); return; }
      if (data.pending2fa) { router.push("/login/verify"); return; }
      if (!data.user.onboardingDone) { router.push("/onboarding"); return; }
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canChangePassword) return;
    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const res = await fetch("/api/auth/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setPasswordError(data.error);
      } else {
        setPasswordSuccess("Password berhasil diubah!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(""), 5000);
      }
    } catch {
      setPasswordError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function startReset2fa() {
    setResetting2fa(true);
    setVerifyError("");
    setNewBackupCodes([]);
    setSavedCodes(false);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (data.error) {
        setVerifyError(data.error);
      } else {
        setQrCode(data.qrCode);
        setManualKey(data.manualKey);
      }
    } catch {
      setVerifyError("Gagal memuat QR code. Coba lagi.");
    }
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      verifyNewTOTP(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyNewTOTP(code: string) {
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-setup", code }),
      });
      const data = await res.json();
      if (data.error) {
        setVerifyError(data.error);
        setOtpCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setNewBackupCodes(data.backupCodes);
      }
    } catch {
      setVerifyError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  }

  function downloadCodes() {
    const text = `Exorcise AI — Recovery Codes\n${"=".repeat(40)}\n\nSimpan kode ini di tempat yang aman.\nSetiap kode hanya bisa digunakan SATU KALI.\n\n${newBackupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nGenerated: ${new Date().toISOString()}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exorcise-ai-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function finishReset() {
    setResetting2fa(false);
    setQrCode("");
    setManualKey("");
    setOtpCode(["", "", "", "", "", ""]);
    setNewBackupCodes([]);
    setSavedCodes(false);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="text-5xl mb-4" style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>👻</div>
          <p className="text-muted text-sm">Loading...</p>
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <nav className="border-b border-border bg-sidebar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">👻</span>
          <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-family-logo)" }}>
            <span className="text-glow">Exorcise AI</span>
            <span className="text-muted text-xs ml-2">Account</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={() => router.push("/chat")} className="text-muted hover:text-text">
            ← Back to Chat
          </button>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-family-logo)" }}>
          Account Settings
        </h2>

        {/* Account Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span>{user.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Company</span>
              <span>{user.company || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">2FA Status</span>
              <span className={user.hasTotpEnabled ? "text-emerald-400" : "text-amber-400"}>
                {user.hasTotpEnabled ? "✅ Aktif" : "⚠️ Tidak aktif"}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-1">🔑 Ubah Password</h3>
          <p className="text-muted text-xs mb-4">Gunakan password yang kuat dan unik.</p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Password Saat Ini
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Password Baru
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm"
                placeholder="••••••••"
              />

              {/* Strength bar */}
              {newPassword && (
                <div className="mt-2">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  <p className={`text-xs ${passwordStrength.color.replace("bg-", "text-")}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-1.5 mt-3 text-xs">
                {[
                  { ok: passwordChecks.length, label: "Minimal 8 karakter" },
                  { ok: passwordChecks.upper, label: "Mengandung huruf besar" },
                  { ok: passwordChecks.number, label: "Mengandung angka" },
                  { ok: passwordChecks.special, label: "Mengandung karakter spesial (!@#$...)" },
                ].map((c, i) => (
                  <div key={i} className={`flex items-center gap-2 ${c.ok ? "text-emerald-400" : "text-muted"}`}>
                    <span>{c.ok ? "✓" : "○"}</span>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted uppercase tracking-wider mb-2">
                Konfirmasi Password Baru
              </label>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm"
                placeholder="••••••••"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Password tidak cocok</p>
              )}
              {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                <p className="text-emerald-400 text-xs mt-1">✓ Password cocok</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded accent-accent"
              />
              Tampilkan password
            </label>

            {passwordError && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
                ✅ {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={!canChangePassword || passwordLoading}
              className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-40"
            >
              {passwordLoading ? "Mengubah..." : "Ubah Password"}
            </button>
          </form>
        </div>

        {/* 2FA Management */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-1">🛡️ Two-Factor Authentication</h3>
          <p className="text-muted text-xs mb-4">
            Kelola pengaturan 2FA akun kamu.
          </p>

          {!resetting2fa ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-input/50 rounded-lg p-4">
                <div>
                  <p className="text-sm font-medium">Status 2FA</p>
                  <p className={`text-xs ${user.hasTotpEnabled ? "text-emerald-400" : "text-red-400"}`}>
                    {user.hasTotpEnabled ? "Aktif — Authenticator terhubung" : "Tidak aktif"}
                  </p>
                </div>
                <span className="text-2xl">{user.hasTotpEnabled ? "✅" : "❌"}</span>
              </div>

              <button
                onClick={startReset2fa}
                className="w-full border border-border text-text py-3 rounded-lg text-sm hover:bg-input transition"
              >
                🔄 {user.hasTotpEnabled ? "Reset 2FA (Generate new QR)" : "Setup 2FA"}
              </button>
              <p className="text-muted text-[10px] text-center">
                Ini akan membuat QR code baru dan menginvalidasi kode lama.
              </p>
            </div>
          ) : newBackupCodes.length > 0 ? (
            /* New backup codes after reset */
            <div>
              <h4 className="text-emerald-400 font-semibold mb-2">✅ 2FA Berhasil Di-reset!</h4>
              <p className="text-muted text-xs mb-4">
                Simpan recovery codes baru ini. Kode lama sudah tidak berlaku.
              </p>

              <div className="bg-input border border-border rounded-lg p-4 mb-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {newBackupCodes.map((code, i) => (
                    <div key={i} className="text-glow">{i + 1}. {code}</div>
                  ))}
                </div>
              </div>

              <button
                onClick={downloadCodes}
                className="w-full border border-border text-text py-2 rounded-lg text-sm hover:bg-input transition mb-4"
              >
                📥 Download as .txt
              </button>

              <label className="flex items-center gap-3 text-sm mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedCodes}
                  onChange={(e) => setSavedCodes(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span>Aku sudah menyimpan recovery codes ini</span>
              </label>

              <button
                onClick={finishReset}
                disabled={!savedCodes}
                className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-40"
              >
                Selesai
              </button>
            </div>
          ) : (
            /* QR Code + OTP verification */
            <div>
              <button
                onClick={() => { setResetting2fa(false); setVerifyError(""); }}
                className="text-muted text-sm hover:text-text mb-4 flex items-center gap-1"
              >
                ← Batal
              </button>

              {qrCode ? (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="flex flex-col items-center">
                      <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48 rounded-lg border border-border" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">Manual Entry Key</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-input border border-border rounded px-3 py-2 text-xs font-mono text-glow flex-1 break-all">
                            {manualKey}
                          </code>
                          <button
                            onClick={() => { navigator.clipboard.writeText(manualKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }}
                            className="text-muted hover:text-text text-sm px-2 py-1 rounded border border-border"
                          >
                            {keyCopied ? "✓" : "📋"}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-xs text-muted">
                        <p>1. Buka Google Authenticator / Authy</p>
                        <p>2. Hapus entry Exorcise AI lama (jika ada)</p>
                        <p>3. Scan QR code baru ini</p>
                        <p>4. Masukkan kode 6 digit di bawah</p>
                      </div>
                    </div>
                  </div>

                  {/* OTP Input */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-center mb-4">Masukkan kode 6 digit:</p>
                    <div className="flex justify-center gap-3 mb-4">
                      {otpCode.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigit(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          className="w-12 h-14 text-center text-xl font-bold bg-input border border-border rounded-lg"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {verifyError && (
                      <p className="text-red-400 text-sm text-center mb-2">{verifyError}</p>
                    )}
                    {verifying && (
                      <div className="flex justify-center">
                        <svg className="animate-spin h-5 w-5 text-accent" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
