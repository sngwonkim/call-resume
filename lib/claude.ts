import Anthropic from '@anthropic-ai/sdk'
import { Category, JobTag, JOB_TAGS, CATEGORIES } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ProcessedItem {
  category: Category
  content: string
  keywords: string[]
  job_tags: JobTag[]
}

export async function processTranscript(transcript: string): Promise<ProcessedItem[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `다음은 사용자가 이력서 재료를 정리하기 위해 자유롭게 말한 내용이야.
이 내용을 이력서 항목별로 분류하고 정리해줘.

발화 내용:
"""
${transcript}
"""

다음 카테고리로 분류해:
${CATEGORIES.join(', ')}

각 항목에 대해 아래 직무 태그 중 관련성 높은 것 1~3개를 골라줘:
${JOB_TAGS.join(', ')}

반드시 아래 JSON 형식으로만 응답해. 다른 말은 하지 마:
[
  {
    "category": "카테고리명",
    "content": "마크다운 형식으로 조리있게 정리된 내용",
    "keywords": ["핵심키워드1", "핵심키워드2"],
    "job_tags": ["직무태그1", "직무태그2"]
  }
]

주의:
- content는 불릿 포인트나 굵은 글씨 등 마크다운을 적극 활용해서 읽기 좋게 정리해줘
- 같은 카테고리라도 맥락이 다르면 항목을 분리해줘
- 분류하기 애매한 내용은 기타로 넣어줘
- 이력서와 무관한 잡담은 제외해줘`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as ProcessedItem[]
}
