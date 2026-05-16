"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; isAdmin?: boolean } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) { router.push("/login"); return; }
        const data = await res.json();
        if (!data.user) { router.push("/login"); return; }
        if (data.pending2fa) { router.push("/login/verify"); return; }
        if (!data.user.onboardingDone) { router.push("/onboarding"); return; }
        setUser(data.user);
        setAuthorized(true);
        // Welcome message
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "👻 Selamat datang di **Exorcise AI**!\n\nAku siap membantu menjawab pertanyaanmu. Summon the answer, banish the unknown.\n\nApa yang bisa aku bantu hari ini?",
          timestamp: new Date(),
        }]);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      const responses = [
        "Pertanyaan yang menarik! Aku sedang menganalisis...\n\n🔮 Berdasarkan pengetahuanku, ini adalah topik yang memerlukan penjelasan mendalam. Fitur AI backend akan segera diintegrasikan untuk memberikan jawaban yang lebih akurat.",
        "👻 Aku mengerti pertanyaanmu.\n\nSaat ini aku masih dalam tahap **Early Access Beta**. Backend AI sedang dalam proses integrasi. Stay tuned untuk update selanjutnya!",
        "Terima kasih sudah bertanya! 🔮\n\nExorcise AI sedang dalam pengembangan aktif. Sebentar lagi aku akan bisa menjawab pertanyaan kompleks dengan bantuan AI yang lebih canggih.",
        "Interesting question! 👻\n\nAku mencatat pertanyaanmu. Saat ini aku beroperasi dalam mode **preview**. Full AI capabilities akan segera hadir — banishing the unknown, one question at a time.",
      ];

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setThinking(false);
    }, 1500 + Math.random() * 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatMessage(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center animate-fade-up">
          <div className="text-5xl mb-4" style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.4))" }}>👻</div>
          <p className="text-muted text-sm">Loading Exorcise AI...</p>
          <div className="mt-4">
            <svg className="animate-spin h-6 w-6 mx-auto" style={{ color: "var(--accent)" }} viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-30 w-72 h-full transition-transform duration-300`}
        style={{ background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" style={{ filter: "drop-shadow(0 0 10px rgba(124,58,237,0.4))" }}>👻</span>
              <div>
                <h1 className="font-bold text-sm tracking-wider" style={{ fontFamily: "var(--font-family-logo)" }}>Exorcise AI</h1>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Early Access Beta</p>
              </div>
            </div>
            <button
              onClick={() => {
                setMessages([{
                  id: "welcome-new",
                  role: "assistant",
                  content: "👻 Chat baru dimulai! Ada yang bisa aku bantu?",
                  timestamp: new Date(),
                }]);
              }}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <span>+</span> Chat Baru
            </button>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs uppercase tracking-wider mb-3 px-2" style={{ color: "var(--text-muted)" }}>
              Riwayat Chat
            </p>
            <div
              className="px-3 py-2.5 rounded-lg text-sm mb-1"
              style={{ background: "rgba(124,58,237,0.15)", color: "var(--accent-light)" }}
            >
              💬 Chat saat ini
            </div>
          </div>

          {/* User section */}
          <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-light))" }}
              >
                {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/account")}
                className="flex-1 py-1.5 px-3 rounded text-xs transition-colors"
                style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
              >
                ⚙️ Akun
              </button>
              {user?.isAdmin && (
                <button
                  onClick={() => router.push("/admin/dashboard")}
                  className="flex-1 py-1.5 px-3 rounded text-xs transition-colors"
                  style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
                >
                  🛡️ Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="py-1.5 px-3 rounded text-xs transition-colors"
                style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
              >
                ↪️
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg"
            style={{ background: "var(--bg-input)" }}
          >
            ☰
          </button>
          <span className="text-lg">🔮</span>
          <div>
            <h2 className="text-sm font-semibold">Exorcise AI</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {thinking ? "Sedang berpikir..." : "Online — siap membantu"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: thinking ? "#eab308" : "#22c55e", boxShadow: `0 0 6px ${thinking ? "#eab308" : "#22c55e"}` }}
            />
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.2)", color: "var(--accent-light)" }}>
              Beta
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${msg.role === "user" ? "" : "flex gap-3"}`}>
                  {msg.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
                    >
                      <span className="text-sm">👻</span>
                    </div>
                  )}
                  <div
                    className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={msg.role === "user" ? {
                      background: "linear-gradient(135deg, var(--accent), #6d28d9)",
                      color: "#fff",
                      borderBottomRightRadius: "4px",
                    } : {
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderBottomLeftRadius: "4px",
                    }}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1"
                    style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
                  >
                    <span className="text-sm">👻</span>
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--accent)", animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-4" style={{ borderTop: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl p-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm py-1.5 max-h-32"
                style={{ color: "var(--text)" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className="p-2.5 rounded-xl transition-all disabled:opacity-30"
                style={{
                  background: input.trim() && !thinking ? "var(--accent)" : "var(--bg-input)",
                  color: "#fff",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Exorcise AI Beta — Responses are simulated during Early Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
