import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { processExperience, QA } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { session_id, workspace_id, experience_name, follow_up_qas, date } = await req.json()

  if (!session_id || !workspace_id || !experience_name || !date) {
    return NextResponse.json({ error: 'session_id, workspace_id, experience_name, date 필요' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('call_sessions')
    .select('transcript, workspace_id')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: '세션을 찾을 수 없어요' }, { status: 404 })
  }

  if (session.workspace_id !== workspace_id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  await supabaseAdmin
    .from('call_sessions')
    .update({ status: 'processing' })
    .eq('id', session_id)

  const content = await processExperience(
    session.transcript,
    experience_name,
    (follow_up_qas as QA[]) ?? [],
    date
  )

  const title = `${date}_${experience_name}`

  const { error: insertError } = await supabaseAdmin
    .from('experiences')
    .insert({ workspace_id, session_id, title, content })

  if (insertError) {
    return NextResponse.json({ error: '저장 실패', detail: insertError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('call_sessions')
    .update({ status: 'done' })
    .eq('id', session_id)

  return NextResponse.json({ success: true })
}
