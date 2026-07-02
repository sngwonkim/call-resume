'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createSpeechRecognition } from '@/lib/speech'

interface Props {
  params: Promise<{ token: string }>
}

type Step = 'naming' | 'idle' | 'recording' | 'followup' | 'answering' | 'processing' | 'done' | 'error'

interface QA {
  q: string
  a: string
}

function formatDate(d: Date) {
  const yy = d.getFullYear().toString().slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

export default function CallPage({ params }: Props) {
  const { token } = use(params)
  const router = useRouter()

  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('naming')
  const [experienceName, setExperienceName] = useState('')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [error, setError] = useState('')

  const speechRef = useRef<ReturnType<typeof createSpeechRecognition>>(null)
  const fullTranscriptRef = useRef('')
  const transcriptBoxRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  useEffect(() => {
    supabase
      .from('workspaces')
      .select('id')
      .eq('token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('유효하지 않은 링크예요')
          setStep('error')
          return
        }
        setWorkspaceId(data.id)
      })
  }, [token])

  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight
    }
  }, [transcript, interimText])

  const startCall = async () => {
    if (!workspaceId || !experienceName.trim()) return

    const { data: session, error: err } = await supabase
      .from('call_sessions')
      .insert({ workspace_id: workspaceId, status: 'recording', transcript: '' })
      .select('id')
      .single()

    if (err || !session) {
      setError('세션 시작 실패')
      setStep('error')
      return
    }

    setSessionId(session.id)
    setStep('recording')
    fullTranscriptRef.current = ''
    setElapsedSeconds(0)
    timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000)

    const speech = createSpeechRecognition({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          fullTranscriptRef.current += text + ' '
          setTranscript(fullTranscriptRef.current)
          setInterimText('')
        } else {
          setInterimText(text)
        }
      },
      onSilence: () => {},
      onError: (msg) => {
        setError(msg)
        setStep('error')
      },
    })

    speechRef.current = speech
    speech?.start()
  }

  const endCall = async () => {
    speechRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)

    if (!sessionId) return

    await supabase
      .from('call_sessions')
      .update({ transcript: fullTranscriptRef.current })
      .eq('id', sessionId)

    setStep('followup')

    const res = await fetch('/api/follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: fullTranscriptRef.current,
        experience_name: experienceName,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setQuestions(data.questions ?? [])
      setAnswers((data.questions ?? []).map(() => ''))
    } else {
      setQuestions([])
      setAnswers([])
    }
    setStep('answering')
  }

  const submitAnswers = async () => {
    if (!sessionId || !workspaceId) return
    setStep('processing')

    const followUpQAs: QA[] = questions.map((q, i) => ({ q, a: answers[i] ?? '' }))
    const date = formatDate(new Date())

    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        workspace_id: workspaceId,
        experience_name: experienceName,
        follow_up_qas: followUpQAs,
        date,
      }),
    })

    if (res.ok) {
      setStep('done')
      setTimeout(() => router.push(`/${token}/result/${sessionId}`), 1500)
    } else {
      setError('정리 중 오류가 발생했어요')
      setStep('error')
    }
  }

  if (step === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button onClick={() => router.back()} className="text-sm text-white/40 underline">
            돌아가기
          </button>
        </div>
      </main>
    )
  }

  if (step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-white text-xl font-semibold">정리 완료</p>
          <p className="text-white/40 mt-2 text-sm">결과 페이지로 이동할게요</p>
        </div>
      </main>
    )
  }

  if (step === 'processing') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium">정리하는 중이에요</p>
          <p className="text-white/40 mt-1 text-sm">AI가 포맷에 맞게 작성하고 있어요</p>
        </div>
      </main>
    )
  }

  /* 꼬리질문 답변 화면 */
  if (step === 'followup' || step === 'answering') {
    const loading = step === 'followup'
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12">
        <div className="max-w-xl mx-auto">
          <h2 className="text-white font-semibold text-lg mb-2">보충 질문</h2>
          <p className="text-neutral-500 text-sm mb-8">
            포맷을 더 잘 채우기 위한 질문이에요. 모르면 비워두셔도 됩니다.
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-neutral-900 rounded-2xl p-5 animate-pulse">
                  <div className="h-4 bg-neutral-800 rounded w-3/4 mb-3" />
                  <div className="h-16 bg-neutral-800 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="bg-neutral-900 rounded-2xl p-5">
                  <p className="text-neutral-300 text-sm mb-3">{q}</p>
                  <textarea
                    value={answers[i]}
                    onChange={(e) => {
                      const next = [...answers]
                      next[i] = e.target.value
                      setAnswers(next)
                    }}
                    rows={3}
                    placeholder="답변을 입력해주세요 (선택)"
                    className="w-full bg-neutral-800 text-white text-sm rounded-xl px-4 py-3 resize-none placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <button
              onClick={submitAnswers}
              className="mt-8 w-full py-4 rounded-2xl bg-white text-black font-semibold hover:bg-neutral-200 transition"
            >
              정리 시작하기
            </button>
          )}
        </div>
      </main>
    )
  }

  /* 경험명 입력 화면 */
  if (step === 'naming') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-white text-xl font-semibold mb-2 text-center">어떤 경험인가요?</h2>
          <p className="text-white/40 text-sm text-center mb-8">
            프로젝트나 경험의 이름을 간단히 적어주세요
          </p>
          <input
            type="text"
            value={experienceName}
            onChange={(e) => setExperienceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && experienceName.trim() && workspaceId) setStep('idle')
            }}
            placeholder="예: 대학 축제 기획, 인턴십 프로젝트"
            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition mb-4"
            autoFocus
          />
          <button
            onClick={() => setStep('idle')}
            disabled={!experienceName.trim() || !workspaceId}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 disabled:opacity-40 transition"
          >
            다음
          </button>
        </div>
      </main>
    )
  }

  /* idle & recording 화면 */
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-between py-16 px-6 select-none">
      <div className="text-center">
        {step === 'idle'
          ? <p className="text-white/30 text-xs tracking-wide">{experienceName}</p>
          : <p className="text-green-400 text-sm font-mono tracking-widest">{formatTime(elapsedSeconds)}</p>
        }
      </div>

      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          {step === 'idle' && (
            <>
              <span className="absolute w-36 h-36 rounded-full bg-white/5 animate-ping" />
              <span className="absolute w-28 h-28 rounded-full bg-white/10" />
            </>
          )}
          <div className="relative w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center z-10">
            <svg className="w-12 h-12 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-white text-3xl font-semibold tracking-tight">call_resume</h1>
          <p className="text-white/40 text-base mt-1">
            {step === 'idle' ? '이력서 AI' : '말하고 있어요...'}
          </p>
        </div>

        {step === 'recording' && (
          <div
            ref={transcriptBoxRef}
            className="w-full max-w-xs max-h-40 overflow-y-auto text-center px-4"
          >
            <span className="text-white/50 text-sm leading-relaxed">{transcript}</span>
            <span className="text-white/25 text-sm">{interimText}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {step === 'idle' ? (
          <>
            <button
              onClick={startCall}
              disabled={!workspaceId}
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-green-500/30"
            >
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
              </svg>
            </button>
            <span className="text-white/30 text-xs">탭하여 통화 시작</span>
          </>
        ) : (
          <>
            <button
              onClick={endCall}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-red-500/30"
            >
              <svg className="w-9 h-9 text-white rotate-135" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" />
              </svg>
            </button>
            <span className="text-white/30 text-xs">통화 끝내기</span>
          </>
        )}
      </div>
    </main>
  )
}
