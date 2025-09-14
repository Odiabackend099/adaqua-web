import type { NextApiRequest, NextApiResponse } from "next";

export const config = { 
  api: { 
    bodyParser: true,
    responseLimit: false 
  } 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const send = (data: string) => res.write(`data: ${data}\n\n`);
  const end = () => res.end();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { user, history = [] } = body;

    if (!user) {
      send(JSON.stringify({ error: "user message required" }));
      return end();
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      // Use OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          messages: [
            { 
              role: "system", 
              content: "You are Adaqua, a helpful AI assistant. Be concise and conversational. Respond naturally as if speaking." 
            },
            ...history,
            { role: "user", content: String(user) }
          ]
        })
      });

      if (!response.ok || !response.body) {
        send(JSON.stringify({ error: `OpenAI API error: ${response.status}` }));
        return end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            return end();
          }

          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              send(JSON.stringify({ delta }));
            }
          } catch (parseError) {
            // Skip malformed JSON
            continue;
          }
        }
      }
      return end();
    } else {
      // Stub response when no OpenAI key
      console.log("No OPENAI_API_KEY found, using stub response");
      
      const stubMessages = [
        "I'm online and ready to help. ",
        "You can speak continuously with me. ",
        "I'll respond and play audio back to you. ",
        "What would you like to talk about?"
      ];

      for (const message of stubMessages) {
        send(JSON.stringify({ delta: message }));
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      return end();
    }
  } catch (error: any) {
    console.error("Chat API Error:", error);
    send(JSON.stringify({ 
      error: "server_error", 
      message: error?.message || "Internal server error" 
    }));
    return end();
  }
}
