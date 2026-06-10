import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { nome, cargo, stack, projetos, objetivo, tom } = await request.json();

  const prompt = `Você vai escrever 5 posts para LinkedIn como se fosse ${nome} falando sobre sua própria carreira e projetos.

PERFIL:
- Nome: ${nome}
- Cargo: ${cargo}
- Stack: ${stack}
- Projetos e conquistas: ${projetos}
- Objetivo: ${objetivo}

REGRAS DE VOZ E ESTILO:
- Escreva em PRIMEIRA PESSOA como ${nome} contando sua própria história
- Use "eu", "a gente", "construí", "aprendi", "tive que resolver", "descobri na prática"
- Seja específico: cite projetos pelo nome, mencione tecnologias reais, problemas concretos
- Narrativa humana: "quando comecei a construir X, o maior problema foi...", "participei de uma hackathon onde precisávamos..."
- Mostre raciocínio e escolhas: por que usou essa tech, o que não funcionou, o que surpreendeu
- Pode mostrar vulnerabilidade real: "foi a primeira vez que trabalhei com X", "errei nessa parte e aprendi que..."
- Parágrafos curtos (1-3 linhas), linguagem direta e natural
- PROIBIDO: "humilde", "abençoado", "jornada incrível", "muito grato", "networking valioso", frases genéricas
- PROIBIDO inventar dados que não estão no perfil acima
- 3 a 5 hashtags relevantes no final de cada post
- Tom: ${tom}

CINCO POSTS com ângulos diferentes:
1. Uma conquista técnica específica com a história por trás
2. Um aprendizado real que mudou como você programa
3. Um projeto contado como narrativa: o problema, a solução, o que aprendeu
4. Mindset de desenvolvedor: algo que você viu no mercado e tem uma opinião sobre
5. Posicionamento direto: quem você é, o que construiu, o que quer

FORMATO (JSON puro, sem texto fora):
{"posts": ["post 1 completo", "post 2 completo", "post 3 completo", "post 4 completo", "post 5 completo"]}`;

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    prompt,
    temperature: 0.8,
  });

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no json");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.posts)) throw new Error("no posts array");
    const posts = parsed.posts.map(normalizePost).filter(Boolean);
    return Response.json({ posts });
  } catch {
    const fallback = text
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    return Response.json({ posts: fallback });
  }
}

function normalizePost(post: unknown): string {
  if (typeof post === "string") return post;
  if (post && typeof post === "object") {
    const p = post as Record<string, unknown>;
    const body = typeof p.text === "string" ? p.text : typeof p.content === "string" ? p.content : "";
    const tags = Array.isArray(p.hashtags)
      ? p.hashtags.map((h) => (String(h).startsWith("#") ? h : `#${h}`)).join(" ")
      : "";
    return tags ? `${body}\n\n${tags}` : body;
  }
  return String(post ?? "");
}
}
