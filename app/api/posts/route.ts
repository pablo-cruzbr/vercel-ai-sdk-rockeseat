import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { nome, cargo, stack, projetos, objetivo, tom } = await request.json();

  const prompt = `Gere exatamente 5 posts para LinkedIn baseados no perfil abaixo.

PERFIL:
- Nome: ${nome}
- Cargo: ${cargo}
- Stack: ${stack}
- Projetos e conquistas: ${projetos}
- Objetivo: ${objetivo}
- Tom desejado: ${tom}

INSTRUÇÕES:
- Cada post deve ter um ângulo diferente (conquista técnica, aprendizado, projeto, mindset, busca por oportunidade)
- Posts diretos, sem clichês de LinkedIn como "humilde", "abençoado", "jornada"
- Entre 3 e 8 parágrafos curtos por post
- Incluir hashtags relevantes no final de cada post
- Linguagem em português do Brasil
- Basear no que a pessoa realmente construiu, não inventar
- Tom ${tom}

FORMATO DE RESPOSTA (obrigatório):
Retorne apenas um JSON válido neste formato, sem texto adicional antes ou depois:
{"posts": ["post 1 completo aqui", "post 2 completo aqui", "post 3 completo aqui", "post 4 completo aqui", "post 5 completo aqui"]}`;

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    prompt,
    temperature: 0.8,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: "Falha ao parsear resposta da IA" }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return Response.json(parsed);
}
