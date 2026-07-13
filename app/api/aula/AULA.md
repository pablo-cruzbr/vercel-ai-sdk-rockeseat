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

Você já tem projetos com IA rodando em produção (Bugless, Hone, FIreOS).
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

---

---

# Esse é um bom começo pra quem quer trabalhar com LLM e RAG?

**Resposta direta: sim. E você já está no caminho certo.**

Mas deixa eu explicar o porquê de forma honesta.

---

## O que você já tem depois dessas 3 aulas

Quando você dominar as 3 rotas dessa pasta, você vai saber:

- Chamar um LLM e receber texto (`generateText`)
- Controlar o comportamento da IA com `system` e `prompt`
- Mandar texto + imagem pro modelo (multimodal)
- Fazer um chat em tempo real com histórico (`streamText`)
- Conectar backend com frontend via `useChat`

Isso é a **fundação**. Todo projeto com LLM — simples ou complexo — começa aqui.
Sem entender isso bem, RAG e agentes não fazem sentido.

---

## Onde o LLM termina e o RAG começa

Olha esse problema real:

> Você tem um assistente de chat (Aula 3).
> O usuário pergunta: "Quais OS abertas temos hoje?"
> O LLM não sabe — ele não tem acesso ao seu banco.
> Ele vai **inventar** uma resposta. Isso se chama alucinação.

**LLM puro** = inteligente, mas cego pro seu sistema.

Para resolver isso existem duas abordagens:

```
Tool Calling (próximo passo após as aulas)
  → O modelo decide: "preciso de dados" → chama uma função → você busca no banco
  → Exemplo: você já fez isso no FIreOS

RAG — Retrieval Augmented Generation (depois do Tool Calling)
  → Antes de chamar o modelo, você busca documentos relevantes
  → Injeta esses documentos no prompt como contexto
  → O modelo responde com base nos seus dados
```

**A diferença:**

| | Tool Calling | RAG |
|---|---|---|
| Quando busca | O modelo decide | Sempre, antes de chamar o modelo |
| Tipo de busca | Query exata (SQL) | Busca por significado (embeddings) |
| Bom pra | Dados estruturados (banco) | Documentos, textos, artigos |
| Complexidade | Médio | Maior |

---

## A progressão real pra trabalhar com LLM/RAG

```
ONDE VOCÊ ESTÁ AGORA
  → Aulas 1, 2, 3 — fundação com Vercel AI SDK ✓

PRÓXIMO PASSO (1-2 meses)
  → Tool Calling: modelo chama funções do seu código
  → maxSteps: agente que itera até resolver
  → Você já viu isso no FIreOS — agora aprender do zero

DEPOIS (2-3 meses)
  → Embeddings: transformar texto em vetores numéricos
  → pgvector: buscar por significado no PostgreSQL
  → RAG básico: buscar contexto antes de chamar o LLM

AVANÇADO (4-6 meses)
  → RAG híbrido: keyword + semântica
  → Agentes autônomos com múltiplas tools
  → Memory: IA que lembra do usuário
```

---

## Por que começar por aqui e não direto pelo RAG?

Muita gente erra essa ordem — quer pular pro RAG sem ter a base.

O RAG usa `generateText` por baixo.
O agente usa `streamText` + `tools`.
Sem entender as 3 aulas, você vai copiar código sem saber o que está fazendo.

**Analogia:**
RAG é como dirigir na estrada. Mas primeiro você precisa saber ligar o carro,
engatar a marcha, e andar devagar. Essas 3 aulas são exatamente isso.

---

## Resposta final

> "Esse é um bom começo pra mim que sou fullstack junior e quero trabalhar com LLM e RAG?"

**Sim. É o melhor começo possível dado quem você é.**

Você já sabe TypeScript, Next.js, PostgreSQL e Prisma.
Isso significa que quando chegar no RAG, você não vai travar no banco ou nas queries.
Você já vai dominar a infra — só vai precisar aprender a parte de IA.

A maioria das pessoas que estudam RAG trava porque não sabe TypeScript bem.
Você não vai ter esse problema.

Siga a ordem:
1. Dominar essas 3 aulas → 2. Tools → 3. Embeddings → 4. RAG
e em 3 meses você vai ter condição de contribuir em projetos reais com IA.

---

---

# Roadmap AI Engineering 2026 — Adaptado pra sua stack

> Baseado no roadmap do @matheus.olivsv, readaptado pra quem é
> fullstack TypeScript/Next.js e não quer virar ML Engineer —
> quer **construir produto com IA**.

---

## Passo 0 — Linguagem

O roadmap original pede Python. **Você já tem TypeScript — isso é vantagem.**

No ecossistema TypeScript pra IA, o Vercel AI SDK cobre o que Python
cobre com LangChain. A lógica é a mesma, a sintaxe é diferente.

| Se você quer... | Faz o quê |
|---|---|
| Construir produto com IA | TypeScript + Vercel AI SDK ← você está aqui |
| Trabalhar em empresa que usa Python | Aprender Python depois do TS |
| Treinar modelos (ML Engineer) | Python + PyTorch — outro caminho |

**Meta:** conseguir ler código Python de tutorial e traduzir a lógica pra TypeScript.
Não precisa dominar Python agora — só não travar quando ver um exemplo em Python.

---

## Passo 1 — Você já escolheu o caminho certo

O roadmap define 3 caminhos. O seu é claro:

```
AI Engineering (produto)
  → API, RAG, agentes, contexto, deploy de produto com LLM
  → Não treina modelo, usa modelo pronto
  → É exatamente o que esse projeto (vercel-ai-sdk-rockeseat) ensina
```

Software engineering clássico (auth, banco, deploy, testes) você já tem.
**O diferencial é dominar os passos 2 a 5 abaixo.**

---

## Passo 2 — Fundamentos de LLM (alto nível)

Sem virar matemático. Você precisa de **intuição**, não de prova.

**O que dominar:**

**Tokens**
O modelo não lê palavras — lê pedaços de palavras chamados tokens.
"programação" = ~3 tokens. Você paga por token. Contexto é limitado em tokens.

**Embedding**
Texto transformado em vetor numérico. Textos com significado parecido
ficam "próximos" no espaço vetorial. É a base do RAG.
```
"como instalar React" → [0.23, -0.45, 0.12, ...]
"tutorial setup React" → [0.21, -0.43, 0.11, ...]  ← próximos!
"receita de bolo"      → [0.95, 0.33, -0.67, ...]  ← longe
```

**Transformer (básico)**
Arquitetura que permite ao modelo "prestar atenção" nas palavras certas.
Não precisa implementar — só saber que existe e por que importa.

**Prompt**
Consequência dos fundamentos acima. Quando você entende tokens e atenção,
o prompt engineering deixa de ser magia e vira lógica.

**Onde estudar:**
- DeepLearning.AI — "Generative AI for Everyone" (gratuito)
- Hugging Face — NLP Course (gratuito)
- Livro referência: "AI Engineering" — Chip Huyen

**Meta:** explicar em 2 minutos como palavra vira número e como o modelo gera texto.

---

## Passo 3 — API na prática (você já começou aqui)

Antes de framework, chame a API na mão. **Você já fez isso nessas 3 aulas.**

**O que você já domina:**
- ✓ Request com streaming (ver token chegando) — Aula 3
- ✓ Estrutura de resposta com `role` (human / assistant) — Aula 2
- ✓ Tool calling — você viu no AlltiControl
- ✓ Output estruturado com Zod — Aula 1
- ✓ Imagem (multimodal) — Aula 2

**O que ainda falta nessa etapa:**
- [ ] Chamar a API crua uma vez sem o SDK (entender o que o SDK abstrai)
- [ ] Áudio (saber que existe, não precisa dominar agora)

**Meta desta etapa:** script local que streama resposta e chama uma tool fake.
Você quase chegou — falta só implementar uma tool de verdade.

---

## Passo 4 — LangChain e LangGraph (o que são e pra que servem)

> O roadmap recomenda LangChain + LangGraph.
> Você não usou nenhum dos dois diretamente — o Guilherme implementou
> no Hone, mas você não tocou nessa parte. Então vamos do zero.

---

### LangChain — o que é?

LangChain é um framework pra construir aplicações com LLMs.

**Problema que resolve:**
Sem LangChain, pra cada provider (Groq, OpenAI, Gemini) você escreve
um código diferente. Com LangChain, você escreve uma vez e funciona
com qualquer modelo.

**Analogia:** LangChain é pra LLMs o que o Prisma é pra bancos de dados.
O Prisma abstrai MySQL, PostgreSQL, SQLite — você escreve a mesma query.
O LangChain abstrai Groq, OpenAI, Gemini — você escreve o mesmo código.

**Em Python (o mais comum nos tutoriais):**
```python
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

# Troca de provider = troca de uma linha
model = ChatOpenAI(model="gpt-4o")
# model = ChatGroq(model="llama-3.1-8b-instant")

response = model.invoke("O que é RAG?")
print(response.content)
```

**No seu mundo TypeScript, o Vercel AI SDK faz o mesmo papel:**
```ts
// Vercel AI SDK = equivalente ao LangChain, mas em TypeScript
import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const { text } = await generateText({ model: groq("llama-3.1-8b-instant"), prompt: "O que é RAG?" })
```

**Você já usa o equivalente TypeScript do LangChain sem saber.**

---

### O que o LangChain tem além do básico?

LangChain também resolve:

- **Chains:** encadear várias chamadas ao LLM em sequência
  ```
  Prompt 1 → LLM → resultado → Prompt 2 (com resultado anterior) → LLM → resposta final
  ```

- **Memory:** salvar histórico de conversa automaticamente

- **Document loaders:** carregar PDFs, páginas web, CSV pra dentro do LLM

- **Text splitters:** dividir documentos grandes em chunks (essencial pra RAG)

- **Retrievers:** buscar documentos relevantes por embedding (também essencial pra RAG)

No Vercel AI SDK você implementa tudo isso manualmente — o LangChain
entrega pronto. Pra aprender, o SDK é mais didático. Em produção
com Python, LangChain acelera muito.

---

### LangGraph — o que é?

LangGraph é uma extensão do LangChain pra construir **agentes com estado**.

**Problema que resolve:**
Um LLM sem estado responde e esquece. Cada request é independente.
O LangGraph cria um **grafo de estados** onde o agente lembra onde
está no fluxo e pode tomar decisões diferentes dependendo do estado atual.

**O que é um grafo de estados?**

Pensa num fluxograma. Cada caixinha é um "nó" (uma ação). As setas
são as transições entre estados.

```
[START]
   |
   v
[entrevistar_candidato]  ←─────────────────┐
   |                                        |
   | (respondeu?)                           |
   v                                        |
[avaliar_resposta] ──→ (precisa de mais?) ──┘
   |
   | (suficiente)
   v
[gerar_feedback]
   |
   v
[END]
```

No projeto Hone, o Guilherme usou LangGraph exatamente assim:
- Nó `interviewer`: faz perguntas
- Nó `closing_feedback`: gera o feedback final
- Nó `review_items_generator`: gera a lista de estudo
- O grafo controla a transição entre eles

**Por que LangGraph e não só um loop?**

Com um loop simples, se o servidor reiniciar, você perde o estado.
O LangGraph salva o estado no banco (PostgreSQL no Hone) entre requests.
Isso se chama **checkpointing** — o agente "lembra" exatamente onde parou.

---

### Vercel AI SDK vs LangChain vs LangGraph — quando usar cada um?

| Situação | Use |
|---|---|
| Chat simples em TypeScript/Next.js | Vercel AI SDK |
| Agente com tools em TypeScript | Vercel AI SDK + `maxSteps` |
| Projeto em Python | LangChain |
| Agente com fluxo complexo e estado | LangGraph JS |
| Pipeline RAG em Python | LangChain |
| Pipeline RAG em TypeScript | Vercel AI SDK + pgvector manual |

**Resumo prático pra você agora:**
Vercel AI SDK resolve tudo que você precisa em TypeScript.
LangChain/LangGraph você vai encontrar em bases de código Python —
importante saber ler e entender o conceito, não necessariamente implementar.

---

### Como o `maxSteps` do Vercel AI SDK substitui o LangGraph básico

No Hone, o LangGraph controlava o fluxo da entrevista com um grafo.
No Vercel AI SDK, o `maxSteps` faz algo parecido de forma mais simples:

```ts
const result = streamText({
  model: groq('llama-3.1-8b-instant'),
  messages: modelMessages,
  maxSteps: 5,  // o modelo pode iterar até 5x antes de responder
  tools: {
    buscarDados: tool({
      description: 'Busca dados no banco',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        // busca no banco e retorna
        return `Resultado: ${query}`
      }
    })
  }
})
```

Com `maxSteps: 5`, o modelo pode:
1. Decidir chamar `buscarDados`
2. Receber o resultado
3. Decidir chamar `buscarDados` de novo com outra query
4. Receber o resultado
5. Finalmente responder ao usuário

Isso é um **agente simples** — sem precisar do LangGraph.
LangGraph entra quando o fluxo é mais complexo (múltiplos nós,
estado persistente entre requests, lógica condicional sofisticada).

---

**O que dominar:**
- Entender o conceito de LangChain (abstração de provider)
- Entender o conceito de LangGraph (grafo de estados com checkpointing)
- Implementar agente simples com `maxSteps` + `tools` no Vercel AI SDK
- Saber ler código LangChain em Python sem travar

**Onde estudar:**
- LangChain Academy (gratuito) → academy.langchain.com
- Docs Vercel AI SDK → sdk.vercel.ai/docs/ai-sdk-core/agents
- LangGraph JS → langchain-ai.github.io/langgraphjs

**Meta:** chatbot com 1 tool funcionando localmente usando `maxSteps`.
Esse é o próximo exercício concreto após dominar as 3 aulas desta pasta.

---

### Redis e BullMQ — o que são e pra que servem no contexto de IA

O Guilherme também usou Redis e BullMQ no Hone. Você não implementou,
então vamos entender os conceitos do zero.

---

#### Redis

Redis é um banco de dados **em memória** (RAM) — extremamente rápido.

**Por que em memória?**
Um banco normal (PostgreSQL) salva no disco. Ler do disco leva ~5ms.
O Redis salva na RAM. Ler da RAM leva ~0.1ms. É 50x mais rápido.

**O que isso tem a ver com IA?**

Quando você usa BullMQ (abaixo), ele precisa de um lugar pra armazenar
as filas de processamento. O Redis é esse lugar — por ser rápido,
o BullMQ consegue verificar a fila constantemente sem sobrecarregar.

**Outros usos do Redis em projetos com IA:**
- Cache de respostas (se 100 pessoas perguntarem a mesma coisa, responde do cache)
- Rate limiting (limitar quantas chamadas ao LLM por usuário/minuto)
- Sessões de usuário (guardar contexto temporário)

**Analogia:**
PostgreSQL = arquivo físico numa gaveta (organizado, durável, mais lento)
Redis = bloco de rascunho na mesa (temporário, rapidíssimo de acessar)

---

#### BullMQ

BullMQ é uma biblioteca de **filas de processamento em background**.

**Problema que resolve:**

Imagina que o usuário faz upload de um PDF de currículo (como no Hone).
Processar esse PDF com IA demora 5-10 segundos.

**Sem BullMQ:**
```
Usuário faz upload
  → servidor começa a processar (5-10s)
  → usuário fica esperando olhando tela branca
  → servidor pode dar timeout
  → experiência péssima
```

**Com BullMQ:**
```
Usuário faz upload
  → servidor retorna IMEDIATAMENTE: { status: "processing" }
  → BullMQ coloca o job na fila do Redis
  → Worker pega o job da fila e processa em background
  → Quando termina, atualiza o banco: { status: "completed" }
  → Frontend faz polling e descobre que terminou
```

O usuário não espera. O processamento acontece nos bastidores.

**Analogia:**
Sem BullMQ = lanchonete onde o atendente cozinha na sua frente (você espera)
Com BullMQ = restaurante onde o garçom anota o pedido e a cozinha prepara
             em paralelo enquanto você conversa (você não espera)

**Como funciona no código (simplificado):**

```ts
// 1. Na rota de upload (resposta imediata)
export async function POST(request: Request) {
  const file = await request.formData()

  // Salva o arquivo no storage
  await storage.upload(file)

  // Adiciona na fila — não processa agora
  await resumeQueue.add('process-resume', { resumeId: '123' })

  // Retorna imediatamente, sem esperar o processamento
  return Response.json({ status: 'processing' })
}

// 2. No Worker (roda em background, separado da API)
const worker = new Worker('resume-queue', async (job) => {
  // Esse código roda quando o BullMQ pega o job da fila
  const text = await extractTextFromPDF(job.data.resumeId)
  const summary = await generateText({ model: groq('llama-3.1-8b-instant'), prompt: text })
  await database.update({ resumeId: job.data.resumeId, summary, status: 'completed' })
})
```

**Por que isso importa pra IA especificamente?**

Chamadas ao LLM são lentas (1-30 segundos dependendo do modelo e tamanho).
Em qualquer app de IA que processa documentos, imagens, ou faz tarefas
pesadas em background, BullMQ + Redis é o padrão profissional.

---

**Resumo Redis + BullMQ:**

| | Redis | BullMQ |
|---|---|---|
| O que é | Banco em memória (RAM) | Biblioteca de filas |
| Pra que serve | Storage rápido pra filas e cache | Processar tarefas em background |
| Dependência | Independente | Precisa do Redis pra funcionar |
| Quando usar | Cache, sessões, rate limiting | Upload + IA lenta, emails, relatórios |
| Alternativa simples | - | Vercel Background Functions, Trigger.dev |

**Você não precisa saber implementar isso agora.**
Mas quando seu projeto tiver que processar algo demorado sem travar a UI,
você vai saber que a solução chama BullMQ + Redis.

---

### Node.js — seu papel nessa stack toda

Você tem Node.js, e isso importa mais do que parece nesse contexto.

**O que é Node.js nessa stack:**
Node.js é o runtime que executa TypeScript/JavaScript no servidor.
Quando você roda `bun run dev` ou `npm run dev`, por baixo tem Node.js
(ou Bun, que é compatível) executando o seu código.

**Por que importa pra IA:**

Tudo que você faz nas rotas `/api/aula/*` roda em Node.js:
```
Requisição chega
  → Next.js roteia pra sua route.ts
  → Node.js executa o código
  → Vercel AI SDK chama a API da Groq
  → Node.js recebe o stream
  → Resposta vai pro browser
```

**Node.js + IA — casos de uso reais:**

```
1. API Server (o que você já faz)
   → Express / Next.js rodando em Node.js
   → Recebe request, chama LLM, retorna resposta

2. Workers em background (BullMQ)
   → Node.js rodando separado da API
   → Processa PDFs, gera embeddings, chama LLM em batch

3. Scripts de ingestão (RAG)
   → Script Node.js que lê arquivos, gera embeddings, salva no banco
   → Roda uma vez pra "alimentar" o vector store

4. Webhooks
   → Node.js recebe evento externo (GitHub PR aberto, email chegou)
   → Dispara processamento com IA automaticamente
```

**Sua vantagem sobre quem vem do Python:**
Devs Python que migram pra IA precisam aprender Node.js pra fazer frontend
e deploy moderno. Você já tem isso — só precisa aprender a camada de IA.

**Stack completa que você tem hoje:**

```
Browser (React/Next.js)
    ↕
Node.js / Next.js API Routes  ← você domina isso
    ↕
Vercel AI SDK → Groq / OpenAI / Gemini  ← aprendendo agora
    ↕
PostgreSQL + Prisma  ← você domina isso
    ↕
Redis + BullMQ (background)  ← você viu no Hone, aprende depois
```

Você já tem as camadas de cima e de baixo.
O que está aprendendo agora é o **meio** — a camada de IA.

---

## Passo 5 — Contexto, RAG e padrões de produto

Este é o passo que transforma dev em AI Engineer de produto.

**O que dominar:**

**Janela de contexto**
O modelo tem limite de tokens que consegue "ver" de uma vez.
Quando estoura → ele esquece o início da conversa.
Saber o que cabe, o que cortar, e como compactar é skill real.

**Pipeline RAG**
```
INGESTÃO (uma vez):
  documentos → chunks → embeddings → salva no pgvector

RETRIEVAL (a cada pergunta):
  pergunta → embedding → busca similar → top 5 chunks
  → injeta no prompt → modelo responde com contexto
```

- Chunk: dividir texto grande em pedaços menores (200-500 palavras)
- Quando usar RAG vs prompt direto: RAG pra docs grandes, prompt direto pra dados pequenos

**Memória**
- Curto prazo: thread atual (histórico de mensagens)
- Longo prazo: perfil do usuário salvo no banco entre sessões

**Padrões de entrevista e vaga:**
- MCP (Model Context Protocol) — protocolo pra conectar ferramentas externas
- Skills / Multi-agent — vários agentes com especialidades diferentes
- Human-in-the-Loop — aprovação antes de ações destrutivas

**Onde estudar:**
- RAG: DeepLearning.AI — "LangChain for LLM Application Development"
- MCP: modelcontextprotocol.io
- pgvector: github.com/pgvector/pgvector (você já usa Postgres — vantagem)

**Meta:** conseguir explicar como embeddingou um PDF de 80 páginas e buscou
partes relevantes sem mandar tudo no prompt.

---

## Passo 6 — Os erros que a maioria comete (não cometa)

| Erro comum | Por que trava |
|---|---|
| Pular direto pra "fazer um agente" | Não sabe o que acontece dentro. Tool call não vem. |
| Só tutorial de prompt | Não sabe o que acontece quando estoura o contexto |
| Framework sem API crua | Não consegue debugar quando algo quebra |
| RAG antes de embedding | Chunk e vetor viram caixa preta |
| LangGraph sem entender grafo | Copia código sem saber modificar |

**A ordem correta:**
```
Fundamentos LLM (Passo 2)
  → API na prática / Vercel AI SDK (Passo 3) ← você está aqui
    → Tools + maxSteps (Passo 4)
      → Contexto + RAG (Passo 5)
        → Produção (observabilidade, deploy, custo)
```

---

## Onde você está nesse roadmap hoje

```
✓ Passo 0 — Linguagem (TypeScript — domina)
✓ Passo 1 — Caminho escolhido (AI Engineering produto)
◑ Passo 2 — Fundamentos LLM (intuição OK, falta aprofundar embeddings)
◑ Passo 3 — API na prática (generateText, streamText, multimodal ✓ | tools falta implementar)
◑ Passo 4 — SDK + LangGraph (Vercel AI SDK iniciado ✓ | LangGraph via Hone ✓ | falta aprofundar)
○ Passo 5 — RAG e contexto (próximo grande passo)
○ Passo 6 — Produção (depois do RAG)
```

**Você está no meio do Passo 3 indo pro Passo 4.**
Mais avançado do que parece para um junior com 6 meses de experiência.
