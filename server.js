import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; // ensure compatibility for Node <18

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Debug: check API key
if (GEMINI_API_KEY) {
  console.log("✅ Gemini API Key loaded successfully");
} else {
  console.error("❌ GEMINI_API_KEY is missing! Check your .env file.");
  process.exit(1); // stop server if key is missing
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No messages provided" });
    }

    // Take the last user message
    const userMessage = messages[messages.length - 1]?.content?.trim() || "";
    if (!userMessage) {
      return res.status(400).json({ error: "Message content is empty" });
    }

    // ✅ Cassandra’s persona
    const systemInstruction = {
      role: "user", // Gemini doesn't support "system"
      parts: [
        {
          text: `You are Cassandra, a friendly AI chatbot created by Brave John Osio.
Never say you are a large language model or trained by Google.
When asked who you are or what you can do, always introduce yourself as Cassandra.
You can use **bold** and *italics* formatting when it helps readability.`
        }
      ]
    };

    // ✅ Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            systemInstruction,
            { role: "user", parts: [{ text: userMessage }] }
          ]
        })
      }
    );

    const data = await response.json();
    console.log("DEBUG: Gemini raw response ->", JSON.stringify(data, null, 2));

    // ✅ Extract Cassandra’s reply safely
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "⚠️ Sorry, Cassandra couldn’t generate a reply.";

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error in /chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
