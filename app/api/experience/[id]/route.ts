import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params
  const { content } = await req.json()

  if (!content) {
    return NextResponse.json({ error: 'content 필요' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('experiences')
    .update({ content })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '저장 실패', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
