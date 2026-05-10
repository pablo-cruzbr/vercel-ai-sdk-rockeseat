import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai"; // Mudamos para generateText
import { NextResponse } from "next/server";
import { z } from "zod";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Definimos o schema fora para reutilizar no parse
const questionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `Você é um gerador de questões. 
      Responda ESTRITAMENTE com um JSON no formato: {"questions": [{"question": "...", "options": ["...", "..."], "answer": "..."}]}
      Não adicione explicações, saudações ou blocos de código markdown.`,
      prompt: 'Gere uma questão de múltipla escolha sobre quanto é 2+2.',
    });

    // 1. Limpeza de Markdown (caso a IA insista em mandar ```json)
    const cleanText = text.replace(/```json|```/g, "").trim();

    // 2. Parse manual
    const jsonResponse = JSON.parse(cleanText);

    // 3. Validação com o Schema que definimos antes
    const validatedData = questionSchema.parse(jsonResponse);

    return NextResponse.json({ data: validatedData });
  } catch (error) {
    console.error("Erro detalhado:", error);
    
    // Log para você ver no terminal o que a IA realmente mandou
    if (error instanceof SyntaxError) {
       console.log("A IA mandou um texto que não é JSON:", error);
    }

    return NextResponse.json(
      { error: "Erro no parse ou na IA", details: error },
      { status: 500 }
    );
  }
}