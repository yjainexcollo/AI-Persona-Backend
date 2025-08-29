const logger = require("../utils/logger");

/**
 * Generate a concise, topic-based conversation title similar to ChatGPT.
 * Rules:
 * - 3-7 words
 * - No persona names, no greetings
 * - Title-cased, no trailing punctuation
 * - Summarize the user's intent/topic
 *
 * If OPENAI_API_KEY is not set or call fails, falls back to a simple heuristic
 * from the first user message.
 *
 * @param {string} userMessage - First user message
 * @param {string} assistantReply - First assistant reply
 * @returns {Promise<string>} A short title
 */
async function generateConversationTitle(
  userMessage = "",
  assistantReply = ""
) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Heuristic fallback if no API key
  const fallback = () => {
    const text = (userMessage || assistantReply || "").trim();
    if (!text) return "Untitled";
    // Remove greetings and leading fillers
    const stripped = text
      .replace(/^hi[,!]?|^hello[,!]?|^hey[,!]?\s*/i, "")
      .replace(/^please\s*/i, "")
      .replace(/^can you\s*/i, "")
      .replace(/^could you\s*/i, "")
      .replace(/^i want to\s*/i, "")
      .replace(/^help\s*me\s*with\s*/i, "")
      .trim();
    const sliced = stripped.slice(0, 60);
    // Basic title case
    const titled = sliced
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    return titled || "Untitled";
  };

  if (!apiKey) {
    logger.warn("OPENAI_API_KEY not set; using heuristic title fallback");
    return fallback();
  }

  try {
    // Lazy import to avoid cost if no key
    const OpenAI = require("openai");
    const client = new OpenAI({ apiKey });

    const system =
      "You write very short, topic-based chat titles (3-7 words). " +
      "Do not include persona names, greetings, or punctuation. " +
      "Summarize the conversation intent succinctly in Title Case.";

    const user = `Create a concise title summarizing this conversation.\n\nUser: ${
      userMessage || ""
    }\nAssistant: ${assistantReply || ""}\n\nReturn only the title.`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_TITLE_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || "Untitled";
    // Sanitize: remove punctuation at end, collapse spaces, enforce short length
    let title = raw
      .replace(/[.!?\s]+$/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 60);
    if (!title) title = fallback();
    return title;
  } catch (err) {
    logger.warn("OpenAI title generation failed; using fallback", {
      error: err?.message,
    });
    return fallback();
  }
}

module.exports = { generateConversationTitle };
