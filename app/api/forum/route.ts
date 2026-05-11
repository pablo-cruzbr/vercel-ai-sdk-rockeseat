import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { question, image } = await request.json();

    const { text } = await generateText({
      model: groq('llama-3.2-11b-vision-preview'), 
      
      system: `Você é um instrutor de programação da Rocketseat...`,
      
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question || "O que tem nesta imagem?" },
            ...(image ? [{ 
              type: 'image' as const, 
              image: image 
            }] : []),
          ],
        },
      ],
    });

    return NextResponse.json({ answer: text });

  } catch (error: any) {
    console.error("Erro no fórum IA:", error);
    return NextResponse.json({ error: "Erro ao gerar resposta", details: error.message }, { status: 500 });
  }
}