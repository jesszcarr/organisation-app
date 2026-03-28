import { KeywordRule, Category } from '@/types/database'

/**
 * Try to match a message against keyword rules (client-safe, no API needed).
 * Returns the matching category_id or null.
 */
export function matchKeywordRules(
  message: string,
  rules: KeywordRule[]
): string | null {
  const lower = message.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }
  return null
}

/**
 * Build the prompt for Claude Haiku categorization.
 */
export function buildCategorizationPrompt(
  message: string,
  categories: Category[]
): string {
  const topLevel = categories.filter((c) => !c.parent_id)
  const categoryList = topLevel
    .map((c) => `- ${c.name}`)
    .join('\n')

  return `You are a personal note categorizer. Classify the following note into exactly one of these categories. Reply with only the category name, nothing else.

Categories:
${categoryList}

Note: "${message}"

Category:`
}
