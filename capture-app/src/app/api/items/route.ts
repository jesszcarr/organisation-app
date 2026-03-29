import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function attachTags(supabase: any, items: Record<string, unknown>[]) {
  if (items.length === 0) return items
  const itemIds = items.map((i) => i.id as string)
  const { data: itemTags } = await supabase
    .from('item_tags').select('item_id, tag:tags(id, name)').in('item_id', itemIds)
  if (!itemTags || itemTags.length === 0) return items
  const tagMap: Record<string, { id: string; name: string }[]> = {}
  for (const it of itemTags) {
    if (!it.tag) continue
    const tag = it.tag as unknown as { id: string; name: string }
    if (!tagMap[it.item_id]) tagMap[it.item_id] = []
    tagMap[it.item_id].push(tag)
  }
  return items.map((item) => ({ ...item, tags: tagMap[item.id as string] ?? [] }))
}

const ITEM_SELECT = '*, category:categories(*), project:projects(*), pending_habit:habits(*)'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')
  const projectId = searchParams.get('project_id')
  const type = searchParams.get('type')
  const priority = searchParams.get('priority')
  const search = searchParams.get('search')
  const date = searchParams.get('date')
  const tag = searchParams.get('tag')
  const completedDate = searchParams.get('completed_date')

  if (search) {
    const { data } = await supabase.rpc('search_items', { query: search, p_user_id: user.id })
    const ids = (data ?? []).map((i: { id: string }) => i.id)
    if (ids.length === 0) return NextResponse.json([])
    const { data: enriched } = await supabase
      .from('items').select(ITEM_SELECT).in('id', ids)
      .order('created_at', { ascending: false })
    return NextResponse.json(await attachTags(supabase, enriched ?? []))
  }

  if (tag) {
    const { data: tagRow } = await supabase
      .from('tags').select('id').eq('user_id', user.id).eq('name', tag.toLowerCase()).single()
    if (!tagRow) return NextResponse.json([])
    const { data: itemTagRows } = await supabase
      .from('item_tags').select('item_id').eq('tag_id', tagRow.id)
    const ids = (itemTagRows ?? []).map(it => it.item_id)
    if (ids.length === 0) return NextResponse.json([])
    const { data } = await supabase
      .from('items').select(ITEM_SELECT).in('id', ids)
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
    return NextResponse.json(await attachTags(supabase, data ?? []))
  }

  let query = supabase
    .from('items').select(ITEM_SELECT)
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (projectId) query = query.eq('project_id', projectId)
  if (type) {
    query = query.eq('type', type)
    // For tasks, only show uncompleted ones
    if (type === 'task') query = query.is('completed_at', null)
  }
  if (priority) query = query.eq('priority', priority)
  if (date) query = query.gte('created_at', `${date}T00:00:00`).lt('created_at', `${date}T23:59:59`)
  if (completedDate) {
    query = query.not('completed_at', 'is', null)
      .gte('completed_at', `${completedDate}T00:00:00`).lt('completed_at', `${completedDate}T23:59:59`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(await attachTags(supabase, data ?? []))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { content, type, category_id, project_id, pending_habit_id, categorized_by, habits, tags, priority } = body

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      content,
      type: type || 'task',
      category_id: category_id || null,
      project_id: project_id || null,
      pending_habit_id: pending_habit_id || null,
      categorized_by: categorized_by || 'manual',
      priority: priority || 'today',
      user_id: user.id,
    })
    .select(ITEM_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (habits?.length > 0 && item) {
    const today = new Date().toISOString().split('T')[0]
    for (const h of habits) {
      await supabase.from('habit_logs').upsert(
        { habit_id: h.habit_id, item_id: item.id, log_date: today, value: h.value || 1, note: h.note || null },
        { onConflict: 'habit_id,log_date' }
      )
    }
  }

  const savedTags: { id: string; name: string }[] = []
  if (tags?.length > 0 && item) {
    for (const tagName of tags) {
      const name = tagName.toLowerCase().trim()
      if (!name) continue
      let { data: tagRow } = await supabase
        .from('tags').select('id, name').eq('user_id', user.id).eq('name', name).single()
      if (!tagRow) {
        const { data: newTag } = await supabase
          .from('tags').insert({ user_id: user.id, name }).select('id, name').single()
        tagRow = newTag
      }
      if (tagRow) {
        await supabase.from('item_tags').upsert(
          { item_id: item.id, tag_id: tagRow.id },
          { onConflict: 'item_id,tag_id' }
        )
        savedTags.push(tagRow)
      }
    }
  }

  return NextResponse.json({ ...item, tags: savedTags }, { status: 201 })
}
