const fs = require("fs");
const path = require("path");
const axios = require("axios");
const openai = require("../config/openai");
require("dotenv").config();
const ShengLearning = require("../learn/shengLearning");
const SwahiliLearning = require("../learn/swahiliLearning");
const LanguageUtil = require("./languageUtil");

const shengLearning = new ShengLearning();
const swahiliLearning = new SwahiliLearning();
const languageUtil = new LanguageUtil();
const coincapKey = process.env.COINCAP_KEY;

// Utility: get a random element from an array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Sanitize skeets: remove leading/trailing quotes and unwanted characters
function sanitizeSkeet(text) {
  if (!text) return text;
  
  // Remove leading/trailing quotation marks (single, double, smart quotes)
  let sanitized = text.replace(/^["'"`]+|["'"`]+$/g, '');
  
  // Remove "tweet:" or "skeet:" prefixes if present (from API responses)
  sanitized = sanitized.replace(/^(tweet|skeet):\s*/i, '');
  
  // Remove "notes:" section if present
  sanitized = sanitized.split(/\nnotes:/i)[0];
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

const getData = async (asset) => {
  try {
    const res = await axios.get(
      `https://rest.coincap.io/v3/assets/${asset}/history?interval=h6`,
      {
        headers: {
          Authorization: `Bearer ${coincapKey}`,
        },
      }
    );
    return res.data;
  } catch (e) {
    console.error("Error fetching Crypto Data: ", e.response?.data || e.message);
    return null;
  }
};

const getRates = async (asset) => {
  try {
    const res = await axios.get(
      `https://rest.coincap.io/v3/assets/${asset}/markets`,
      {
        headers: {
          Authorization: `Bearer ${coincapKey}`,
        },
      }
    );
    return res.data;
  } catch (e) {
    console.error("Error fetching exchanges: ", e.response?.data || e.message);
    return null;
  }
};

async function generateRandomTweet(asset, overridePrompt = null) {
  const charFilePath = path.join(__dirname, "char.json");
  const charData = fs.readFileSync(charFilePath, "utf8");
  const character = JSON.parse(charData);

  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const hour = now.getHours();
  const minute = now.getMinutes();
  const formattedTime = `${hour}:${minute < 10 ? "0" + minute : minute}`;

  const crypto = await getData(asset);
  const exchange = await getRates(asset);
  const postExample = getRandom(character.postExamples);

  // Use languageUtil to determine language preference
  const languagePreference = languageUtil.determineLanguagePreference(
    postExample.length,
    !!crypto
  );

  // Get language-appropriate greetings from languageUtil
  const appropriateGreetings = languageUtil.getGreetings(languagePreference);
  const selectedGreeting = getRandom(appropriateGreetings);

  const prompt = `
  Assume this is a real tweet you are sending. Do NOT mention being Grok, an AI, or make any disclaimers about financial advice, legality, or role-play. Do not break the fourth wall. Write as the character, not as an AI. Respond only in character and focus on market insights and vibes:
  
  ${Math.random() < 0.5 ? `${selectedGreeting}\n\n` : ""}You're ${
    character.name
  } — a skilled crypto trader who analyzes the market like the back of your hand.
  
Your story: ${getRandom(character.bio)}. Lore: ${getRandom(character.lore)}.

Market vibe: ${dayName} at ${formattedTime}. ${asset} is the focus. Craft a witty, sharp post under 200 chars.

Now craft a tweet in your signature style—sharp, witty, groun

    // Sanitize the tweet before any further processing
    tweet = sanitizeSkeet(tweet);ded. Reference market signals. Keep it authentic.

Example: "${postExample}"

Go.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    });

    // Add safety check for completion response
    if (!completion?.choices?.[0]?.message?.content) {
      console.error("Invalid API response (no content):", completion);
      console.error("Choices[0] details:", completion?.choices?.[0]);
      console.error("Message object details:", completion?.choices?.[0]?.message);
      // Do not return a random example; indicate failure so caller can skip posting.
      return null;
    }

    let tweet = completion.choices[0].message.content.trim();

    // Language-specific enhancements: sheng or swahili
    if (languagePreference === "sheng" || languagePreference === "swahili") {
      // Assess confidence before enhancing
      const confidence = languageUtil.assessLanguageConfidence(tweet, languagePreference);

      // Only enhance if confidence is medium or high
      if (confidence !== "low" && Math.random() > 0.3) {
        try {
          const level = confidence === "high" ? "moderate" : "light";
          if (languagePreference === "sheng") {
            const enhancedTweet = await shengLearning.enhanceTweetWithSheng(tweet, level);

            if (
              enhancedTweet &&
              languageUtil.validateContentForLanguage(enhancedTweet, languagePreference)
            ) {
              tweet = enhancedTweet;
              await shengLearning.extractPotentialShengWords(tweet);
            }
          } else {
            // swahili path
            const enhancedTweet = await swahiliLearning.enhanceTweetWithSwahili(tweet, level);

            if (
              enhancedTweet &&
              languageUtil.validateContentForLanguage(enhancedTweet, languagePreference)
            ) {
              tweet = enhancedTweet;
            }
          }
        } catch (langError) {
          console.log(`${languagePreference} enhancement failed, using English version as fallback`);
          // fallback automatically
        }
      }
    }

    // Final sanitization before returning
    tweet = sanitizeSkeet(tweet);
    console.log("Final sanitized tweet: ", tweet);
    return tweet;
  } catch (error) {
    console.error("Error generating random tweet:", error);
    // In case of any failure, do not produce a fallback post. Return null so
    // caller can decide to skip posting rather than send something random.
    return null;
  }
}

// allow running this file directly for a quick generation test
// if (require.main === module) {
//   (async () => {
//     console.log("Running standalone test of generateRandomTweet...");
//     const result = await generateRandomTweet("bitcoin", "TEST PROMPT: Write a brief market insight as if you were a seasoned trader.");
//     console.log("Standalone test result:", result);
//   })();
// }

module.exports = { generateRandomTweet };

module.exports = generateRandomTweet;
