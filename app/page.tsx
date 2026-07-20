"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

const SUGGESTED_QUESTIONS = [
  "Em quais projetos o Pablo trabalha?",
  "Como o Pablo pode ajudar minha empresa?",
  "Quais são as principais habilidades dele?",
];

const INITIAL_MESSAGE = {
  id: "intro",
  role: "assistant" as const,
  parts: [
    {
      type: "text" as const,
      text:
        "Olá, sou Alfred, o assistente virtual do Pablo. Posso apresentar sua trajetória, projetos, áreas de atuação e explicar como ele pode ajudar seu negócio.",
    },
  ],
};

export default function AssistentePabloCruz() {
  const { messages, sendMessage, status, setMessages } = useChat({
    messages: [INITIAL_MESSAGE],
    transport: new DefaultChatTransport({
      api: "/api/AssistentePabloCruz",
    }),
  });

  function clearChat() {
    setMessages([INITIAL_MESSAGE]);
  }

  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submitText(text: string) {
    if (!text.trim() || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitText(input);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-16 px-6 py-16 lg:grid-cols-2 lg:px-8">
        {/* Coluna esquerda */}
        <div>
          <div className="mb-6 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#5B8DEF]">
            <span className="text-base">✧</span> Inteligência Artificial
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Conheça Pablo <br />
            através do{" "}
            <span className="text-[#5B8DEF]">Alfred.</span>
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#8B90A0]">
            Um assistente com informações sobre minha trajetória, projetos e
            áreas de atuação. Pergunte o que quiser.
          </p>

          <div className="mt-12">
            <p className="mb-3 text-[11px] font-mono uppercase tracking-widest text-[#5B6070]">
              Experimente perguntar
            </p>
            <div className="flex flex-col gap-2.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => submitText(q)}
                  disabled={isLoading}
                  className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-[13px] text-[#D7D9E0] transition hover:border-[#5B8DEF]/40 hover:bg-[#5B8DEF]/[0.06] disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita — chat */}
        <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0C12]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#5B8DEF]/30 bg-[#5B8DEF]/10">
                <BotIcon />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Alfred</p>
                <p className="flex items-center gap-1.5 text-[11px] text-[#8B90A0]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5B8DEF]" />
                  Assistente do Pablo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearChat}
                className="text-[11px] text-[#5B6070] hover:text-[#8B90A0] transition"
                title="Limpar conversa"
              >
                Limpar
              </button>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#5B6070]">
                Powered by AI
              </span>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-4">
              {messages.map((m) => {
                const isUser = m.role === "user";
                const text = m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => (p as { text: string }).text)
                  .join("");

                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-[13px] leading-relaxed ${
                      isUser
                        ? "ml-auto bg-[#5B8DEF] text-white"
                        : "bg-white/[0.04] text-[#D7D9E0]"
                    }`}
                  >
                    <MarkdownText text={text} />
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex max-w-[85%] gap-1 rounded-lg bg-white/[0.04] px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B6070] [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B6070] [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5B6070]" />
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-white/10 p-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre o Pablo..."
              disabled={isLoading}
              className="flex-1 rounded-md border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13px] text-white placeholder:text-[#5B6070] outline-none focus:border-[#5B8DEF]/50 focus:ring-1 focus:ring-[#5B8DEF]/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#5B8DEF] transition hover:bg-[#5B8DEF]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Renderiza **negrito** e quebras de linha do texto do LLM
function MarkdownText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="flex flex-col gap-2">
      {paragraphs.map((para, i) => {
        const lines = para.split("\n");
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                <InlineBold text={line} />
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B8DEF" strokeWidth="2">
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M12 9V5" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.2" fill="#5B8DEF" stroke="none" />
      <circle cx="9" cy="14" r="1.2" fill="#5B8DEF" stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill="#5B8DEF" stroke="none" />
      <path d="M2 13h2M20 13h2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
    </svg>
  );
}