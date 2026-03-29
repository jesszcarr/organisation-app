import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildRoutingPrompt, matchProjectAliases } from '@/lib/categorize'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message } = await request.json() as { message: string }
  if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

  const [catsRes, projRes, habRes, tagsRes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('projects').select('*').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
    supabase.from('tags').select('*').eq('user_id', user.id),
  ])

  const categories = catsRes.data ?? []
  const projects = projRes.data ?? []
  const habits = habRes.data ?? []
  const tags = tagsRes.data ?? []

  const aliasMatch = matchProjectAliases(message, projects)
  console.log('[route] aliasMatch:', aliasMatch)

  try {
    const prompt = buildRoutingPrompt(message, categories, projects, habits, tags)
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    console.log('[route] AI raw:', raw)
    const cleaned = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(cleaned)

    const projectId = aliasMatch || parsed.project_id || null
    let type = parsed.type || 'task'
    if (projectId && type === 'reflection') {
      type = 'project_update'
    }

    // Filter tags — only allow ones that exist in the user's tag list
    const validTagNames = new Set(tags.map(t => t.name))
    const filteredTags = (parsed.tags || []).filter((t: string) => validTagNames.has(t.toLowerCase()))

    // Validate pending_habit_id against actual habits
    const validHabitIds = new Set(habits.map(h => h.id))
    const pendingHabitId = parsed.pending_habit_id && validHabitIds.has(parsed.pending_habit_id)
      ? parsed.pending_habit_id : null

    return NextResponse.json({
      type,
      category_id: parsed.category_id || null,
      project_id: projectId,
      habits: parsed.habits || [],
      pending_habit_id: pendingHabitId,
      tags: filteredTags,
      priority: type === 'task' ? (parsed.priority || 'today') : null,
      method: 'ai',
    })
  } catch (e) {
    console.error('[route] Routing failed:', e)
    return NextResponse.json({
      type: aliasMatch ? 'project_update' : 'task',
      category_id: null,
      project_id: aliasMatch,
      habits: [],
      tags: [],
      method: 'ai_fallback',
    })
  }
}
