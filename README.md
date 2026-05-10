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

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro na IA" }, { status: 500 });
  }
}
