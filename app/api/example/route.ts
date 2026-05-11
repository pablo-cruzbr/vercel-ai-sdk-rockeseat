import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    // 1. Captura os parâmetros (com fallback para não quebrar se vier vazio)
    const body = await request.json().catch(() => ({}));
    const { topic, amount } = body;

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: `Você é um gerador de questões de múltipla escolha. 
      Responda ESTRITAMENTE com um JSON no formato: {"questions": [{"question": "...", "options": ["...", "..."], "answer": "..."}]}
      Não adicione explicações ou markdown.`,
      prompt: `Gere ${amount || 1} questões sobre ${topic || 'Tecnologia'}` ,
    });

    // 2. Limpeza e Parse
    const cleanText = text.replace(/```json|```/g, "").trim();
    const jsonResponse = JSON.parse(cleanText);

    // 3. Validação Zod
    const validatedData = questionSchema.parse(jsonResponse);

    return NextResponse.json({ data: validatedData });

  } catch (error: any) {
    console.error("Erro detalhado:", error);

    return NextResponse.json(
      { 
        error: "Erro no parse ou na IA", 
        details: error.message || "Erro desconhecido" 
      },
      { status: 500 }
    );
  }
}