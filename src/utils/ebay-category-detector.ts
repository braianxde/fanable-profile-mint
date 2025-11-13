export type FanableCategory = "Pokemon" | "Trading Card" | "Comic" | "Others"

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
  
  // Pokemon keywords
  const pokemonKeywords = [
    "pokemon",
    "pokémon",
  ]
  
  // Comic keywords - general comic-related terms and indicators
  const comicKeywords = [
    "comic",
    "comics",
    "comic book",
    "marvel",
  ]
  
  // Trading Card keywords - general trading card terms (excluding Pokemon-specific terms)
  const tradingCardKeywords = [
    "trading card",
    "trading cards",
    "tcg",
    "card pack",
    "booster pack",
    "booster box",
    "sports card",
  ]
  
  // Check for Pokemon keywords
  const hasPokemonKeyword = pokemonKeywords.some(keyword => combinedText.includes(keyword))
  
  // Check for trading card keywords
  const hasTradingCardKeyword = tradingCardKeywords.some(keyword => combinedText.includes(keyword))
  
  // Check for comic keywords
  const hasComicKeyword = comicKeywords.some(keyword => combinedText.includes(keyword))
  
  // Priority: Comic > Pokemon > Trading Card
  // Comics take priority because comic-specific indicators (like CGC, issue numbers) are strong signals
  if (hasComicKeyword) {
    return "Comic"
  }
  
  if (hasPokemonKeyword) {
    return "Pokemon"
  }
  
  if (hasTradingCardKeyword) {
    return "Trading Card"
  }
  
  return "Others"
}

