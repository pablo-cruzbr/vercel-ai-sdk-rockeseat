# 🤖 Estudos de IA: Vercel AI SDK + Groq

Repositório de testes e aprendizados sobre a implementação de Agentes de IA utilizando o ecossistema Next.js e o provedor Groq.

---

## 📝 Teste 01: Geração de Texto Simples (`generateText`)

**Objetivo:** Validar a conexão com a API do Groq e testar a resposta criativa do modelo.

- **Método:** `generateText`
- **Stack:** `@ai-sdk/groq`, `Next.js App Router`
- **Resultado esperado:** Uma string de texto puro com a personalidade definida no `system`.

### Exemplo de Implementação
```typescript
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'), 
      system: "Você é um assistente de IA humorístico",
      prompt: 'Quanto que é 2+2'
    });
````

## 📊 Teste 02: Agente Gerador de Objetos (`generateObject`)

**Objetivo:** Gerar dados estruturados e tipados (JSON) que podem ser consumidos diretamente pela aplicação, eliminando a necessidade de tratar a resposta como texto simples.

### ⚙️ Funcionamento
Diferente do `generateText`, o `generateObject` utiliza um schema (geralmente feito com **Zod**) para forçar a IA a seguir uma estrutura de dados rigorosa. Se a IA tentar enviar um campo faltando ou com tipo errado, o SDK barra a resposta.



### 💻 Implementação Técnica

```typescript
import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// 1. Definição da estrutura esperada (Schema)
const questionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    })
  ),
});

export async function POST() {
  const { object } = await generateObject({
    model: groq('llama-3.1-8b-instant'),
    output: 'object',
    schema: questionSchema,
    system: "Você é um gerador de questões técnico.",
    prompt: "Gere uma questão sobre TypeScript.",
  });

  // O 'object' já vem tipado conforme o questionSchema
  return Response.json(object);
}

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro na IA" }, { status: 500 });
  }
}
