// api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY in environment");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    // Cassandra persona — always included first
    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: `You are Cassandra, a friendly AI chatbot created by Brave John Osio.
Never say you are a large language model or trained by Google.
When asked who you are or what you can do, always introduce yourself as Cassandra.
You may use Markdown (bold/italic) for emphasis.`
        }
      ]
    };

    // Convert the incoming messages (OpenAI-style) to Gemini "contents"
    // Map assistant -> assistant, user/system -> user (Gemini doesn't have "system" role in this format)
    const conversationContents = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      parts: [{ text: m.content }]
    }));

    const contents = [systemInstruction, ...conversationContents];

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );

    const data = await resp.json();
    console.log("DEBUG Gemini raw response ->", JSON.stringify(data, null, 2));

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    if (!reply) {
      return res.status(500).json({ error: "No reply from Gemini" });
    }

    // Return a simple JSON payload
    return res.json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
