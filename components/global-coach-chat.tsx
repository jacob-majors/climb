"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type Message = { role: "user" | "coach"; text: string };

const QUICK_PROMPTS = [
  "What should I work on today?",
  "How's my training load looking?",
  "I'm tired — should I rest?",
  "How do I get stronger fingers?",
];

export function GlobalCoachChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || isStreaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setIsStreaming(true);
    setMessages((m) => [...m, { role: "coach", text: "" }]);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: null, question }),
      });
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const text = buffer;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "coach", text };
          return next;
        });
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "coach", text: "Couldn't connect right now. Try again." };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Ask coach"
        className={`fixed bottom-24 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(15,36,32,0.22)] transition-all sm:bottom-6 ${
          open
            ? "bg-ink text-chalk"
            : "bg-pine text-chalk hover:bg-ink"
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 right-4 z-50 flex w-[min(340px,calc(100vw-2rem))] flex-col rounded-[28px] border border-white/20 bg-chalk/70 shadow-[0_24px_60px_rgba(15,36,32,0.28)] backdrop-blur-xl sm:bottom-24"
          style={{ maxHeight: "min(520px, calc(100vh - 160px))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-ink/8 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pine">
              <MessageCircle className="h-3.5 w-3.5 text-chalk" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink leading-tight">Coach</p>
              <p className="text-[10px] text-ink/40">Powered by Groq · Llama 3.1</p>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              className="text-ink/30 hover:text-ink transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-ink/40 text-center pb-1">Ask anything about your training</p>
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => send(p)} disabled={isStreaming}
                    className="w-full text-left text-xs text-ink/60 px-3 py-2 rounded-2xl border border-ink/8 hover:border-pine/30 hover:text-pine transition-colors bg-white/40 disabled:opacity-40">
                    {p}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <p className={`text-[10px] font-semibold mb-0.5 ${msg.role === "user" ? "text-ink/35 pr-1" : "text-pine/60 pl-1"}`}>
                    {msg.role === "user" ? "You" : "Coach"}
                  </p>
                  <p className={`text-sm leading-[1.6] max-w-[88%] ${msg.role === "user" ? "text-ink text-right" : "text-ink/80"}`}>
                    {msg.text || (isStreaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-0.5 text-ink/30">
                        <span className="animate-bounce">·</span>
                        <span className="animate-bounce [animation-delay:0.12s]">·</span>
                        <span className="animate-bounce [animation-delay:0.24s]">·</span>
                      </span>
                    ) : "")}
                  </p>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-ink/8 px-3 py-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask the coach…"
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/30 disabled:opacity-50"
            />
            <button type="button" onClick={() => send(input)}
              disabled={!input.trim() || isStreaming}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pine text-chalk transition hover:bg-ink disabled:opacity-30">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
