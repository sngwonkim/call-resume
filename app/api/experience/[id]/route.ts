import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params
  const { content, token } = await req.json()

  if (!content || !token) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('id')
    .eq('token', token)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { data: experience } = await supabaseAdmin
    .from('experiences')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (!experience || experience.workspace_id !== workspace.id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('experiences')
    .update({ content })
    .eq('id', id)
    .eq('workspace_id', workspace.id)

  if (error) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
