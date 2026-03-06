/**
 * Language Utility Module
 * Handles language selection with intelligent fallback logic
 * Prioritizes English when Swahili/Sheng enhancement fails or isn't suitable
 */

class LanguageUtil {
  constructor() {
    this.defaultLanguage = 'english';
    this.supportedLanguages = ['english', 'swahili', 'sheng'];
    this.fallbackChain = {
      sheng: 'swahili',
      swahili: 'english',
      english: 'english'
    };
  }

  /**
   * Determine if content should use Swahili/Sheng
   * Returns language preference based on confidence and content type
   */
  determineLanguagePreference(contentLength, hasMarketData = true) {
    // If content is very short or market-focused, prioritize clarity (English)
    if (contentLength < 50 && hasMarketData) {
      return 'english';
    }

    // Randomly decide among english, swahili, and sheng.
    // - ~40% english (clear market-focused posts)
    // - ~30% swahili (mix of english and Swahili phrases)
    // - ~30% sheng (full Kenyan slang rewrite)
    const roll = Math.random();
    if (roll < 0.3) return 'swahili';
    if (roll < 0.6) return 'sheng';
    return 'english';
  }

  /**
   * Generate language-specific greetings based on preference
   */
  getGreetings(language = 'english') {
    const greetings = {
      english: [
        "What's the market doing right now?",
        "Chart check—here's what I'm seeing:",
        "Market update incoming:",
        "Real talk about this dip:",
        "Breaking down the action:",
      ],
      swahili: [
        "Niaje watu, soko imeamka aje leo?",
        "Wadau wa crypto, kuna mtu ameambukeya ama tuko sawa?",
        "Market watch: Kitu interesting kinajaribu kufa leo",
        "Soko update: Fundingrates zinasema nini?",
      ],
      sheng: [
        "Yo yo yo, chart analysis time fam! 📊",
        "Mbogi, market's wilding rn—check this 👀",
        "Soko just went noma, here's what's happening",
        "Market watch: Tumblr's got the tea 🔥",
      ]
    };

    return greetings[language] || greetings.english;
  }

  /**
   * Get language-appropriate market commentary
   */
  getMarketCommentary(marketCondition = 'neutral', language = 'english') {
    const commentary = {
      english: {
        bullish: [
          "This is the kind of setup smart money waits for.",
          "Liquidity just confirmed the bias—watch what happens next.",
          "The chart's speaking. Time to listen.",
          "Accumulation phase looking healthy."
        ],
        bearish: [
          "Overextension alert. This is where fortunes reverse.",
          "Liquidation zones incoming. Stay aware.",
          "The data says pullback. Trust it.",
          "This is textbook distribution. History repeating."
        ],
        neutral: [
          "Range-bound. Let the setup develop before moving.",
          "Too early to call. Data's not clear yet.",
          "Sideways movement—good opportunity to stack.",
          "Market's thinking. We should too."
        ]
      },
      swahili: {
        bullish: [
          "Soko iko poa. Smart money imeambukeya.",
          "Fundingrates zinasema go long—pole pole.",
          "Chart imeamka noma. Tuangalie nini hutaka kufa.",
          "Accumulation phase—pesa rafiki zinakuja."
        ],
        bearish: [
          "Soko inaoverextend. Haraka haraka haina baraka.",
          "Liquidation zones zina-incoming. Jikaze.",
          "Data yenye kusema pullback—trust the numbers.",
          "Distribution imeanza—history inajitumia tena."
        ],
        neutral: [
          "Soko iko range. Tusubiri setup ijajani.",
          "Too early to call poa. Data still fuzzy.",
          "Sideways—good time to accumulate.",
          "Market ina time to think. Weowe pia."
        ]
      },
      sheng: {
        bullish: [
          "Yo, this is bussin—smart money's moving!",
          "Fundingrates spitting facts—long szn incoming 📈",
          "Chart just went noma fr fr. Watch this.",
          "Accumulation phase? That's facts no cap."
        ],
        bearish: [
          "Bruh, overextension alert—ish boutta flip 📉",
          "Liquidation heatmaps don't lie. Stay woke.",
          "Data saying bearish szn—gotta respect it.",
          "Distribution starting—we've seen this movie."
        ],
        neutral: [
          "Fam, range szn. Let the move develop 📊",
          "Data's mid rn. Can't call it yet, no cap.",
          "Sideways energy—stack while you can.",
          "Market's thinking. Gotta think too fr."
        ]
      }
    };

    return (commentary[language]?.[marketCondition] || commentary.english[marketCondition] || []);
  }

  /**
   * Validate and filter content for language appropriateness
   */
  validateContentForLanguage(content, language) {
    if (!content) return false;

    // English content is always valid
    if (language === 'english') return true;

    // For Swahili/Sheng, content should be reasonably complex
    // to justify the translation effort
    const wordCount = content.split(/\s+/).length;
    return wordCount >= 15;
  }

  /**
   * Get fallback language if primary fails
   */
  getFallbackLanguage(language) {
    return this.fallbackChain[language] || 'english';
  }

  /**
   * Enhanced tweet format for specific language
   */
  formatTweetForLanguage(content, language, marketData = null) {
    if (language === 'english') {
      return content;
    }

    // For sheng/swahili, wrap in context
    if (marketData) {
      const emoji = marketData.direction === 'up' ? '📈' : '📉';
      return `${emoji} ${content}`;
    }

    return content;
  }

  /**
   * Determine confidence level for language enhancement
   * Returns 'high', 'medium', or 'low'
   */
  assessLanguageConfidence(text, language) {
    // English is always safe
    if (language === 'english') return 'high';

    // Short texts have lower confidence for non‑English enhancements
    if (text.length < 50) return 'low';

    // Medium-length texts have medium confidence
    if (text.length < 150) return 'medium';

    // Longer texts can handle either Swahili or Sheng more naturally
    return 'high';
  }
}

module.exports = LanguageUtil;
