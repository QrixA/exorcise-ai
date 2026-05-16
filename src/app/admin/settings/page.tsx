"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Settings {
  totpIssuer: string;
  require2fa: boolean;
  syncInterval: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    totpIssuer: "Exorcise AI",
    require2fa: true,
    syncInterval: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Admin nav */}
      <nav className="border-b border-border bg-sidebar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">👻</span>
          <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-family-logo)" }}>
            <span className="text-glow">Exorcise AI</span>
            <span className="text-muted text-xs ml-2">Admin</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/dashboard" className="text-muted hover:text-text">Dashboard</Link>
          <Link href="/admin/users" className="text-muted hover:text-text">Users</Link>
          <Link href="/admin/sync" className="text-muted hover:text-text">Sync</Link>
          <Link href="/admin/settings" className="text-glow">Settings</Link>
          <Link href="/chat" className="text-muted hover:text-text">← Chat</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-family-logo)" }}>
          ⚙️ Settings
        </h2>

        <form onSubmit={handleSave} className="space-y-6">
          {/* TOTP Issuer */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-1">TOTP Issuer Name</h3>
            <p className="text-muted text-xs mb-4">
              This appears in Google Authenticator / Authy as the account label.
            </p>
            <input
              type="text"
              value={settings.totpIssuer}
              onChange={(e) => setSettings({ ...settings, totpIssuer: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm"
              placeholder="Exorcise AI"
            />
          </div>

          {/* Require 2FA */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Require 2FA for All Users</h3>
                <p className="text-muted text-xs">
                  When enabled, all users must complete 2FA setup during onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, require2fa: !settings.require2fa })}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                  settings.require2fa ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform duration-200 ${
                    settings.require2fa ? "translate-x-7" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sheet Sync Interval */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-1">Sheet Sync Interval</h3>
            <p className="text-muted text-xs mb-4">
              How often the system auto-syncs with Google Sheets (in hours). Set to 0 to disable auto-sync.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={168}
                value={settings.syncInterval}
                onChange={(e) => setSettings({ ...settings, syncInterval: parseInt(e.target.value) || 0 })}
                className="w-24 bg-input border border-border rounded-lg px-4 py-3 text-sm text-center"
              />
              <span className="text-muted text-sm">hours</span>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
              ✅ Settings saved successfully!
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full btn-accent text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : "💾 Save Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
