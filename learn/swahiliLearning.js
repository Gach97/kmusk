const openai = require("../config/openai");

class SwahiliLearning {
  constructor() {
    // future dictionary could be added here if desired
  }

  /**
   * Rewrite a tweet so that it contains some Swahili phrases.
   * The `level` controls how aggressive the mix is:
   *   light    - mostly English with 1-2 Swahili words/phrases
   *   moderate - roughly 50/50 English/Swahili, maybe a proverb
   *   heavy    - full Swahili rewrite while preserving symbols and numbers
   */
  async enhanceTweetWithSwahili(originalTweet, level = "light") {
    try {
      const levelInstructions = {
        light: "Keep the tweet mostly in English but sprinkle in one or two natural Swahili words or short phrases. Don't break the flow.",
        moderate: "Mix English and Swahili roughly equally; you can include a short proverb or an idiom. The tweet should still read naturally.",
        heavy: "Translate the tweet into natural Swahili while leaving technical details (symbol, numbers, hashtags) untouched."
      };

      const prompt = `Rewrite the following market tweet using Swahili according to the level description below. The resulting message must be coherent, suitable for posting on Bluesky, and under 200 graphemes. Maintain asset symbols, prices, hashtags and numbers exactly as they appear. Use emojis where appropriate.

LEVEL DESCRIPTION: ${levelInstructions[level] || levelInstructions.light}

Tweet: "${originalTweet}"

Output just the rewritten tweet text.`;

      const completion = await openai.chat.completions.create({
        model: process.env.OPEN_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 200
      });

      let enhanced = completion.choices[0].message.content.trim();
      // strip any surrounding quotes/backticks
      enhanced = enhanced.replace(/^['"`]+|['"`]+$/g, "").trim();
      return enhanced || originalTweet;
    } catch (error) {
      console.error("Swahili enhancement failed:", error);
      return originalTweet;
    }
  }
}

module.exports = SwahiliLearning;
