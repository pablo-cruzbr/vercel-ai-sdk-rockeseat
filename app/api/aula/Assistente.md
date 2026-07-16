# Jarvis — Assistente de Portfólio do Pablo

> Como criar um assistente de IA no seu portfólio usando o que aprendemos no AULA.md.
> Stack: Next.js + Vercel AI SDK + Groq (gratuito)

---

## O que você já aprendeu na AULA.md e vai usar aqui

O Jarvis não introduz nenhum conceito novo.
Ele é a **Aula 3 aplicada num caso de uso real** — com pequenos pedaços das Aulas 1 e 3 juntos.

```
AULA.md                           JARVIS (o que você vai construir)
─────────────────────────────     ─────────────────────────────────────────
Base — createGroq()           →   instanciar o cliente Groq na rota
Aula 3 — streamText()         →   gerar a resposta do Jarvis em tempo real
Aula 3 — convertToModelMessages→  converter as mensagens do chat pra o modelo
Aula 3 — toUIMessageStreamResponse→ enviar o stream de volta pro frontend
Aula 3 — useChat()            →   hook React que gerencia todo o chat
Aulas 1,2,3 — system prompt   →   instruções de comportamento + dados do Pablo
```

Se você ainda não leu a Aula 3 no AULA.md, leia antes de continuar.
Tudo que o Jarvis usa veio de lá.

---

### Por que `streamText` e não `generateText`?

Essa é a primeira decisão técnica do projeto.

A AULA.md explica a diferença assim:

```
generateText → espera a resposta COMPLETA antes de retornar (Aula 1 e 2)
streamText   → retorna a resposta PEDAÇO POR PEDAÇO em tempo real (Aula 3)
```

Para um chat com um assistente, `streamText` é a escolha certa.
Imagine um recrutador abrindo seu portfólio e esperando 5 segundos olhando tela branca.
Com streaming, ele vê a resposta aparecer na hora — igual ao ChatGPT.

**Jarvis usa `streamText` porque é um chat interativo.**

---

### Por que `convertToModelMessages`?

A AULA.md explica que o `useChat` do frontend e o LLM falam formatos diferentes:

```
Frontend (useChat) envia UIMessage:
  { id: "abc", role: "user", content: "Quais projetos o Pablo tem?" }

O LLM precisa de ModelMessage:
  { role: "user", content: [{ type: "text", text: "Quais projetos..." }] }
```

`convertToModelMessages` faz essa tradução.
Sem ela, o modelo não entenderia as mensagens — é o mesmo problema que a Aula 3 resolve.

---

### Por que `toUIMessageStreamResponse`?

A AULA.md explica:

> "Empacota o stream num formato especial que o hook `useChat` do frontend
> consegue ler e exibir em tempo real."

No Jarvis isso fecha o ciclo:
`streamText` gera os tokens → `toUIMessageStreamResponse` formata pra o `useChat` → usuário vê a resposta aparecer.

---

### O system prompt é o segredo do Jarvis

A AULA.md ensina `system` nas três aulas:

```
Aula 1 (example): system define que a IA é um "gerador de questões"
Aula 2 (forum):   system define que a IA é um "instrutor da Rocketseat"
Aula 3 (chat):    system define que a IA "só responde sobre programação"
```

No Jarvis, o `system` é o mesmo conceito — mas o conteúdo é seus dados reais.
Em vez de comportamento genérico, você injeta:
- Quem é o Pablo
- Quais são os projetos (com resultados reais)
- Como ele pode ajudar empresas

**O modelo lê o system prompt e responde com base nele.**
Sem banco de dados, sem RAG. É o padrão mais simples possível — e já funciona.

---

## O que vamos construir

```
┌─────────────────────────────┬──────────────────────────────────┐
│                             │  🤖 Jarvis                       │
│  Conheça Pablo              │  • Assistente do Pablo           │
│  através do Jarvis.         │                                  │
│                             │  Olá, sou Jarvis, o assistente  │
│  Um assistente com          │  virtual do Pablo. Posso         │
│  informações sobre minha    │  apresentar sua trajetória,      │
│  trajetória, projetos e     │  projetos, área de atuação...    │
│  área de atuação.           │                                  │
│  Pergunte o que quiser.     │  ─────────────────────────────  │
│                             │                                  │
│  EXPERIMENTE PERGUNTAR      │  [Pergunte algo sobre o Pablo...│
│                             │                              ✈️] │
│  Em quais projetos o        └──────────────────────────────────┘
│  Pablo trabalha?
│
│  Como o Pablo pode
│  ajudar minha empresa?
│
│  Quais são as principais
│  habilidades dele?
└─────────────────────────────
```

---

## Como funciona (lógica simples)

O Jarvis é um chat normal (igual à Aula 3) com uma diferença:
o `system prompt` contém **todas as informações do Pablo**.

Sem banco de dados, sem RAG, sem complexidade.
O modelo recebe os dados do Pablo no prompt e responde com base nisso.

```
Usuário pergunta: "Quais projetos o Pablo tem?"
  → useChat envia pra /api/jarvis
  → Route injeta o contexto completo do Pablo no system prompt
  → LLM lê o contexto e responde como Jarvis
  → Resposta chega em streaming no chat
```

---

## Passo 1 — A rota do backend

Crie o arquivo: `app/api/jarvis/route.ts`

```ts
// ↓ Aula 3 — as mesmas importações do chat/route.ts
import { convertToModelMessages, streamText } from "ai"
// ↓ Base — createGroq aparece nas 3 aulas (sempre o mesmo padrão)
import { createGroq } from "@ai-sdk/groq"

// Base — instanciar o cliente uma vez fora da função (exatamente igual à Aula 3)
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// ↓ CONCEITO: system prompt (Aulas 1, 2 e 3 — sempre presente)
// A diferença do Jarvis: o system contém os DADOS REAIS do Pablo,
// não só instrução de comportamento.
const PABLO_CONTEXT = `
Você é Jarvis, o assistente virtual do Pablo Cruz.
Sua função é apresentar o Pablo de forma profissional, destacando seus projetos,
habilidades e como ele pode ajudar empresas e recrutadores.

Comece SEMPRE assim na primeira mensagem:
"Olá, sou Jarvis, o assistente virtual do Pablo. Posso apresentar sua trajetória,
projetos, área de atuação e explicar como ele pode ajudar seu negócio como profissional."

Regras de comportamento:
- Fale SEMPRE em primeira pessoa pelo Pablo (ex: "Pablo desenvolveu...", "Ele tem experiência em...")
- Seja profissional mas acessível
- Destaque resultados concretos quando possível (números, impacto)
- Se perguntarem algo que não sabe, diga que pode passar o contato do Pablo
- Nunca invente informações que não estão aqui abaixo

═══════════════════════════════════════
INFORMAÇÕES DO PABLO CRUZ
═══════════════════════════════════════

PERFIL:
- Nome: Pablo Cruz
- Cargo: Desenvolvedor Fullstack
- Localização: Mogi das Cruzes, São Paulo
- Status: Disponível para contratação
- Missão: "Transformando visões em produtos web de alta performance"

CONTATO:
- Email: pablocruzdev@gmail.com
- GitHub: github.com/pablo-cruzbr
- LinkedIn: linkedin.com/in/pablo-cruz-5b937525b
- Instagram: @pablocruzdev

STACK TÉCNICA:
- Linguagens: JavaScript (ES2024+), TypeScript v5
- Frontend: React.js v19, Next.js v16, Tailwind CSS v4, React Native, Expo
- Backend: Node.js v22, Express.js
- Banco de dados: PostgreSQL v16, Prisma ORM, Redis
- IA: Vercel AI SDK, OpenAI (GPT), LangChain, LangGraph, Groq
- Infra: Vercel, Railway, BullMQ, JWT, Cloudinary, GitHub API

PROJETOS PRINCIPAIS:

1. HONE AI (2° lugar no Hackathon Borderless Coding)
   O que é: Plataforma de entrevista mock com IA para engenheiros de software
   Como funciona: Candidato faz upload do currículo → IA conduz entrevista personalizada → gera feedback automático
   Stack: Next.js, TypeScript, LangGraph, BullMQ, Redis, PostgreSQL, OpenAI
   Destaque: 2° lugar em hackathon competitivo, projeto em produção

2. BUGLESS (Hackathon Borderless Coding)
   O que é: Ferramenta de code review com IA focada em bugs reais
   Como funciona: Analisa código TypeScript via CLI e GitHub App, detecta bugs, vulnerabilidades de segurança e problemas de performance
   Stack: TypeScript, React, IA generativa
   Destaque: Menos de 10% de falsos positivos

3. FIRE OS (SaaS próprio — projeto mais maduro)
   O que é: Plataforma SaaS para modernizar gestão de ordens de serviço em empresas de TI
   Resultados reais: 47 ordens processadas em 2 meses em produção, redução de 83% no esforço de conclusão, fluxo reduzido de 5-6 telas para 2
   Stack: TypeScript, Next.js, Node.js, PostgreSQL, Prisma
   Destaque: Validado em produção com clientes reais

4. MESTRE DA COMANDA
   O que é: SaaS fullstack de gestão de comandas para restaurantes
   Como funciona: App mobile para garçom + dashboard web para cozinha com sincronização em tempo real
   Stack: React Native, Expo, Next.js, Node.js, PostgreSQL, Prisma
   Destaque: Elimina papel e erros, acelera o giro de mesas

5. PORTFÓLIO METADATA API
   O que é: API centralizada que gerencia metadados de projetos dinamicamente
   Stack: Node.js, Express, Prisma, PostgreSQL, TypeScript
   Destaque: Atualiza o portfólio sem precisar fazer deploy do frontend

SERVIÇOS QUE PABLO OFERECE:
- Branding & UI/UX: Interfaces intuitivas que fortalecem a identidade da marca
- Sistemas Web, SaaS & Apps: Aplicações complexas com arquitetura moderna e segura
- Design & Performance: Páginas otimizadas e rápidas para converter visitantes em clientes
- Consultoria Técnica: Orientação estratégica na escolha de tecnologias

DIFERENCIAIS:
- Fullstack completo: do banco de dados ao mobile
- Experiência com IA integrada em produto (não só teoria)
- Projetos validados em produção com resultados mensuráveis
- 2° lugar em hackathon com projeto real e funcional
`

export async function POST(request: Request) {
  const { messages } = await request.json()

  // ↓ Aula 3 — converte UIMessage[] (frontend) → ModelMessage[] (LLM)
  // Sem isso o modelo não entende o formato que o useChat envia
  const modelMessages = await convertToModelMessages(messages)

  // ↓ Aula 3 — streamText (e não generateText) porque é um chat interativo
  // NÃO tem await — você não espera a resposta completa, retorna o stream direto
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: PABLO_CONTEXT,  // ← Aulas 1, 2, 3 — instrução de comportamento + dados do Pablo
    messages: modelMessages,
  })

  // ↓ Aula 3 — empacota o stream no formato que o useChat do frontend espera
  return result.toUIMessageStreamResponse()
}
```

---

## Passo 2 — A página do portfólio

Crie o arquivo: `app/jarvis/page.tsx`

```tsx
"use client"

// ↓ Aula 3 — pacote separado do "ai" principal (você instalou @ai-sdk/react)
import { useChat } from "@ai-sdk/react"
import { useRef, useEffect } from "react"

const SUGGESTED_QUESTIONS = [
  "Em quais projetos o Pablo trabalha?",
  "Como o Pablo pode ajudar minha empresa?",
  "Quais são as principais habilidades dele?",
]

export default function JarvisPage() {
  // ↓ Aula 3 — useChat gerencia TODO o estado do chat automaticamente:
  //   messages     → histórico completo de mensagens
  //   input        → valor atual do campo de texto
  //   handleInputChange → atualiza o input conforme o usuário digita
  //   handleSubmit → envia a mensagem e faz POST /api/jarvis
  //   isLoading    → true enquanto o LLM está gerando a resposta
  //   append()     → adiciona uma mensagem sem precisar do formulário (para os botões sugeridos)
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/jarvis",
    // initialMessages: mensagem de boas-vindas que aparece na tela sem chamar a API
    // O useChat aceita isso — é a mesma estrutura de messages que ele gerencia
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Olá, sou Jarvis, o assistente virtual do Pablo. Posso apresentar sua trajetória, projetos, área de atuação e explicar como ele pode ajudar seu negócio como profissional.",
      },
    ],
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll pra última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // append() é do useChat — injeta uma mensagem diretamente no histórico
  // e dispara o POST pra /api/jarvis sem precisar de um formulário
  function handleSuggestedQuestion(question: string) {
    append({ role: "user", content: question })
  }

  return (
    <div className="flex min-h-screen bg-black text-white">

      {/* ── LADO ESQUERDO ── */}
      <div className="flex flex-col justify-center gap-8 w-[420px] px-12 shrink-0">

        <div>
          <span className="text-blue-500 text-xs font-semibold tracking-widest uppercase">
            ✦ Inteligência Artificial
          </span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Conheça Pablo <br />
            através do{" "}
            <span className="text-blue-500">Jarvis.</span>
          </h1>
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
            Um assistente com informações sobre minha trajetória, projetos e
            áreas de atuação. Pergunte o que quiser.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-zinc-500 text-xs font-semibold tracking-widest uppercase">
            Experimente Perguntar
          </span>
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleSuggestedQuestion(question)}
              className="text-left text-sm text-zinc-300 border border-zinc-800 rounded-lg px-4 py-3 hover:border-blue-500 hover:text-white transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* ── LADO DIREITO — CHAT ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl h-[580px] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">

          {/* Header do chat */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm">
                🤖
              </div>
              <div>
                <p className="text-sm font-semibold">Jarvis</p>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  Assistente do Pablo
                </p>
              </div>
            </div>
            <span className="text-xs text-zinc-600 uppercase tracking-widest">
              Powered by AI
            </span>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {/* Indicador de digitação */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-500">
                  Jarvis está digitando...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — handleSubmit e handleInputChange vêm do useChat (Aula 3) */}
          <form
            onSubmit={handleSubmit}
            className="px-4 py-4 border-t border-zinc-800 flex gap-2"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Pergunte algo sobre o Pablo..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none border border-zinc-800 focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-4 py-3 transition-colors"
            >
              ✈️
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
```

---

## Passo 3 — Variável de ambiente necessária

No `.env.local` você já tem:
```
GROQ_API_KEY=sua_chave_aqui
```

Nada novo pra adicionar — usa a mesma chave do Groq que você já configurou.

---

## Como o Jarvis funciona por baixo (referenciando a AULA.md)

```
1. Página carrega
   → useChat (Aula 3) inicializa com a mensagem de boas-vindas
   → Nenhuma chamada à API ainda

2. Usuário clica numa pergunta sugerida OU digita e envia
   → append() ou handleSubmit() do useChat (Aula 3) dispara
   → useChat faz POST /api/jarvis com messages[] (UIMessage[])

3. Backend — route.ts /api/jarvis
   → convertToModelMessages() (Aula 3) converte UIMessage[] → ModelMessage[]
   → streamText() (Aula 3) chama o Groq com PABLO_CONTEXT no system (Aulas 1,2,3)
   → Groq lê os dados do Pablo no system e gera resposta como Jarvis

4. Resposta volta em streaming
   → toUIMessageStreamResponse() (Aula 3) empacota pra o useChat
   → useChat recebe token por token e atualiza messages[]
   → isLoading (Aula 3) fica true até terminar — UI exibe "Jarvis está digitando..."
```

Cada linha do fluxo veio de algo explicado na Aula 3.
O único diferencial é o conteúdo do `system` — onde entram seus dados reais.

---

## Por que esse projeto é poderoso pro seu portfólio

Todo mundo tem uma página "Sobre mim" com lista de projetos.
Você vai ter um **assistente que responde perguntas sobre você**.

Quando um recrutador ou cliente acessar seu portfólio:
- Não precisa ler tudo → pergunta pro Jarvis
- A IA destaca os pontos mais relevantes pra necessidade dele
- Experiência memorável — diferente de qualquer portfólio que ele viu

**É a Aula 3 (chat em tempo real) aplicada num caso de uso real.**

---

## Próxima evolução (depois que funcionar)

Quando quiser deixar ainda mais poderoso:

```
Versão 1 (essa aqui) → context no system prompt (simples, já funciona)

Versão 2 → RAG com pgvector
  → Embeddings dos seus projetos, README, histórico
  → Jarvis busca informações relevantes antes de responder
  → Cobre perguntas mais específicas e detalhadas

Versão 3 → Tools
  → Tool "buscarProjetos()" que consulta sua API de portfólio
  → Jarvis sempre tem os dados mais atualizados do banco
  → Sem precisar atualizar o system prompt manualmente
```

Mas a Versão 1 já impressiona. Comece por ela.
