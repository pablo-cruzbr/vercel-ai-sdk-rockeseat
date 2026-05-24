import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Centralizando o ID do modelo para facilitar a troca caso a Groq o desative novamente
const MODEL_ID = 'openai/gpt-oss-120b';

export async function POST(request: Request) {
  try {
    const { question, image } = await request.json().catch(() => ({}));

    console.log(">>> MODELO SENDO CHAMADO:", MODEL_ID);

    const { text } = await generateText({
      model: groq(MODEL_ID),
      system: `Você é um instrutor de programação da Rocketseat, estilo mentor.
      # Instruções:
      - Responda dúvidas de alunos de forma clara, objetiva e amigável.
      - Analise prints de código e erros enviados para dar a melhor solução.
      
      # Formato:
      - Inicie com: "Faala dev, beleza?"
      - Termine com: "Se precisar de algo é só falar!"`,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question || "Analise este print para mim, por favor." },
            ...(image ? [{ 
              type: 'image' as const, 
              image: image // Deve ser a URL ou Base64 (data:image/...)
            }] : []),
          ],
        },
      ],
    });

    return NextResponse.json({ answer: text });

  } catch (error: any) {
    console.error("ERRO NO SERVIDOR:", error.message);
    
    return NextResponse.json(
      { 
        error: "Erro ao gerar resposta", 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}