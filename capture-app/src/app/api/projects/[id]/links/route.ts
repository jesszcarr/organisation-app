import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../../src/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id: project_id } = await params
  const body = await request.json()
  const { data: project } = await supabase.from('projects').select('id').eq('id', project_id).eq('user_id', user.id).single()
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await supabase.from('project_links').insert({ ...body, project_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const linkId = new URL(request.url).searchParams.get('link_id')
  if (!linkId) return NextResponse.json({ error: 'Missing link_id' }, { status: 400 })
  const { error } = await supabase.from('project_links').delete().eq('id', linkId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
