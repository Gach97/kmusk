const fs = require('fs');
const path = require('path');
const openai = require('../config/openai');

async function generateReplyTweet(payload) {
  // Read character configuration from char.json
  const charFilePath = path.join(__dirname, 'char.json');
  const charData = fs.readFileSync(charFilePath, 'utf8');
  const character = JSON.parse(charData);

  // Get current date and time info
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const hour = now.getHours();
  const minute = now.getMinutes();
  const formattedTime = `${hour}:${minute < 10 ? '0' + minute : minute}`;

  const originalTweet = payload.tweet || "an interesting conversation";

  const prompt = `
You are ${character.name}, a data-driven crypto strategist whose Eldoret upbringing has shaped your resilient market approach. While your analysis is elite-tier, you're seeking the right investor to scale your vision.

An original tweet stated: "${originalTweet}".

It's ${dayName}, ${formattedTime}, with ${asset} priced at $${crypto.priceUsd}.

Craft a tactical reply under 200 characters that:
- Analyzes the market situation with precise metrics 📊
- References ${exchange} opportunities or risks
- Includes a subtle Swahili proverb or phrase related to patience or wisdom
- Uses 1-2 impactful emojis strategically
- Hints at what your strategies could achieve with proper capital
- Demonstrates your calm confidence during market volatility
- Naturally incorporates #${asset}

Remember: you're known for discerning patterns others miss while staying authentically connected to your roots.

Please provide the output in the following format:

tweet: 'Your crafted reply here'
notes: 'Any additional notes here'
`;


  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPEN_MODEL || "deepseek/deepseek-chat-v3-0324:free",
      messages: [{ role: "user", content: prompt }]
    });
    const replyTweet = completion.choices[0].message.content.trim();
    return replyTweet;
  } catch (error) {
    console.error("Error generating reply tweet:", error);
    throw error;
  }
}

module.exports = generateReplyTweet;
