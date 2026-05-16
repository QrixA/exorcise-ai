"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  total: number;
  preRegistered: number;
  onboarded: number;
  pendingOnboarding: number;
  withPassword: number;
  with2fa: number;
}

interface SyncLog {
  id: string;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setStats(data.stats);
      setSyncLogs(data.syncLogs);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
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

  const statCards = [
    { label: "Total Users", value: stats?.total || 0, icon: "👥", color: "text-accent-light" },
    { label: "Pre-registered", value: stats?.preRegistered || 0, icon: "📋", color: "text-blue-400" },
    { label: "Onboarded", value: stats?.onboarded || 0, icon: "✅", color: "text-emerald-400" },
    { label: "Pending Onboarding", value: stats?.pendingOnboarding || 0, icon: "⏳", color: "text-amber-400" },
    { label: "With Password", value: stats?.withPassword || 0, icon: "🔑", color: "text-cyan-400" },
    { label: "With 2FA", value: stats?.with2fa || 0, icon: "🛡️", color: "text-purple-400" },
  ];

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
          <Link href="/admin/dashboard" className="text-glow">Dashboard</Link>
          <Link href="/admin/users" className="text-muted hover:text-text">Users</Link>
          <Link href="/admin/sync" className="text-muted hover:text-text">Sync</Link>
          <Link href="/admin/settings" className="text-muted hover:text-text">Settings</Link>
          <Link href="/chat" className="text-muted hover:text-text">← Chat</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-family-logo)" }}>
          Dashboard
        </h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
                <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
              </div>
              <p className="text-muted text-xs uppercase tracking-wider">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Sync Logs */}
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-family-logo)" }}>
          Recent Sync Activity
        </h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left p-3">Timestamp</th>
                <th className="text-center p-3">Synced</th>
                <th className="text-center p-3">Created</th>
                <th className="text-center p-3">Updated</th>
                <th className="text-center p-3">Skipped</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted">No sync activity yet</td></tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-input/30">
                    <td className="p-3 text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 text-center">{log.synced}</td>
                    <td className="p-3 text-center text-emerald-400">{log.created}</td>
                    <td className="p-3 text-center text-blue-400">{log.updated}</td>
                    <td className="p-3 text-center text-muted">{log.skipped}</td>
                    <td className="p-3">
                      {log.errors ? (
                        <span className="text-red-400 text-xs">❌ Error</span>
                      ) : (
                        <span className="text-emerald-400 text-xs">✅ Success</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
