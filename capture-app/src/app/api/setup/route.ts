import { NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'
import { DEFAULT_CATEGORIES, DEFAULT_HABITS, DEFAULT_PROJECTS } from '../../../../src/types/database'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  if (count && count > 0) return NextResponse.json({ message: 'Already set up' })

  const { data: insertedCats, error: catError } = await supabase
    .from('categories').insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id }))).select()
  if (catError) return NextResponse.json({ error: catError.message }, { status: 500 })

  const readCategory = insertedCats?.find((c) => c.name === 'Read')
  if (readCategory) {
    await supabase.from('categories').insert([
      { name: 'Papers', emoji: '📄', parent_id: readCategory.id, user_id: user.id, sort_order: 0 },
      { name: 'Books', emoji: '📕', parent_id: readCategory.id, user_id: user.id, sort_order: 1 },
    ])
  }

  const catMap = Object.fromEntries(insertedCats?.map((c) => [c.name, c.id]) ?? [])
  const rules = [
    ...['milk', 'eggs', 'bread', 'butter', 'coffee', 'cheese', 'yogurt', 'fruit', 'chicken', 'rice', 'pasta', 'grocery', 'groceries', 'oat milk', 'sourdough'].map((kw) => ({ keyword: kw, category_id: catMap['Groceries'], user_id: user.id })),
    ...['watch', 'movie', 'film', 'series', 'episode', 'netflix', 'show', 'documentary', 'severance'].map((kw) => ({ keyword: kw, category_id: catMap['Watch'], user_id: user.id })),
    ...['read', 'book', 'article', 'paper', 'arxiv', 'blog'].map((kw) => ({ keyword: kw, category_id: catMap['Read'], user_id: user.id })),
    ...['listen', 'podcast', 'album', 'song', 'spotify', 'playlist'].map((kw) => ({ keyword: kw, category_id: catMap['Listen'], user_id: user.id })),
    ...['game', 'steam', 'switch', 'gaming'].map((kw) => ({ keyword: kw, category_id: catMap['Video Game'], user_id: user.id })),
    ...['workout', 'gym', 'exercise', 'lift'].map((kw) => ({ keyword: kw, category_id: catMap['Workouts'], user_id: user.id })),
    ...['piano', 'scales', 'piece'].map((kw) => ({ keyword: kw, category_id: catMap['Piano Practice'], user_id: user.id })),
    ...['discoverai', 'discover ai'].map((kw) => ({ keyword: kw, category_id: catMap['DiscoverAI'], user_id: user.id })),
  ].filter((r) => r.category_id)
  await supabase.from('keyword_rules').insert(rules)
  await supabase.from('projects').insert(DEFAULT_PROJECTS.map((p) => ({ ...p, user_id: user.id })))
  await supabase.from('habits').insert(DEFAULT_HABITS.map((h) => ({ ...h, user_id: user.id })))

  return NextResponse.json({ message: 'Setup complete' })
}
