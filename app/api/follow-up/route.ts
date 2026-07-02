import { NextRequest, NextResponse } from 'next/server'
import { generateFollowUpQuestions } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { transcript, experience_name } = await req.json()

  if (!transcript || !experience_name) {
    return NextResponse.json({ error: 'transcript, experience_name 필요' }, { status: 400 })
  }

  const questions = await generateFollowUpQuestions(transcript, experience_name)
  return NextResponse.json({ questions })
}
