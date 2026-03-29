import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../src/lib/supabase/server'

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
