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
  console.log({baseURL: `${process.env.AI_URL}`, apiKey: `${process.env.AI_API}`});
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

  // --- ENHANCED DATA EXTRACTION WITH MEANINGFUL METRICS ---
  const history = crypto?.data || [];
  const currentData = history[history.length - 1];
  const previousData = history[history.length - 2];

  const price = currentData?.priceUsd ? parseFloat(currentData.priceUsd) : 0;
  const priceFormatted = price > 1 
    ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(6);

  // Calculate short-term trend from historical data
  const trend = price > (previousData?.priceUsd || 0) ? "UPWARD" : "DOWNWARD";
  const exchangeName = exchange?.data?.[0]?.exchangeId || "Global Markets";
  const volume = exchange?.data?.[0]?.volumeUsd24Hr 
    ? (parseFloat(exchange.data[0].volumeUsd24Hr) / 1000000).toFixed(2) + "M"
    : "Significant";

  const selectedMood = getRandom(character.moods);

  // --- THE "ELITE TRADER" ANALYSIS PROMPT ---
  const defaultPrompt = `
  SYSTEM: You are ${character.name}, a professional Crypto Strategist. 
  Your mission is to provide high-signal market analysis for ${asset.toUpperCase()}.
  
  CURRENT MARKET FEED:
  - Symbol: #${asset.toUpperCase()}
  - Spot Price: $${priceFormatted}
  - 6H Trend: ${trend}
  - Exchange Activity: ${exchangeName}
  - 24H Volume: $${volume}
  - Character Mood: ${selectedMood}
  - Background Context: ${getRandom(character.lore)}

  POST REQUIREMENTS:
  1. DATA INTEGRITY: You MUST include the Symbol (#${asset.toUpperCase()}) and the current Price ($${priceFormatted}).
  2. ANALYTICAL INSIGHT: Don't just list numbers. Interpret them. (e.g., "Volume is drying up at resistance" or "Strong support holding at this level").
  3. CHARACTER: Blend technical analysis (Order blocks, RSI, or Liquidity) with your Eldoret "street-smart" wisdom. 
  4. TRADER UTILITY: Help traders understand if this is a "Look-and-wait" moment or an "Accumulation" zone.
  5. BREVITY: Keep it under 280 characters for Bluesky.
  6. ANTI-REPETITION: Use a unique opening. Do NOT start with "The market is..." or "Looking at...". Start with a punchy observation.

  STYLE EXAMPLE: "${postExample}"

  OUTPUT (Post Text Only):`;
  const prompt = overridePrompt || defaultPrompt;
  console.log("Prompt being sent to model:\n", prompt);

  try {
    let completion;
    let retries = 0;
    const maxRetries = 2;
    const primaryModel = process.env.OPEN_MODEL;
    const backupModel = process.env.OPEN_MODEL_BACKUP;
    
    // Try primary model first
    while (retries < maxRetries) {
      try {
        completion = await openai.chat.completions.create({
          model: primaryModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.9,
          frequency_penalty: 1.5,
          presence_penalty: 1.0,
          max_tokens: 250,
        });
        console.log(`Generated tweet using ${primaryModel}`);
        console.log("API completion response:", completion);
        break;
      } catch (error) {
        if (error.status === 429 && retries < maxRetries - 1) {
          // Rate limited, exponential backoff
          const delay = Math.pow(2, retries) * 8000; // 8s, 16s
          console.log(`${primaryModel} rate limited (429). Retrying in ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else if (error.status === 429) {
          // Primary model exhausted, try backup
          console.log(`${primaryModel} rate limited. Switching to backup model: ${backupModel}`);
          try {
            completion = await openai.chat.completions.create({
              model: backupModel,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.85,
              frequency_penalty: 1.3,
              presence_penalty: 0.9,
              max_tokens: 250,
            });
            console.log(`Generated tweet using backup model ${backupModel}`);
            break;
          } catch (backupError) {
            console.log(`Backup model also failed: ${backupError.message}`);
            throw error; // Throw original error, will fall back to examples
          }
        } else {
          throw error;
        }
      }
    }

    // Add safety check for completion response
    if (!completion?.choices?.[0]?.message?.content) {
      console.error("Invalid API response (no content):", completion);
      console.error("Choices[0] details:", completion?.choices?.[0]);
      console.error("Message object details:", completion?.choices?.[0]?.message);
      // Do not return a random example; indicate failure so caller can skip posting.
      return null;
    }

    let tweet = completion.choices[0].message.content.trim();
    console.log("Raw tweet content from API:", JSON.stringify(tweet));

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
if (require.main === module) {
  (async () => {
    console.log("Running standalone test of generateRandomTweet...");
    const result = await generateRandomTweet("bitcoin", "TEST PROMPT: Write a brief market insight as if you were a seasoned trader.");
    console.log("Standalone test result:", result);
  })();
}

module.exports = { generateRandomTweet };

module.exports = generateRandomTweet;
