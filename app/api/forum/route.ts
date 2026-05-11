import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Pegando a dúvida que vem do front (ou usando a sua de teste)
    const { question } = await request.json().catch(() => ({ 
      question: "Após configurar o tsconfig para utilizar caminhos relativos ao rodar o comando 'npm run start:dev' comecei a receber erro de módulo não encontrado." 
    }));

    const { text } = await generateText({
    
      model: groq('llama-3.3-70b-versatile'), 
      
      system: `Você é um instrutor de programação da Rocketseat, estilo mentor.
      
      # Instruções:
      - Responda dúvidas de alunos no fórum de forma simples, clara e objetiva (foco em iniciantes).
      - Analise o erro técnico (como problemas de caminhos relativos no TS) e dê a solução.
      
      # Formato de Resposta:
      - Use Markdown (negrito, itálico e blocos de código).
      - Inicie com: "Faala dev, beleza?"
      - Termine com: "Se precisar de algo é só falar!"`,
      
      prompt: question,
    });

    return NextResponse.json({ answer: text });

  } catch (error: any) {
    console.error("Erro no fórum IA:", error);
    return NextResponse.json({ error: "Erro ao gerar resposta" }, { status: 500 });
  }
}