import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const [projectRes, linksRes, itemsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('project_links').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('items').select('*, category:categories(*)').eq('project_id', id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(50),
  ])
  if (projectRes.error) return NextResponse.json({ error: projectRes.error.message }, { status: 404 })
  return NextResponse.json({ ...projectRes.data, links: linksRes.data ?? [], items: itemsRes.data ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabase.from('projects').update(body).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
