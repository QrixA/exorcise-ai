"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Setup2FAPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedCodes, setSavedCodes] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setupTOTP();
  }, []);

  async function setupTOTP() {
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setQrCode(data.qrCode);
        setManualKey(data.manualKey);
      }
    } catch {
      setError("Gagal memuat QR code. Refresh halaman.");
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      verifyCode(newCode.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyCode(totpCode: string) {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-setup", code: totpCode }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setBackupCodes(data.backupCodes);
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setVerifying(false);
    }
  }

  function downloadCodes() {
    const text = `Exorcise AI — Recovery Codes\n${"=".repeat(40)}\n\nSimpan kode ini di tempat yang aman.\nSetiap kode hanya bisa digunakan SATU KALI.\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nGenerated: ${new Date().toISOString()}\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exorcise-ai-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFinish() {
    setShowSuccess(true);
    setTimeout(() => router.push("/chat"), 2000);
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-up">
          <div className="text-7xl mb-6" style={{ filter: "drop-shadow(0 0 40px rgba(124,58,237,0.6))" }}>
            ✅
          </div>
          <h1 className="text-3xl font-bold text-glow mb-2" style={{ fontFamily: "var(--font-family-logo)" }}>
            Akun Siap!
          </h1>
          <p className="text-muted">Mengalihkan ke Exorcise AI...</p>
          {/* Purple particles burst animation */}
          <div className="mt-8 flex justify-center gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent"
                style={{
                  animation: `burst 0.8s ease-out forwards`,
                  animationDelay: `${i * 0.05}s`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
          <style jsx>{`
            @keyframes burst {
              0% { transform: translateY(0) scale(1); opacity: 1; }
              100% { transform: translateY(-${30 + Math.random() * 40}px) translateX(${(Math.random() - 0.5) * 80}px) scale(0); opacity: 0; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-up">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-accent text-sm font-bold">✓</div>
          <div className="w-16 h-0.5 bg-accent" />
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-accent text-sm font-bold">✓</div>
          <div className="w-16 h-0.5 bg-accent" />
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">3</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          {backupCodes.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-family-logo)" }}>
                🛡️ Aktifkan Two-Factor Authentication
              </h2>
              <p className="text-muted text-sm mb-6">
                Scan QR code ini dengan Google Authenticator atau Authy.
              </p>

              {loading ? (
                <div className="flex justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    {qrCode && (
                      <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48 rounded-lg border border-border" />
                    )}
                  </div>

                  {/* Instructions */}
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
                      <p>1. Buka Google Authenticator / Authy di HP kamu</p>
                      <p>2. Tap &quot;+&quot; → &quot;Scan QR code&quot;</p>
                      <p>3. Scan QR di samping</p>
                      <p>4. Masukkan 6-digit kode yang muncul di bawah</p>
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Input */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-center mb-4">Masukkan kode 6 digit:</p>
                <div className="flex justify-center gap-3 mb-4">
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
                      className="w-12 h-14 text-center text-xl font-bold bg-input border border-border rounded-lg"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center mb-2">{error}</p>
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
            /* Backup Codes Screen */
            <>
              <h2 className="text-xl font-semibold mb-1 text-emerald-400" style={{ fontFamily: "var(--font-family-logo)" }}>
                ✅ 2FA Berhasil Diaktifkan!
              </h2>
              <p className="text-muted text-sm mb-6">
                Simpan recovery codes ini di tempat yang aman. Setiap kode hanya bisa digunakan <strong className="text-text">SATU KALI</strong>.
              </p>

              <div className="bg-input border border-border rounded-lg p-4 mb-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
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

              <label className="flex items-center gap-3 text-sm mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedCodes}
                  onChange={(e) => setSavedCodes(e.target.checked)}
                  className="w-4 h-4 rounded accent-accent"
                />
                <span>Aku sudah menyimpan recovery codes ini</span>
              </label>

              <button
                onClick={handleFinish}
                disabled={!savedCodes}
                className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-40"
              >
                Verifikasi & Selesai 🎉
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
