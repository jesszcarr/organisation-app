import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildCategorizationPrompt } from '@/lib/categorize'
import { Category } from '@/types/database'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, categories } = await request.json() as {
    message: string
    categories: Category[]
  }

  if (!message || !categories?.length) {
    return NextResponse.json({ error: 'Missing message or categories' }, { status: 400 })
  }

  const topLevel = categories.filter((c) => !c.parent_id)
  if (!topLevel.length) {
    return NextResponse.json({ error: 'No top-level categories' }, { status: 400 })
  }

  const prompt = buildCategorizationPrompt(message, categories)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()

  // Find matching category (case-insensitive)
  const matched = topLevel.find(
    (c) => c.name.toLowerCase() === raw.toLowerCase()
  )

  if (!matched) {
    // Fallback to first category
    return NextResponse.json({ category_id: topLevel[0].id, method: 'ai_fallback' })
  }

  return NextResponse.json({ category_id: matched.id, method: 'ai' })
}
