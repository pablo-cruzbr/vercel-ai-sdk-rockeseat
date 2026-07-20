# Frontend do Assistente — Como foi construído

> Explicação do `app/page.tsx`: o chat do Alfred, assistente virtual do Pablo.
> Você construiu esse arquivo. Aqui está o que cada parte faz e por quê.

---

## Visão geral

O frontend é um único arquivo React com dois lados:
- **Esquerda**: título, descrição e botões de perguntas sugeridas
- **Direita**: o chat em si (Alfred respondendo em tempo real)

---

## As peças principais

### 1. `useChat` — o hook que gerencia tudo

```tsx
const { messages, sendMessage, status, setMessages } = useChat({
  messages: [INITIAL_MESSAGE],
  transport: new DefaultChatTransport({
    api: "/api/AssistentePabloCruz",
  }),
});
```

Esse hook do `@ai-sdk/react` faz tudo automaticamente:

| O que você desestrutura | O que faz |
|---|---|
| `messages` | histórico completo da conversa |
| `sendMessage` | envia uma mensagem pro backend |
| `status` | `"streaming"` enquanto o LLM responde, `"idle"` quando parou |
| `setMessages` | sobrescreve o histórico (usado no botão "Limpar") |

**`DefaultChatTransport`** é o que conecta o `useChat` à sua rota `/api/AssistentePabloCruz`.
No SDK v6, a configuração da API mudou de `api: "/api/..."` direto pra dentro de um `transport`.

---

### 2. Mensagem inicial sem chamar a API

```tsx
const INITIAL_MESSAGE = {
  id: "intro",
  role: "assistant" as const,
  parts: [{ type: "text" as const, text: "Olá, sou Alfred..." }],
};
```

Passando `messages: [INITIAL_MESSAGE]` pro `useChat`, o Alfred já aparece com a mensagem de boas-vindas quando a página carrega — **sem fazer nenhuma chamada ao backend**.

**Por que `parts` em vez de `content`?**
No SDK v6, a estrutura interna de cada mensagem usa `parts` (array de partes) em vez de uma string `content` direta. É o formato que o `useChat` usa por baixo dos panos.

---

### 3. `status` em vez de `isLoading`

```tsx
const isLoading = status === "submitted" || status === "streaming";
```

No SDK v6, não existe mais a propriedade `isLoading` direta.
O `status` tem vários estados:
- `"idle"` → nada acontecendo
- `"submitted"` → mensagem enviada, aguardando o modelo começar
- `"streaming"` → modelo gerando a resposta em tempo real
- `"error"` → algo deu errado

Você combinou `submitted` e `streaming` pra criar o seu próprio `isLoading`.

---

### 4. `sendMessage` com texto direto

```tsx
function submitText(text: string) {
  if (!text.trim() || isLoading) return;
  sendMessage({ text });
  setInput("");
}
```

No SDK v6, `sendMessage` recebe um objeto com `{ text }` — não mais uma string direta ou um evento de formulário. Isso permite mandar outros tipos de conteúdo no futuro (imagem, arquivo, etc).

Essa função é chamada de dois lugares:
- Pelo formulário (`handleSubmit`)
- Pelos botões de perguntas sugeridas (`onClick={() => submitText(q)}`)

---

### 5. Auto-scroll com `useRef`

```tsx
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
}, [messages]);
```

Toda vez que `messages` muda (nova mensagem chega), o `useEffect` dispara e rola o chat pra baixo automaticamente. O `useRef` aponta pro elemento `<div>` da lista de mensagens.

---

### 6. Renderizando as mensagens — lendo os `parts`

```tsx
const text = m.parts
  .filter((p) => p.type === "text")
  .map((p) => (p as { text: string }).text)
  .join("");
```

Como as mensagens no SDK v6 usam `parts` (não `content`), você precisa:
1. Filtrar só as partes do tipo `"text"` (ignora partes de imagem, tool call, etc)
2. Extrair o texto de cada parte
3. Juntar tudo numa string com `.join("")`

---

### 7. Renderização de markdown

O LLM retorna texto com formatação markdown (`**negrito**`, quebras de linha).
Sem tratamento, aparece assim: `**Fire OS** é um SaaS...` (com os asteriscos visíveis).

Para renderizar corretamente, dois componentes simples foram criados:

```tsx
// Divide o texto em parágrafos e linhas
function MarkdownText({ text }) { ... }

// Dentro de cada linha, transforma **bold** em <strong>
function InlineBold({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  // partes que começam e terminam com ** viram <strong>
  // o resto vira <span> normal
}
```

Sem instalar nenhum pacote extra — tudo feito com `.split()` e `.map()`.

---

### 8. Botão "Limpar"

```tsx
function clearChat() {
  setMessages([INITIAL_MESSAGE]);
}
```

`setMessages` (do `useChat`) substitui o histórico inteiro.
Passando só o `INITIAL_MESSAGE`, o chat volta ao estado inicial — como se fosse uma conversa nova.

---

## O fluxo completo

```
1. Página carrega
   → useChat inicializa com INITIAL_MESSAGE
   → Alfred aparece com a saudação (sem chamar a API)

2. Usuário digita ou clica numa sugestão
   → submitText(texto) é chamado
   → sendMessage({ text }) envia pro backend via DefaultChatTransport
   → status muda pra "submitted" → isLoading = true
   → input é limpo

3. Backend /api/AssistentePabloCruz recebe
   → convertToModelMessages() converte o formato
   → streamText() chama o Groq com PABLO_CONTEXT
   → toUIMessageStreamResponse() empacota o stream

4. Resposta chega em tempo real
   → status muda pra "streaming"
   → messages[] vai sendo atualizado token por token
   → useEffect dispara → auto-scroll

5. LLM termina
   → status volta pra "idle" → isLoading = false
   → MarkdownText renderiza o texto formatado
```

---

## Diferenças do SDK v5 → v6 que você usou

| v5 (antigo) | v6 (o que você fez) |
|---|---|
| `api: "/api/..."` direto no useChat | `transport: new DefaultChatTransport({ api })` |
| `isLoading` boolean | `status === "streaming" \| "submitted"` |
| `handleSubmit(e)` nativo | `sendMessage({ text })` manual |
| `message.content` string | `message.parts[].text` |
| `append({ role, content })` | `sendMessage({ text })` |
