"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SyncLog {
  id: string;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string | null;
  createdAt: string;
}

export default function AdminSyncPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setLogs(data.syncLogs);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/trigger-sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setResult(`❌ Error: ${data.error}`);
      } else {
        setResult(`✅ Synced ${data.synced} users (Created: ${data.created}, Updated: ${data.updated}, Skipped: ${data.skipped})`);
        fetchLogs();
      }
    } catch {
      setResult("❌ Sync failed. Check server logs.");
    } finally {
      setSyncing(false);
    }
  }

  const appsScript = `function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  // Trigger sync to Exorcise AI
  var options = {
    method: "POST",
    headers: {
      "x-sync-secret": "YOUR_ADMIN_SYNC_SECRET_HERE",
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };
  try {
    UrlFetchApp.fetch("https://your-domain.com/api/admin/sync-sheets", options);
  } catch(err) {
    Logger.log("Sync error: " + err);
  }
}`;

  return (
    <div className="min-h-screen bg-bg">
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
          <Link href="/admin/sync" className="text-glow">Sync</Link>
          <Link href="/admin/settings" className="text-muted hover:text-text">Settings</Link>
          <Link href="/chat" className="text-muted hover:text-text">← Chat</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--font-family-logo)" }}>
          Google Sheets Sync
        </h2>

        {/* Sync Control */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Manual Sync</h3>
              <p className="text-muted text-xs mt-1">
                Sync pre-registered users from Google Sheets
              </p>
            </div>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="btn-accent text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing...
                </span>
              ) : "🔄 Sync Now"}
            </button>
          </div>

          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.startsWith("✅") ? "bg-emerald-900/20 text-emerald-400" : "bg-red-900/20 text-red-400"}`}>
              {result}
            </div>
          )}
        </div>

        {/* Sync Logs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Sync History</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left p-3">Timestamp</th>
                <th className="text-center p-3">Created</th>
                <th className="text-center p-3">Updated</th>
                <th className="text-center p-3">Skipped</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="p-3 text-muted text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-center text-emerald-400">{log.created}</td>
                  <td className="p-3 text-center text-blue-400">{log.updated}</td>
                  <td className="p-3 text-center text-muted">{log.skipped}</td>
                  <td className="p-3">{log.errors ? <span className="text-red-400 text-xs">❌</span> : <span className="text-emerald-400 text-xs">✅</span>}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted">No sync activity yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Google Apps Script */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-2">Google Apps Script (auto-sync on edit)</h3>
          <p className="text-muted text-xs mb-4">
            Paste this script into your Google Sheet&apos;s Apps Script editor to auto-sync on every edit:
          </p>
          <div className="bg-input rounded-lg p-4 overflow-x-auto relative">
            <pre className="text-xs font-mono text-glow">{appsScript}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(appsScript)}
              className="absolute top-2 right-2 text-muted hover:text-text text-xs px-2 py-1 rounded border border-border"
            >
              📋 Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
