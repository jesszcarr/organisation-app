import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ITEM_SELECT = '*, category:categories(*), project:projects(*), pending_habit:habits(*)'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const updates = { ...body }

  if (body.action === 'complete') {
    delete updates.action
    updates.completed_at = new Date().toISOString()
    updates.type = 'achievement'

    const { data: item } = await supabase
      .from('items').select('*, project:projects(*)').eq('id', id).single()

    if (item) {
      const today = new Date().toISOString().split('T')[0]

      if (item.pending_habit_id) {
        await supabase.from('habit_logs').upsert(
          { habit_id: item.pending_habit_id, item_id: id, log_date: today, value: 1, note: `Completed: ${item.content}` },
          { onConflict: 'habit_id,log_date' }
        )
      } else if (item.project_id) {
        const { data: habits } = await supabase
          .from('habits').select('*').eq('user_id', user.id).eq('active', true)
        if (habits) {
          const project = item.project as { name: string } | null
          const pName = project?.name?.toLowerCase() ?? ''
          const match = habits.find((h: { name: string }) => {
            const hName = h.name.toLowerCase()
            return hName === pName || pName.includes(hName) || hName.includes(pName)
          })
          if (match) {
            await supabase.from('habit_logs').upsert(
              { habit_id: match.id, item_id: id, log_date: today, value: 1, note: `Completed: ${item.content}` },
              { onConflict: 'habit_id,log_date' }
            )
          }
        }
      }
    }
  }

  if (!updates.categorized_by && !body.action) {
    updates.categorized_by = 'manual'
  }

  const { data, error } = await supabase
    .from('items').update(updates).eq('id', id).eq('user_id', user.id)
    .select(ITEM_SELECT).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
