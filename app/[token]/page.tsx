'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  params: Promise<{ token: string }>
}

export default function GuidePage({ params }: Props) {
  const { token } = use(params)
  const [valid, setValid] = useState<boolean | null>(null)

  useEffect(() => {
    supabase
      .from('workspaces')
      .select('id')
      .eq('token', token)
      .single()
      .then(({ data }) => setValid(!!data))
  }, [token])

  if (valid === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950">
        <p className="text-neutral-500">불러오는 중...</p>
      </main>
    )
  }

  if (!valid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <p className="text-red-400">유효하지 않은 링크예요</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-white font-bold text-xl mb-10">call_resume</h1>

        {/* 서비스 소개 */}
        <div className="bg-neutral-900 rounded-2xl p-6 mb-6">
          <p className="text-neutral-300 leading-relaxed text-sm">
            안녕하세요, 개발 시점 기준 취준 중인 사람입니다. 이력 정리를 위한 글쓰기보다 친구와의 경험에 대한 수다가 훨씬 쉬운 점에서 착안하여 통화하며 이야기하면 이력을 위한 글로 정리해주는 서비스를 만들었습니다. 좋은 결과 있길 기원합니다! 화이팅!
          </p>
        </div>

        {/* 사용법 */}
        <div className="bg-neutral-900 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="text-white font-semibold text-base mb-4">사용 방법</h2>
          <ol className="space-y-3">
            {[
              '통화는 경험/프로젝트 단위로 진행해주세요.',
              '포맷을 적절히 채우는 데에 필요한 정보를 얻기 위해 꼬리질문을 던질 수 있습니다.',
              '발화를 5초 이상 중단하면 다음 질문으로 넘어갈 수 있지만, 자연스럽게 대화하듯 "아 앞에 질문 마저 대답할게" 하고 계속하셔도 됩니다.',
              '통화를 종료하면, 처리 과정을 거친 후 포맷팅된 내용이 나옵니다.',
              '간단히 수정 가능합니다.',
              '.md 파일로 저장 가능합니다.',
              '진행하시려면 통화 버튼을 눌러 전화를 걸어주세요.',
            ].map((text, i) => (
              <li key={i} className="flex gap-3 text-sm text-neutral-400 leading-relaxed">
                <span className="text-neutral-600 shrink-0 font-mono">{i + 1}.</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 통화 시작 버튼 */}
        <Link
          href={`/${token}/call`}
          className="block w-full py-4 rounded-2xl bg-white text-black font-semibold text-center hover:bg-neutral-200 transition"
        >
          통화 시작하기
        </Link>
      </div>
    </main>
  )
}
