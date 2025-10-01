const ShengDictionary = require("./shengDictionary");
const openai = require("../config/openai");

class ShengLearning {
  constructor() {
    this.shengDictionary = new ShengDictionary();
  }

  // Extract potential Sheng words from text
  async extractPotentialShengWords(text) {
    try {
      const prompt = `
Identify any Kenyan Sheng words in the following text and provide their English translations.
Only identify words that are definitely Sheng (Kenyan slang), not standard Swahili or English.
Format your response as a valid JSON object with Sheng words as keys and arrays of English translations as values.
Example format: {"noma": ["bad", "difficult"], "poa": ["cool", "good"]}
If no Sheng words are found, return an empty JSON object: {}
make sure to keep it under 200 graphemes, and assume it is a real tweet being sent so restrain from adding breakdowns or bonus texts. Just send a clear tweet, use emojis where appropriate.

Text: "${text}"
      `;

      const completion = await openai.chat.completions.create({
        model: "x-ai/grok-4-fast:free",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const resultText = completion.choices[0].message.content.trim();

      let jsonContent = resultText;
      if (resultText.includes("```json")) {
        jsonContent = resultText.replace(/```json\s*|\s*```/g, "");
      }

      const extractedWords = JSON.parse(jsonContent);

      Object.entries(extractedWords).forEach(([shengWord, translations]) => {
        this.shengDictionary.addWord(shengWord, translations);
      });

      return extractedWords;
    } catch (error) {
      console.error("Error extracting Sheng words:", error);
      return {};
    }
  }

  // Enhance a tweet with appropriate Sheng words
  async enhanceTweetWithSheng(originalTweet, shengLevel = "moderate") {
    try {
      // Get some random Sheng words to suggest for use
      const shengExamples = [];
      for (let i = 0; i < 5; i++) {
        const randomWord = await this.shengDictionary.getRandomShengWord();
        if (randomWord) {
          const translations =
            await this.shengDictionary.getEnglishTranslations(randomWord);
          shengExamples.push(
            `"${randomWord}" (meaning: ${translations.join(", ")})`
          );
        }
      }

      // Define Sheng usage levels
      const levelDescription = {
        light: "Use 1-2 Sheng words",
        moderate: "Use 2-4 Sheng words",
        heavy: "Use 5+ Sheng words and Kenyan expressions",
      };

      const prompt = `
Rewrite the tweet below using Kenyan Sheng to reflect authentic Kenyan Bluesky culture. ${
        levelDescription[shengLevel]
      } Ensure the revised tweet is natural, under 200 graphemes, and suitable for posting without additional explanations or bonus texts. Incorporate emojis where appropriate.

Sheng examples: ${shengExamples.join(
        ", "
      )}. Feel free to include one additional Sheng word for extra flavor.

Original tweet: "${originalTweet}"

Please provide the output in the following format:

tweet: 'Your rewritten tweet here'
notes: 'Any additional notes here'
`;

      const completion = await openai.chat.completions.create({
        model: "x-ai/grok-4-fast:free",
        messages: [{ role: "user", content: prompt }],
      });

      const enhancedTweet = completion.choices[0].message.content.trim();

      const tweetMatch = enhancedTweet.match(/tweet:\s*'([^']*)'/);
      const tweet = tweetMatch ? tweetMatch[1].trim() : "";
      console.log(tweet);

      console.log("enhanced skeet: ", tweet);

      await this.extractPotentialShengWords(enhancedTweet);

      return tweet;
    } catch (error) {
      console.error("Error enhancing tweet with Sheng:", error);
      return originalTweet;
    }
  }
}

module.exports = ShengLearning;
