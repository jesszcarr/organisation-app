import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { habit_id, log_date, value, note } = await request.json()
  if (!habit_id || !log_date || value === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  // Verify ownership
  const { data: habit } = await supabase.from('habits').select('id').eq('id', habit_id).eq('user_id', user.id).single()
  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id, log_date, value, note: note ?? null }, { onConflict: 'habit_id,log_date' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const habit_id = searchParams.get('habit_id')
  const log_date = searchParams.get('log_date')
  if (!habit_id || !log_date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const { data: habit } = await supabase.from('habits').select('id').eq('id', habit_id).eq('user_id', user.id).single()
  if (!habit) return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  const { error } = await supabase.from('habit_logs').delete().eq('habit_id', habit_id).eq('log_date', log_date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const { data: habits } = await supabase.from('habits').select('id').eq('user_id', user.id)
  const habitIds = (habits ?? []).map(h => h.id)
  if (habitIds.length === 0) return NextResponse.json([])
  let query = supabase.from('habit_logs').select('*, habit:habits(*)').in('habit_id', habitIds).order('log_date', { ascending: false })
  if (from) query = query.gte('log_date', from)
  if (to) query = query.lte('log_date', to)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
