import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CATEGORIES } from '@/types/database'

/**
 * Called once after first login to seed default categories.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user already has categories
  const { count } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count && count > 0) {
    return NextResponse.json({ message: 'Already set up' })
  }

  // Insert top-level default categories first
  const { data: inserted, error } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })))
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed sub-categories for "Read"
  const readCategory = inserted?.find((c) => c.name === 'Read')
  if (readCategory) {
    await supabase.from('categories').insert([
      { name: 'For Fun', emoji: '😊', parent_id: readCategory.id, user_id: user.id, sort_order: 0 },
      { name: 'PhD — Philosophy of Mind', emoji: '🧠', parent_id: readCategory.id, user_id: user.id, sort_order: 1 },
      { name: 'PhD — Methodology', emoji: '🔬', parent_id: readCategory.id, user_id: user.id, sort_order: 2 },
    ])
  }

  // Seed some default keyword rules
  const catMap = Object.fromEntries(inserted?.map((c) => [c.name, c.id]) ?? [])
  const rules = [
    // Groceries
    ...[
      'milk', 'eggs', 'bread', 'butter', 'coffee', 'tea', 'sugar', 'flour',
      'cheese', 'yogurt', 'fruit', 'vegetables', 'chicken', 'rice', 'pasta',
      'cereal', 'juice', 'oat', 'grocery', 'groceries', 'buy', 'pick up',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Groceries'], user_id: user.id })),
    // Watch
    ...[
      'watch', 'movie', 'film', 'series', 'episode', 'netflix', 'show',
      'documentary', 'cinema', 'tv', 'streaming',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Watch'], user_id: user.id })),
    // Read
    ...[
      'read', 'book', 'article', 'paper', 'arxiv', 'journal', 'blog',
      'newsletter', 'author', 'novel', 'essay',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Read'], user_id: user.id })),
    // Listen
    ...[
      'listen', 'podcast', 'album', 'song', 'spotify', 'playlist', 'music',
      'audiobook', 'radio',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Listen'], user_id: user.id })),
    // Video Game
    ...[
      'game', 'play', 'steam', 'switch', 'xbox', 'playstation', 'dlc',
      'gaming',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Video Game'], user_id: user.id })),
    // Workouts
    ...[
      'workout', 'run', 'gym', 'exercise', 'training', 'yoga', 'lift',
      'stretch', 'swim',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Workouts'], user_id: user.id })),
    // Piano Practice
    ...[
      'piano', 'practice', 'scales', 'piece', 'chord', 'sheet music',
    ].map((kw) => ({ keyword: kw, category_id: catMap['Piano Practice'], user_id: user.id })),
  ].filter((r) => r.category_id)

  await supabase.from('keyword_rules').insert(rules)

  return NextResponse.json({ message: 'Setup complete', categories: inserted })
}
