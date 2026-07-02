'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Experience } from '@/types'

interface Props {
  params: Promise<{ token: string; session_id: string }>
}

export default function ResultPage({ params }: Props) {
  const { token, session_id } = use(params)
  const router = useRouter()

  const [experience, setExperience] = useState<Experience | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('token', token)
        .single()

      if (!workspace) {
        setError('유효하지 않은 링크예요')
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('experiences')
        .select('*')
        .eq('session_id', session_id)
        .eq('workspace_id', workspace.id)
        .single()

      if (!data) {
        setError('결과를 찾을 수 없어요')
        setLoading(false)
        return
      }

      setExperience(data)
      setContent(data.content)
      setLoading(false)
    }
    load()
  }, [token, session_id])

  const handleSave = async () => {
    if (!experience) return
    setSaving(true)
    setSaved(false)

    const res = await fetch(`/api/experience/${experience.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, token }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleDownload = () => {
    if (!experience) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${experience.title}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">불러오는 중...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <p className="text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push(`/${token}`)}
            className="text-neutral-600 hover:text-neutral-400 text-sm transition"
          >
            ← 홈으로
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-sm hover:bg-neutral-700 disabled:opacity-50 transition"
            >
              {saving ? '저장 중...' : saved ? '저장됨 ✓' : '저장'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition"
            >
              .md 다운로드
            </button>
          </div>
        </div>

        {experience && (
          <p className="text-neutral-500 text-xs font-mono mb-4">{experience.title}.md</p>
        )}

        {/* 편집 가능한 텍스트 영역 */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            setSaved(false)
          }}
          className="w-full min-h-[70vh] bg-neutral-900 text-neutral-200 text-sm font-mono leading-relaxed rounded-2xl px-6 py-5 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-700"
          spellCheck={false}
        />
      </div>
    </main>
  )
}
