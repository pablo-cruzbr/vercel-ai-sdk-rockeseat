import { convertToModelMessages, streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
    const { messages } = await request.json()

    const modelMessages = await convertToModelMessages(messages)

    const result = streamText({
        model: groq('llama-3.1-8b-instant'),
        system: 'Você é um agente que apenas responde questões relacionadas a programação. qualquer outro tema quer dizer que nao tem permissão para responder',
        messages: modelMessages,
    })

    return result.toUIMessageStreamResponse()
}
