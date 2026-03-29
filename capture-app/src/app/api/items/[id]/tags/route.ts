import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET tags for an item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { data } = await supabase
    .from('item_tags').select('tag:tags(id, name)').eq('item_id', id)

  const tags = (data ?? []).map(d => d.tag).filter(Boolean)
  return NextResponse.json(tags)
}

// PUT — replace all tags on an item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: itemId } = await params
  const { tag_ids } = await request.json() as { tag_ids: string[] }

  // Verify item ownership
  const { data: item } = await supabase
    .from('items').select('id').eq('id', itemId).eq('user_id', user.id).single()
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete existing tags for this item
  await supabase.from('item_tags').delete().eq('item_id', itemId)

  // Insert new ones
  if (tag_ids.length > 0) {
    await supabase.from('item_tags').insert(
      tag_ids.map(tag_id => ({ item_id: itemId, tag_id }))
    )
  }

  // Return updated tags
  const { data } = await supabase
    .from('item_tags').select('tag:tags(id, name)').eq('item_id', itemId)
  const tags = (data ?? []).map(d => d.tag).filter(Boolean)
  return NextResponse.json(tags)
}
