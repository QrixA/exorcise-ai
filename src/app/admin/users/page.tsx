"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  interests: string | null;
  isPreRegistered: boolean;
  hasSetPassword: boolean;
  hasTotpEnabled: boolean;
  onboardingDone: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, [page, search]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", search });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${ok ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
        {ok ? "✓" : "✗"} {label}
      </span>
    );
  }

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
          <Link href="/admin/users" className="text-glow">Users</Link>
          <Link href="/admin/sync" className="text-muted hover:text-text">Sync</Link>
          <Link href="/admin/settings" className="text-muted hover:text-text">Settings</Link>
          <Link href="/chat" className="text-muted hover:text-text">← Chat</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-family-logo)" }}>
            Users <span className="text-muted text-lg">({total})</span>
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email, name, company..."
            className="bg-input border border-border rounded-lg px-4 py-2 text-sm w-72"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">Role</th>
                <th className="text-center p-3">Status</th>
                <th className="text-left p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-input/30">
                    <td className="p-3">
                      <span className="font-medium">{user.name || "—"}</span>
                      {user.isAdmin && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent-light">Admin</span>}
                    </td>
                    <td className="p-3 text-muted">{user.email}</td>
                    <td className="p-3 text-muted">{user.company || "—"}</td>
                    <td className="p-3 text-muted">{user.role || "—"}</td>
                    <td className="p-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <StatusBadge ok={user.isPreRegistered} label="Pre-reg" />
                        <StatusBadge ok={user.hasSetPassword} label="PW" />
                        <StatusBadge ok={user.hasTotpEnabled} label="2FA" />
                        <StatusBadge ok={user.onboardingDone} label="Done" />
                      </div>
                    </td>
                    <td className="p-3 text-muted text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-30 hover:bg-input"
            >
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-border rounded-lg disabled:opacity-30 hover:bg-input"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
