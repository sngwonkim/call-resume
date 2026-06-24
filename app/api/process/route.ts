import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processTranscript } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { session_id, workspace_id } = await req.json()
  console.log('[process] session_id:', session_id, 'workspace_id:', workspace_id)

  if (!session_id || !workspace_id) {
    return NextResponse.json({ error: 'session_id, workspace_id 필요' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('call_sessions')
    .select('transcript')
    .eq('id', session_id)
    .single()

  console.log('[process] session:', session, 'error:', sessionError)

  if (sessionError) {
    return NextResponse.json({ error: '세션을 찾을 수 없어요', detail: sessionError.message }, { status: 404 })
  }

  await supabaseAdmin
    .from('call_sessions')
    .update({ status: 'processing' })
    .eq('id', session_id)

  const items = await processTranscript(session.transcript)

  const rows = items.map((item) => ({
    workspace_id,
    session_id,
    category: item.category,
    content: item.content,
    keywords: item.keywords,
    job_tags: item.job_tags,
  }))

  const { error: insertError } = await supabaseAdmin
    .from('resume_items')
    .insert(rows)

  if (insertError) {
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }

  await supabaseAdmin
    .from('call_sessions')
    .update({ status: 'done' })
    .eq('id', session_id)

  return NextResponse.json({ success: true, count: rows.length })
}
