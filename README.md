# kmusk

A crypto market sentiment bot with Kenyan flavor.

## Overview

**kmusk** is a Node.js-powered agent that analyzes real-time crypto market data, crafts actionable trading insights, and posts tweets or replies with a unique Kenyan twist—blending Swahili, Sheng slang, and local proverbs for authenticity and relatability.

Inspired by the “KenyanMusk” persona, the bot:

- Fetches asset price & market metrics (funding rates, liquidity, etc.) from APIs like CoinCap.
- Generates witty, concise, and actionable tweets or replies for various crypto assets.
- Naturally incorporates local slang (Sheng), Swahili, and Kenyan cultural references.
- Learns new Sheng words from replies and conversations, updating its dictionary.
- Responds to market events or Bluesky notifications with context-aware, character-driven analysis.

## Features

- **Market Analysis**: Automated fetching, parsing, and analysis of crypto asset data, including funding rates, support zones, and liquidity pools.
- **Natural Language Generation**: Uses OpenAI and Grok models to generate tweets and replies, following a template for KenyanMusk’s persona.
- **Sheng/Swahili Integration**: Identifies and enhances tweets with Sheng slang and Swahili phrases, using a growing dictionary.
- **Reply Automation**: Monitors platforms (e.g., Bluesky), learns from user replies, and posts responses in real time.
- **Character Customization**: Reads persona traits from `char.json` to maintain consistent tone and style.

## Example Tweet

> Soko imebidi bullish kidogo leo, lakini si overdo—sentiment ina heat up faster than chai ☕. Funding rates +0.15%, liquidity zinatoshea 500k Raydium. Chukua pump-fun cheap huko, flip 6-12hrs for 2x vibes. Farmers, poa. Traders panic, mimi nianalyze. #pump-fun 📈

## Directory Structure

- `/agent/`: Tweet/reply generation logic, persona templates.
- `/learn/`: Sheng learning & slang dictionary modules.
- `/monitor/`: Monitors external platforms, handles replies.
- `postedTweets.txt`: Log of posted tweets for reference.

## Setup

1. Clone the repo
2. Install dependencies: `npm install`
3. Configure API keys in `/config/openai.js` and `/config/firebase.js`
4. Run the bot: `node agent/generate.js` or set up a monitor

## Customization

- Edit `char.json` to change persona style and sample posts.
- Add new slang to the Sheng dictionary via `/learn/shengDictionary.js`.

## License

MIT

---

_Crafted by Kenyan markets, powered by code._
