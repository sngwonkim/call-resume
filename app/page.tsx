'use client'

import { useState } from 'react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '오류가 발생했어요')
        setStatus('error')
        return
      }

      setStatus('sent')
    } catch {
      setError('네트워크 오류가 발생했어요')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6">📬</div>
          <h1 className="text-2xl font-bold text-white mb-3">링크 보냈어요 :)</h1>
          <p className="text-neutral-400">
            <span className="text-white font-medium">{email}</span>으로 접속 링크를 보냈어요.
            <br />메일함을 확인해보세요!
          </p>
          <button
            onClick={() => { setStatus('idle'); setEmail('') }}
            className="mt-6 text-sm text-neutral-500 underline"
          >
            다른 이메일로 시도하기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">call_resume</h1>
          <p className="text-neutral-400 leading-relaxed">
            그냥 전화하듯 떠들면<br />
            이력서 재료로 정리해드려요 :)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 disabled:opacity-50 transition"
          >
            {status === 'loading' ? '보내는 중...' : '링크 받기'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600">
          계정 없이 이메일 하나로 시작해요. 링크가 곧 내 공간이에요.
        </p>
      </div>
    </main>
  )
}
