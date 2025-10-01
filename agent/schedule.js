const axios = require("axios");
const generateRandomTweet = require("./generate");
const BlueskyService = require("../monitor/blueSkyService");
const fs = require("fs");
const GraphemeSplitter = require("grapheme-splitter");
require("dotenv").config();

const splitter = new GraphemeSplitter(); // Initialized splitter
const MAX_TWEET_LENGTH = 300; // Max length set to 300 graphemes, suitable for Bluesky

async function fetchAsset() {
  try {
    const response = await axios.get("https://rest.coincap.io/v3/assets", {
      headers: {
        Authorization: `Bearer ${process.env.COINCAP_KEY}`,
      },
    });
    const assets = response.data.data;

    if (!assets || assets.length === 0) {
      throw new Error("No assets found");
    }

    // Sort assets by absolute 24-hour change percentage in descending order
    const sortedAssets = assets.sort(
      (a, b) =>
        Math.abs(parseFloat(b.changePercent24Hr)) -
        Math.abs(parseFloat(a.changePercent24Hr))
    );

    // Get the top 5 most volatile assets
    const topVolatileAssets = sortedAssets.slice(0, 5);

    // Select a random asset from the top 5
    const randomAsset =
      topVolatileAssets[Math.floor(Math.random() * topVolatileAssets.length)];
    console.log("asset found:", randomAsset.id);
    return randomAsset.id;
  } catch (error) {
    console.error("Error fetching asset:", error);
    return null;
  }
}

function cleanTweet(content) {
  const graphemes = splitter.splitGraphemes(content);

  if (graphemes.length > MAX_TWEET_LENGTH) {
    // Truncate the tweet text to the maximum allowed grapheme length
    return graphemes.slice(0, MAX_TWEET_LENGTH).join("");
  }

  return content;
}

async function postTweet(content) {
  try {
    fs.appendFileSync(
      "postedTweets.txt",
      `${new Date().toISOString()} - ${content}\n`
    );
    const blueskyService = new BlueskyService();
    // The content passed here is already grapheme-split-safe
    const result = await blueskyService.postSkeet(content);
    console.log(`Tweet posted: ${result}`);
  } catch (e) {
    console.error("Error posting tweet: ", e);
  }
}

async function sendTweet() {
  try {
    const asset = await fetchAsset();
    if (!asset) return;

    let tweet = await generateRandomTweet(asset);
    tweet = cleanTweet(tweet); // Truncation happens here
    console.log(
      `Tweet generated at ${new Date().toLocaleTimeString()}: ${tweet}`
    );
    scheduleNextTweet();
    await postTweet(tweet);
  } catch (error) {
    console.error("Error generating tweet:", error);
    scheduleNextTweet();
  }
}

function scheduleNextTweet() {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const additionalHourMs = Math.random() * (60 * 60 * 1000);
  const delay = twoHoursMs + additionalHourMs;

  console.log(`Next tweet scheduled in ${(delay / 60000).toFixed(2)} minutes`);

  setTimeout(async () => {
    await sendTweet();
    scheduleNextTweet();
  }, delay);
}

module.exports = { sendTweet };
