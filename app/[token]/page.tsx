'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ResumeItem, JobTag, Category, CATEGORIES, JOB_TAGS } from '@/types'

interface Props {
  params: Promise<{ token: string }>
}

export default function DashboardPage({ params }: Props) {
  const { token } = use(params)

  const [items, setItems] = useState<ResumeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTags, setSelectedTags] = useState<JobTag[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')

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
        .from('resume_items')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })

      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [token])

  const toggleTag = (tag: JobTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const filtered = items.filter((item) => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory
    const tagMatch = selectedTags.length === 0 || selectedTags.some((t) => item.job_tags.includes(t))
    return categoryMatch && tagMatch
  })

  const exportMarkdown = () => {
    const lines = filtered.map((item) =>
      `## [${item.category}] ${item.job_tags.join(', ')}\n\n${item.content}\n\n**키워드:** ${item.keywords.join(', ')}\n`
    )
    const md = `# 이력서 재료\n\n${lines.join('\n---\n\n')}`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume_materials.md'
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
    <main className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white font-bold text-xl">call_resume</h1>
          <div className="flex gap-3">
            {filtered.length > 0 && (
              <button
                onClick={exportMarkdown}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-sm hover:bg-neutral-700 transition"
              >
                .md 내보내기
              </button>
            )}
            <Link
              href={`/${token}/call`}
              className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition"
            >
              🎙️ 새 통화
            </Link>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              selectedCategory === 'all'
                ? 'bg-white text-black font-medium'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            전체
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                selectedCategory === cat
                  ? 'bg-white text-black font-medium'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 직무 태그 필터 */}
        <div className="flex gap-2 flex-wrap mb-8">
          {JOB_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs transition ${
                selectedTags.includes(tag)
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* 아이템 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-600 mb-4">
              {items.length === 0 ? '아직 정리된 내용이 없어요 :)' : '필터에 맞는 항목이 없어요'}
            </p>
            {items.length === 0 && (
              <Link
                href={`/${token}/call`}
                className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition"
              >
                첫 통화 시작하기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-2xl bg-neutral-900 p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400">
                    {item.category}
                  </span>
                  <div className="flex gap-1 flex-wrap justify-end ml-2">
                    {item.job_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                  {item.content}
                </div>
                {item.keywords.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {item.keywords.map((kw) => (
                      <span key={kw} className="text-xs text-neutral-600 bg-neutral-800 px-2 py-0.5 rounded">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
