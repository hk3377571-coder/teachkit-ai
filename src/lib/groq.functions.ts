import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export const chatWithGroq = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: Msg[] }) => {
    if (!input || !Array.isArray(input.messages)) {
      throw new Error("messages array required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

    const systemPrompt =
      "You are a friendly AI teaching assistant inside an AI Teaching Studio app. You help teachers improve lesson plans, worksheets, quizzes, and rubrics, and you answer student doubts clearly with simple examples. Keep responses concise, well-structured, and use markdown when helpful.";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Groq] error", res.status, text);
      throw new Error(`Groq request failed: ${res.status}`);
    }

    const json = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });