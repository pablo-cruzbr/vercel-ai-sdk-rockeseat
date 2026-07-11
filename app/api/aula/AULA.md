# Aula: Vercel AI SDK — Do Zero ao Chat em Tempo Real

> Você está aprendendo a usar LLMs no seu código. Essas 3 rotas mostram
> 3 formas diferentes de fazer isso — cada uma um nível acima da anterior.

---

## Vercel AI SDK — O quadro geral (leia isso primeiro)

### O problema que ele resolve

Imagine que você quer usar IA no seu projeto. Existem vários provedores:

```
Groq    → roda Llama, Mistral (grátis, rápido)
OpenAI  → GPT-4, GPT-4o (pago, mais inteligente)
Google  → Gemini (tier gratuito generoso)
Anthropic → Claude (excelente pra código)
```

Cada um tem uma API diferente. Sem o SDK, seu código ficaria assim:

```ts
// Código pra Groq
const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  headers: { "Authorization": `Bearer ${process.env.GROQ_KEY}` },
  body: JSON.stringify({ model: "llama-3.1-8b-instant", messages })
})

// Código pra OpenAI (diferente!)
const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { "Authorization": `Bearer ${process.env.OPENAI_KEY}` },
  body: JSON.stringify({ model: "gpt-4o", messages })
})

// Código pra Gemini (diferente de novo!)
const geminiRes = await fetch("https://generativelanguage.googleapis.com/...", {
  // outro formato completamente diferente...
})
```

**Problema:** código duplicado, formatos diferentes, streaming manual, sem tipagem.

---

### O que o Vercel AI SDK faz

O SDK cria uma **interface unificada**. Você aprende uma vez, funciona com todos:

```ts
// Com Groq
const { text } = await generateText({ model: groq("llama-3.1-8b-instant"), prompt: "oi" })

// Com OpenAI (MESMA função, só muda o model)
const { text } = await generateText({ model: openai("gpt-4o"), prompt: "oi" })

// Com Gemini (MESMA função)
const { text } = await generateText({ model: google("gemini-2.0-flash"), prompt: "oi" })
```

Trocar de provedor = mudar uma linha. O resto do código não muda.

---

### Onde o SDK vive no seu projeto

O SDK tem dois "lados":

```
BACKEND (servidor)          FRONTEND (browser)
────────────────────        ────────────────────
pacote: "ai"                pacote: "@ai-sdk/react"

generateText()              useChat()
streamText()                useCompletion()
generateObject()
tool()
convertToModelMessages()
```

**Backend** → onde a IA roda de verdade (suas rotas `/api/aula/*`)  
**Frontend** → hooks React que consomem o que o backend produz (`useChat`)

---

### Os pacotes que você tem instalado

```json
"ai"              → o SDK principal (funções do backend)
"@ai-sdk/groq"    → adaptador pra Groq (conecta ao provider)
"@ai-sdk/react"   → hooks React (useChat no frontend)
```

**Analogia:**
- `ai` = o controle universal (sabe falar com qualquer TV)
- `@ai-sdk/groq` = o adaptador de tomada da Groq (plugue específico)
- `@ai-sdk/react` = o controle remoto do usuário (interface no browser)

---

### As funções principais que você vai usar

| Função | Onde fica | O que faz |
|--------|-----------|-----------|
| `generateText()` | backend | pede texto, espera resposta completa |
| `streamText()` | backend | pede texto, recebe em tempo real |
| `generateObject()` | backend | pede JSON estruturado (sem parse manual) |
| `tool()` | backend | define função que o modelo pode chamar |
| `convertToModelMessages()` | backend | converte mensagens do frontend pro modelo |
| `useChat()` | frontend | hook que gerencia chat com streaming |

Você vai ver `generateText` e `streamText` nas aulas abaixo.
`generateObject` e `tool` vêm depois — são os próximos passos.

---

### Por que a Vercel criou isso?

A Vercel é a empresa que criou o Next.js. Eles perceberam que todo dev
estava escrevendo o mesmo código repetitivo pra usar IA. Então criaram
um SDK que resolve isso de forma padronizada e com suporte a streaming nativo.

**Hoje é o SDK mais usado no ecossistema TypeScript/React pra IA.**
Startups, grandes empresas e projetos open source usam.
Por isso vale aprender — é o que o mercado usa.

---

## O que é o Vercel AI SDK?

Antes de olhar o código, entenda o contexto:

Um LLM (como Llama, GPT, Gemini) é um modelo que gera texto.
Para usar ele no seu código, você precisa chamar a API do provedor (Groq, OpenAI, etc).

**Sem o SDK** você faria assim:
```ts
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { "Authorization": "Bearer CHAVE", "Content-Type": "application/json" },
  body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [...] })
})
const data = await res.json()
const texto = data.choices[0].message.content
```

**Com o SDK** você faz assim:
```ts
const { text } = await generateText({ model: groq("llama-3.1-8b-instant"), prompt: "oi" })
```

O SDK abstrai toda a complexidade: autenticação, parsing, streaming, erros.

---

## A base que aparece nos 3 arquivos

Todo arquivo começa igual. Entenda isso uma vez e vale pra sempre:

```ts
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})
```

**O que é isso?**
- `createGroq` cria um "cliente" que sabe falar com a API da Groq
- `process.env.GROQ_API_KEY` é sua chave secreta (nunca expõe no código)
- `groq` é uma função que você vai usar pra escolher o modelo:
  - `groq('llama-3.1-8b-instant')` → modelo rápido e leve
  - `groq('llama-3.3-70b-versatile')` → modelo mais inteligente

**Analogia:** `createGroq` é como "fazer login" na Groq uma vez.
Depois você usa `groq(modelo)` pra pedir qualquer coisa pra eles.

---

---

# AULA 1 — example/route.ts

## O que ela faz?
Recebe um tópico e quantidade, manda pro LLM, e retorna questões de múltipla
escolha em formato JSON estruturado.

**Exemplo de uso:**
```
POST /api/aula/example
Body: { "topic": "React Hooks", "amount": 3 }
Retorna: { data: { questions: [{ question, options, answer }] } }
```

---

## Lendo o código linha por linha

### Parte 1 — O Schema Zod

```ts
const questionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    })
  ),
})
```

**O que é Zod?**
Zod é uma biblioteca de validação. Você define o "formato esperado" e ele
verifica se os dados recebidos batem com esse formato.

**Por que usar aqui?**
O LLM retorna TEXTO. Você quer um OBJETO JavaScript.
Mesmo pedindo JSON no prompt, o LLM pode retornar:
- Com markdown: ` ```json { ... } ``` `
- Com texto extra: `"Aqui estão as questões: {...}"`
- Formato errado: campo com nome diferente

O Zod valida que o JSON tem exatamente o formato que você precisa.
Se não tiver, ele lança um erro antes de mandar pro frontend.

---

### Parte 2 — O generateText

```ts
const { text } = await generateText({
  model: groq('llama-3.1-8b-instant'),
  system: `Você é um gerador de questões de múltipla escolha. 
  Responda ESTRITAMENTE com um JSON no formato: {...}
  Não adicione explicações ou markdown.`,
  prompt: `Gere ${amount || 1} questões sobre ${topic || 'Tecnologia'}`,
})
```

**`generateText`** = manda uma pergunta pro LLM e espera a resposta completa.

Tem 3 partes:
- `model` → qual modelo usar (llama-3.1-8b-instant = rápido e barato)
- `system` → instrução de comportamento (quem a IA é, como responder)
- `prompt` → a pergunta/tarefa específica

**`system` vs `prompt` — qual a diferença?**

| system | prompt |
|--------|--------|
| Define quem a IA é | Define o que pedir agora |
| Persiste em toda conversa | Muda a cada request |
| "Você é um gerador de questões" | "Gere 3 questões sobre React" |

**O `await` é obrigatório aqui** porque `generateText` é assíncrono —
você precisa esperar o LLM processar e devolver a resposta.

---

### Parte 3 — Limpeza e Parse

```ts
const cleanText = text.replace(/```json|```/g, "").trim()
const jsonResponse = JSON.parse(cleanText)
const validatedData = questionSchema.parse(jsonResponse)
```

**Por que limpar o texto?**
Mesmo pedindo JSON puro no system prompt, o LLM às vezes retorna:
```
```json
{ "questions": [...] }
```
```
O `.replace(/```json|```/g, "")` remove esses marcadores de markdown.
O `.trim()` remove espaços em branco no início e fim.

**JSON.parse** converte a string `'{"questions": [...]}` em objeto JavaScript.

**questionSchema.parse** valida que o objeto tem o formato correto.
Se o campo `answer` vier como `ans` por exemplo, o Zod lança erro aqui.

---

### O que você aprende com essa rota

- `generateText` = pede texto pro LLM e recebe tudo de uma vez
- `system` define o comportamento, `prompt` define a tarefa
- Zod valida que o output tem o formato esperado
- Sempre precisar "limpar" o texto antes de fazer parse JSON

---

---

# AULA 2 — forum/route.ts

## O que ela faz?
Recebe uma pergunta E opcionalmente uma imagem (print de código/erro),
manda tudo pro LLM, e retorna uma resposta em linguagem natural.

**Exemplo de uso:**
```
POST /api/aula/forum
Body: { "question": "Por que esse erro aparece?", "image": "data:image/png;base64,..." }
Retorna: { answer: "Faala dev, beleza? O erro aparece porque..." }
```

---

## O que é diferente da Aula 1?

Duas coisas novas: **mensagens com role** e **multimodal (imagem + texto)**.

### Mensagens com role

```ts
const { text } = await generateText({
  model: groq(MODEL_ID),
  system: `...`,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: question || "Analise este print para mim." },
        ...(image ? [{ type: 'image' as const, image: image }] : []),
      ],
    },
  ],
})
```

**Por que `messages` em vez de `prompt`?**

`prompt` é pra casos simples (uma pergunta direto).
`messages` é pra quando você quer controle total — definir quem disse o quê.

Cada mensagem tem um `role`:
- `role: 'user'` → o que o usuário enviou
- `role: 'assistant'` → o que a IA respondeu (pra histórico)
- `role: 'system'` → instrução de comportamento (equivalente ao `system`)

---

### Multimodal — texto + imagem

```ts
content: [
  { type: 'text', text: question },
  ...(image ? [{ type: 'image' as const, image: image }] : []),
]
```

**O que é multimodal?**
Mandar mais de um tipo de dado pro modelo ao mesmo tempo.
Aqui: texto + imagem juntos.

**Como funciona o `...spread`?**
```ts
...(image ? [{ type: 'image', image }] : [])
```
- Se `image` existe → adiciona o objeto de imagem no array
- Se `image` não existe → adiciona um array vazio (nada)

Resultado:
- Com imagem: `content = [{ type: 'text' }, { type: 'image' }]`
- Sem imagem: `content = [{ type: 'text' }]`

**O `as const`** é TypeScript dizendo "esse valor é literalmente a string
'image', não qualquer string". Necessário porque o tipo do SDK é estrito.

---

### MODEL_ID como constante

```ts
const MODEL_ID = 'openai/gpt-oss-120b'
```

**Por que criar uma constante?**
Se o modelo for descontinuado (já aconteceu com a Groq), você muda em
um lugar só em vez de caçar em todo o arquivo.
É um hábito de código profissional: centralizar valores que podem mudar.

---

### O que você aprende com essa rota

- `messages` com `role` dá controle total sobre a conversa
- Multimodal = mandar texto + imagem juntos pro modelo
- Nem todo modelo suporta imagem (precisa ser "vision")
- Centralizar MODEL_ID como constante é boa prática

---

---

# AULA 3 — chat/route.ts

## O que ela faz?
É um chat em tempo real. O usuário manda mensagens, o modelo responde
enquanto ainda está "digitando" — letra por letra, igual ao ChatGPT.

**O que é diferente das aulas anteriores?**
- `streamText` em vez de `generateText` (streaming vs resposta completa)
- `convertToModelMessages` (converte formato do frontend pra IA)
- `toUIMessageStreamResponse()` (empacota o stream pro hook useChat)

---

## Lendo o código

```ts
import { convertToModelMessages, streamText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request: Request) {
  const { messages } = await request.json()
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: groq('llama-3.1-8b-instant'),
    system: 'Você é um agente que apenas responde questões de programação.',
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
```

---

### generateText vs streamText

Esta é a diferença mais importante de entender:

```
generateText → espera a resposta COMPLETA antes de retornar
streamText   → retorna a resposta PEDAÇO POR PEDAÇO em tempo real
```

**Analogia:**
- `generateText` = você pede uma pizza, espera 30 min, come tudo de uma vez
- `streamText` = você pede uma pizza, come cada fatia conforme sai do forno

**Por que streaming é melhor pra chat?**
1. O usuário vê que algo está acontecendo imediatamente
2. Para respostas longas (30s de espera) o usuário não fica olhando tela branca
3. Parece mais natural — igual a uma pessoa digitando

**Por que não usar streaming pra tudo?**
Quando você precisa processar a resposta (parse JSON, validar com Zod,
salvar no banco), você precisa da resposta COMPLETA primeiro.
Aí usa `generateText`.

---

### convertToModelMessages

```ts
const { messages } = await request.json()
const modelMessages = await convertToModelMessages(messages)
```

**Por que precisa converter?**

O frontend usa o hook `useChat` que guarda mensagens no formato **UIMessage**:
```ts
// O que chega do frontend (UIMessage)
{ id: "abc123", role: "user", content: "Como funciona useEffect?" }
```

O LLM espera mensagens no formato **ModelMessage**:
```ts
// O que o modelo precisa
{ role: "user", content: [{ type: "text", text: "Como funciona useEffect?" }] }
```

`convertToModelMessages` faz essa tradução automaticamente.
É assíncrona porque pode processar conteúdo complexo (imagens, arquivos).

---

### toUIMessageStreamResponse

```ts
return result.toUIMessageStreamResponse()
```

**O que faz?**
Empacota o stream num formato especial que o hook `useChat` do frontend
consegue ler e exibir em tempo real.

Sem isso, o frontend receberia dados "brutos" do stream e teria que
parsear manualmente. Essa função cuida de tudo.

**O fluxo completo:**
```
Frontend (useChat) 
  → POST /api/aula/chat com messages[]
  → Backend recebe, converte, chama streamText
  → streamText gera tokens um por um
  → toUIMessageStreamResponse formata os tokens
  → Frontend (useChat) recebe e exibe em tempo real
```

---

### Não tem await no streamText

```ts
// Veja: NÃO tem await aqui
const result = streamText({ ... })
return result.toUIMessageStreamResponse()
```

**Por que não tem await?**
`generateText` você espera (`await`) pra ter o texto completo.
`streamText` você NÃO espera — você retorna o stream diretamente.
O `await` "quebraria" o streaming, esperaria tudo chegar e aí mandaria.

---

### O que você aprende com essa rota

- `streamText` retorna em tempo real (sem await)
- `generateText` retorna completo (com await)
- O frontend manda `UIMessage[]`, o modelo precisa de `ModelMessage[]`
- `convertToModelMessages` faz a conversão
- `toUIMessageStreamResponse()` empacota o stream pro `useChat` consumir

---

---

# RESUMO GERAL — As 3 Aulas

| | example | forum | chat |
|---|---|---|---|
| **Função** | `generateText` | `generateText` | `streamText` |
| **Input** | `prompt` | `messages` com imagem | `messages` com histórico |
| **Output** | Texto completo | Texto completo | Stream em tempo real |
| **Conceito novo** | Zod + JSON parse | Multimodal | Streaming |
| **Quando usar** | Gerar dados estruturados | Análise com imagem | Chat interativo |

---

## A progressão lógica

```
Aula 1 (example)
  → Você aprende: como pedir texto pro LLM e validar o output
  
Aula 2 (forum)  
  → Você aprende: como mandar texto + imagem juntos
  
Aula 3 (chat)
  → Você aprende: como fazer um chat em tempo real com histórico
```

Cada aula adiciona um conceito novo em cima da anterior.
Quando você dominar os 3, já tem a base pra construir qualquer
aplicação com IA: geradores, assistentes, chatbots, agentes.

---

## Próximos passos (depois de entender as 3 aulas)

1. **Tools** — deixar o modelo chamar funções do seu código
2. **maxSteps** — agente que itera múltiplas vezes até resolver
3. **RAG** — buscar contexto relevante antes de chamar o modelo
4. **Memory** — o modelo lembrar do usuário entre sessões

---

---

# Por que aprender isso sendo Junior? — Mercado e Carreira

## O problema do mercado junior em SP hoje

O mercado junior em SP em 2026 está competitivo para quem é genérico.
Centenas de pessoas sabem fazer CRUD com Node.js e TypeScript.
Isso já não é diferencial — é o básico esperado.

**O que te separa da maioria:**

| O que você tem | A maioria do junior tem? |
|---|---|
| TypeScript + Next.js | sim |
| PostgreSQL + Prisma | parcial |
| IA integrada em produto | não — raridade |
| Projeto em hackathon (2° lugar) | não — raridade |
| Redis + BullMQ (fila) | não — raridade |
| Deploy real (Vercel + Railway) | parcial |

Você já tem projetos com IA rodando em produção (Bugless, Hone, AlltiControl).
Não é teoria — é portfólio real.

---

## Tipos de vaga que você pode mirar em SP

**Mais acessíveis agora:**
- Startups de produto (fintech, edtech, healthtech) — adoram Next.js + TypeScript
- Empresas que estão "adicionando IA" ao produto — seu diferencial máximo
- Agências digitais — precisam de fullstack rápido

**Empresas em SP que usam essa stack:**
Hotmart, Conta Simples, Pagar.me, Loggi, QuintoAndar, Creditas, Nubank
e startups do ecossistema Rocketseat/Alura.

---

## Salário real para SP (2026)

| Perfil | CLT | PJ |
|---|---|---|
| Junior genérico (CRUD, React) | R$ 2.500 - R$ 4.000 | R$ 3.000 - R$ 5.000 |
| Junior com IA + TypeScript + deploy | R$ 4.000 - R$ 6.500 | R$ 5.000 - R$ 8.000 |
| Após 1 ano evoluindo o roadmap | R$ 7.000 - R$ 12.000 | R$ 9.000 - R$ 15.000 |

---

## O que fazer agora pra aumentar as chances

**1. GitHub com commits consistentes**
Recrutador olha seu GitHub. Commits toda semana mostra que você está ativo.

**2. README dos projetos em inglês, bem escritos**
Projeto sem README não existe pra quem olha de fora.
Explica: o que é, como rodar, o que você aprendeu.

**3. Deploy de tudo**
Projeto sem URL não conta. Vercel é grátis — coloca tudo no ar.

**4. LinkedIn atualizado com os projetos de IA**
"Desenvolveu chat em tempo real com Vercel AI SDK e LangGraph" chama
mais atenção que "trabalhou com React".

---

## Resumo direto

Você está no lugar certo, na hora certa, com a stack certa.
O conhecimento você já está construindo aqui.
O que falta é colocar os projetos no ar com README bom
e aparecer onde os recrutadores olham.
