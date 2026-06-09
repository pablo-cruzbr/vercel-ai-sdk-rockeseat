"use client"

import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  })

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="bg-gray-300 w-full">
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === "user" ? "Você" : "Agente"}:</strong>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <Textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Como posso te ajudar?"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
