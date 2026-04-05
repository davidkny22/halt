"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

interface FeedbackEntry {
  id: string;
  message: string;
  category?: string;
  summary?: string;
  timestamp: string;
  isUser: boolean;
}

// Contextual prompts based on which page the user is on
const PAGE_PROMPTS: Record<string, string> = {
  "/dashboard": "How's the dashboard working for you?",
  "/rules": "Finding it easy to create rules?",
  "/agents": "How's agent monitoring going?",
  "/settings": "Everything configured the way you need?",
  "/saves": "Glad we caught that! Thoughts on the experience?",
  "/alerts": "Getting alerts where you need them?",
};

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<FeedbackEntry[]>([]);
  const [thankYou, setThankYou] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Contextual nudge after 30s on a page
  useEffect(() => {
    if (open) return;
    const prompt = PAGE_PROMPTS[pathname];
    if (!prompt) return;
    const shown = sessionStorage.getItem(`nudge-${pathname}`);
    if (shown) return;
    const timer = setTimeout(() => {
      setNudge(prompt);
      sessionStorage.setItem(`nudge-${pathname}`, "1");
      setTimeout(() => setNudge(null), 6000);
    }, 30000);
    return () => clearTimeout(timer);
  }, [pathname, open]);

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("clawnitor-feedback-history");
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("clawnitor-feedback-history", JSON.stringify(history.slice(-50)));
    }
  }, [history]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, open]);

  // Focus textarea on open
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  async function handleSend() {
    if (!message.trim() || sending) return;

    const userEntry: FeedbackEntry = {
      id: `user-${Date.now()}`,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setHistory((prev) => [...prev, userEntry]);
    const msg = message.trim();
    setMessage("");
    setSending(true);

    try {
      const res = await fetch("/api/account-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-feedback", message: msg, page: pathname }),
      });
      const data = await res.json();

      const botEntry: FeedbackEntry = {
        id: data.id || `bot-${Date.now()}`,
        message: data.reply || data.summary || "Thanks! We got your feedback.",
        category: data.category,
        timestamp: new Date().toISOString(),
        isUser: false,
      };

      setHistory((prev) => [...prev, botEntry]);
      setThankYou(true);
      setTimeout(() => setThankYou(false), 3000);
    } catch {
      const errorEntry: FeedbackEntry = {
        id: `err-${Date.now()}`,
        message: "Failed to send. Try again in a moment.",
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      setHistory((prev) => [...prev, errorEntry]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const categoryColors: Record<string, string> = {
    bug: "var(--color-coral)",
    feature: "var(--color-sky)",
    frustration: "var(--color-yellow)",
    praise: "var(--color-green)",
    question: "var(--color-purple)",
    other: "var(--color-text-tertiary)",
  };

  return (
    <>
      {/* Contextual nudge */}
      {nudge && !open && (
        <div
          className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-medium max-w-56 cursor-pointer"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
            boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.3)",
            animation: "slideUp 0.3s ease-out",
          }}
          onClick={() => { setNudge(null); setOpen(true); }}
        >
          {nudge}
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setNudge(null); }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-105"
        style={{
          backgroundColor: "var(--color-coral)",
          boxShadow: open
            ? "0 4px 12px rgba(255, 107, 74, 0.3)"
            : "0 4px 20px rgba(255, 107, 74, 0.4)",
        }}
        title="Send feedback"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 16px 48px -8px rgba(0, 0, 0, 0.4)",
            maxHeight: "480px",
            animation: "slideUp 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, var(--color-coral) 0%, #ff8f73 100%)",
            }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">What&apos;s on your mind?</p>
              <p className="text-[10px] text-white/70">Feedback, ideas, bugs — we read everything</p>
            </div>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ minHeight: "120px", maxHeight: "300px" }}>
            {history.length === 0 && (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  No messages yet. Tell us anything — what you love, what&apos;s broken, what you wish existed.
                </p>
              </div>
            )}
            {history.map((entry) => (
              <div
                key={entry.id}
                className={`flex ${entry.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="px-3 py-2 rounded-xl text-xs max-w-[85%]"
                  style={{
                    backgroundColor: entry.isUser ? "var(--color-coral)" : "var(--color-surface)",
                    color: entry.isUser ? "white" : "var(--color-text-secondary)",
                    borderBottomRightRadius: entry.isUser ? "4px" : "12px",
                    borderBottomLeftRadius: entry.isUser ? "12px" : "4px",
                  }}
                >
                  {entry.message}
                  {entry.category && !entry.isUser && (
                    <span
                      className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        color: categoryColors[entry.category] || "var(--color-text-tertiary)",
                      }}
                    >
                      {entry.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your feedback..."
                rows={1}
                className="flex-1 px-3 py-2 rounded-xl text-xs resize-none outline-none"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  maxHeight: "80px",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-30 transition-all"
                style={{ backgroundColor: "var(--color-coral)" }}
              >
                {sending ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" style={{ animation: "spin 0.6s linear infinite" }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
            {thankYou && (
              <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--color-green)" }}>
                Received! We read every message.
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
