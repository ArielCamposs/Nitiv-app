"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Bot, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  navLink?: { path: string; description: string };
};

export function FloatingHelpAgent() {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: "¡Hola! Soy NitivBot, tu asistente de ayuda en la plataforma. ¿En qué te puedo ayudar a navegar o entender hoy?",
    },
  ]);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .single();
      if (profile) setUserProfile(profile);
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, open, isLoading]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/help-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, data: { user: userProfile } }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.details ?? err.error ?? `Error ${res.status}`;
        throw new Error(msg);
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let navLink: { path: string; description: string } | undefined;

      const assistantMsgId = `a-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith('0:"')) {
              // Text chunk
              const textPart = line.slice(3, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"');
              fullText += textPart;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullText } : m))
              );
            } else if (line.startsWith('9:')) {
              // Tool call result (navigate_to_section)
              try {
                const toolData = JSON.parse(line.slice(2));
                if (toolData?.toolName === "navigate_to_section" && toolData?.args) {
                  navLink = { path: toolData.args.path, description: toolData.args.description };
                }
              } catch {}
            } else if (line.startsWith('a:')) {
              // Tool result
              try {
                const resultData = JSON.parse(line.slice(2));
                if (resultData?.result?.path) {
                  navLink = { path: resultData.result.path, description: resultData.result.description };
                }
              } catch {}
            }
          }
        }
      }

      if (navLink) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, navLink } : m))
        );
      }
    } catch (error) {
      console.error("Help Agent error:", error);
      const message = error instanceof Error ? error.message : "Lo siento, hubo un error al procesar tu consulta. Por favor intenta nuevamente.";
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-24 z-40 flex flex-col items-end gap-3 transition-all duration-300">
      {/* Tooltip Bubble */}
      {!open && (
        <div className="absolute right-0 bottom-16 mr-2 mb-1 w-max animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white text-indigo-700 text-xs font-medium px-4 py-2.5 rounded-2xl rounded-br-sm shadow-xl shadow-indigo-500/10 border border-indigo-100 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>¿Necesitas ayuda con algo?</span>
          </div>
        </div>
      )}

      {open && (
        <div className="w-80 h-[480px] rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 origin-bottom-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-indigo-500 to-purple-600 border-b shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Soporte Técnico</h3>
                <p className="text-[10px] text-indigo-100 font-medium tracking-wide">Asistente IA Nitiv</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-indigo-50 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50/50">
            {messages.map((m) => {
              const isOwn = m.role === "user";
              return (
                <div key={m.id} className={cn("flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                  {m.content && (
                    <div className={cn("flex gap-2 max-w-[85%]", isOwn ? "flex-row-reverse" : "flex-row")}>
                      {!isOwn && (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm",
                          isOwn
                            ? "bg-slate-800 text-white rounded-tr-sm"
                            : "bg-white border text-slate-700 border-slate-200/60 rounded-tl-sm"
                        )}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {m.content}
                      </div>
                    </div>
                  )}
                  {m.navLink && (
                    <div className="ml-8 mt-1 border border-indigo-100 bg-indigo-50/50 rounded-xl p-3 max-w-[80%] shadow-sm">
                      <p className="text-xs text-indigo-800 mb-2 font-medium">✨ {m.navLink.description}</p>
                      <button
                        onClick={() => {
                          router.push(m.navLink!.path);
                          setOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Ir a {m.navLink.path}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-1" />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Pregúntale a NitivBot..."
                disabled={isLoading}
                className="w-full bg-slate-100/80 border border-slate-200 text-sm rounded-full pl-4 pr-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-inner disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="absolute right-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-full transition-all flex items-center justify-center shrink-0"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <p className="text-center mt-2 text-[9px] text-slate-400 flex items-center justify-center gap-1 font-medium">
              POTENCIADO POR IA <Sparkles className="w-2.5 h-2.5" />
            </p>
          </div>
        </div>
      )}

      {/* Main Floating Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative h-12 w-12 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center ring-4 ring-white/50 group",
          open
            ? "bg-slate-800 text-white scale-95"
            : "bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105"
        )}
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-tr from-indigo-600/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5 group-hover:animate-pulse" />}
      </button>
    </div>
  );
}
