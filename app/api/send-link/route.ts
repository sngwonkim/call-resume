import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

console.log('=== send-link module loaded ===')
console.log('ENV CHECK:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 20),
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasResendKey: !!process.env.RESEND_API_KEY,
})

export async function POST(req: NextRequest) {
  console.log('=== POST handler called ===')

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const { Resend } = await import('resend')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { email } = await req.json()
    console.log('email:', email)

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('workspaces')
      .select('token')
      .eq('email', email)
      .single()

    let token: string

    if (existing) {
      token = existing.token
    } else {
      token = crypto.randomBytes(16).toString('hex')
      const { error } = await supabaseAdmin
        .from('workspaces')
        .insert({ email, token })

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: '워크스페이스 생성 실패', detail: error.message }, { status: 500 })
      }
    }

    const link = `${process.env.NEXT_PUBLIC_APP_URL}/${token}`
    console.log('link:', link)

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '내 이력서 공간 링크가 도착했어요 :)',
      html: `
        <p>안녕하세요!</p>
        <p>아래 링크로 이력서 공간에 접속할 수 있어요:</p>
        <p><a href="${link}" style="font-size:18px;font-weight:bold;">${link}</a></p>
        <p>링크를 북마크해두거나 저장해두세요. 나중에 잃어버리면 이 메일에서 다시 찾으면 돼요 :)</p>
      `,
    })
    console.log('Resend result:', result)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('=== ERROR ===', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
