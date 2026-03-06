const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  baseURL: `${process.env.AI_URL}`,
  apiKey: `${process.env.AI_API}`,
});

module.exports = openai;