export type FanableCategory = "Trading Card" | "Comic" | "Others"

export function detectFanableCategory(
  title: string, 
  description: string = "",
  itemSpecifics?: Record<string, string>
): FanableCategory {
  // Concatenate all text values into a single string (preserves UTF-8 encoding)
  const textParts: string[] = [title, description]
  
  if (itemSpecifics) {
    // Add all itemSpecifics values to the text
    for (const key in itemSpecifics) {
      const value = itemSpecifics[key]
      if (typeof value === 'string') {
        textParts.push(value)
      }
    }
  }
  
  // Join and normalize to lowercase (preserves UTF-8 characters)
  const combinedText = textParts.join(' ').toLowerCase()
  
  // Comic keywords - brands and specific keywords only (no grading companies, no character names)
  const comicKeywords = [
    "comic",
    "comics",
    "comic book",
    "variant",
    "cover",
    "variant cover",
    "marvel comics",
    "marvel",
    "dc comics",
    "dc comic",
    "image comics",
  ]
  
  // Trading Card keywords
  const tradingCardKeywords = [
    "trading card",
    "tcg",
    "trading card game",
    "card pack",
    "booster pack",
    "booster box",
    "trading card pack",
    "pokemon",
    "Pokémon",
    "yugioh",
    "yu-gi-oh",
    "magic the gathering",
    "mtg",
    "baseball card",
    "basketball card",
    "football card",
    "hockey card",
    "sports card",
    "collectible card",
    "card game",
    "trading card set",
    "trading cards"
  ]
  
  // Single search for comic keywords
  const hasComicKeyword = comicKeywords.some(keyword => combinedText.includes(keyword))
  
  // Single search for trading card keywords
  const hasTradingCardKeyword = tradingCardKeywords.some(keyword => combinedText.includes(keyword))
  
  // Priority: Comic keywords take precedence
  if (hasComicKeyword) {
    return "Comic"
  }
  
  if (hasTradingCardKeyword) {
    return "Trading Card"
  }
  
  return "Others"
}

