import { createGroq } from "@ai-sdk/groq"; // Importação do pacote
import { generateText } from "ai";
import { NextResponse } from "next/server";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    const result = await generateText({
     
      model: groq('llama-3.3-70b-versatile'), 
      system: "Você é um assistente de IA humorístico",
      prompt: 'Quanto que é 2+2'
    });

    return NextResponse.json({ message: result.text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro na IA" }, { status: 500 });
  }
}