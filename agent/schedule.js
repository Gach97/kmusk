const axios = require('axios');
const generateRandomTweet = require('./generate');
const BlueskyService = require('../monitor/blueSkyService');
const fs = require('fs');

async function fetchAsset() {
  try {
    const response = await axios.get('https://api.coincap.io/v2/assets',{
      headers: {'Bearer 6afe6c0b-fbce-41e8-a9fa-3e2a42a804c7'}
    });
    const assets = response.data.data;

    if (!assets || assets.length === 0) {
      throw new Error('No assets found');
    }

    // Sort assets by absolute 24-hour change percentage in descending order
    const sortedAssets = assets.sort((a, b) => 
      Math.abs(parseFloat(b.changePercent24Hr)) - Math.abs(parseFloat(a.changePercent24Hr))
    );

    // Get the top 5 most volatile assets
    const topVolatileAssets = sortedAssets.slice(0, 5);

    // Select a random asset from the top 5
    const randomAsset = topVolatileAssets[Math.floor(Math.random() * topVolatileAssets.length)];

    return randomAsset.id;

  } catch (error) {
    console.error('Error fetching asset:', error);
    return null;
  }
}

function cleanTweet(content) {
  return content;
}

async function postTweet(content) {
  try {
    fs.appendFileSync('postedTweets.txt', `${new Date().toISOString()} - ${content}\n`);
    const blueskyService = new BlueskyService();
    const result = await blueskyService.postSkeet(content);
    console.log(`Tweet posted: ${result}`);
  } catch (e) {
    console.error('Error posting tweet: ', e);
  }
}

async function sendTweet() {
  try {
    const asset = await fetchAsset();
    if (!asset) return;

    let tweet = await generateRandomTweet(asset);
    tweet = cleanTweet(tweet);
    console.log(`Tweet generated at ${new Date().toLocaleTimeString()}: ${tweet}`);
    scheduleNextTweet()
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
