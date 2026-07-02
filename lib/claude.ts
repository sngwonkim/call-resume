import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface QA {
  q: string
  a: string
}

export async function generateFollowUpQuestions(
  transcript: string,
  experienceName: string
): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `다음은 "${experienceName}"이라는 경험에 대해 사용자가 자유롭게 말한 내용이야.

발화 내용:
"""
${transcript}
"""

이 내용을 아래 이력서 포맷에 채워 넣으려고 해:
- 한 줄 요약 (무엇을, 누구를 위해, 어떤 결과로)
- 맥락 (왜 시작했나, 어떤 문제·기회였나, 시작 시점 조건)
- 내 역할 (내가 직접 한 것)
- 성과·지표 (구체적 숫자, 파트너십, 참여자 수, 규모 성장, 재참여율, 도달 등)
- 이 경험이 증명하는 역량
- 접근·방법 (어떻게 했나, 협상/기획/실행 과정의 구체적 판단)
- 연결된 역량
- 관련 정보 (연도, 조직, 사람, 연관 프로젝트)
- 회고 (잘된 것/막힌 것/다음엔)

발화 내용에서 불분명하거나 빠진 정보를 채우기 위해 꼭 필요한 보충 질문 3~5개를 만들어줘.
이미 말한 내용을 다시 묻지 말고, 정말 없는 정보만 물어봐.

반드시 아래 JSON 형식으로만 응답해. 다른 말은 하지 마:
["질문1", "질문2", "질문3"]`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as string[]
}

export async function processExperience(
  transcript: string,
  experienceName: string,
  followUpQAs: QA[],
  date: string
): Promise<string> {
  const qaSection = followUpQAs.length > 0
    ? `\n\n추가 정보 (보충 질문 및 답변):\n${followUpQAs.map(({ q, a }) => `Q: ${q}\nA: ${a}`).join('\n\n')}`
    : ''

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `다음은 "${experienceName}"이라는 경험에 대한 정보야.

발화 내용:
"""
${transcript}
"""${qaSection}

이 내용을 아래 이력서 포맷에 맞게 마크다운으로 작성해줘.
정보가 없는 항목은 채우지 말고 "—" 으로 표시해.
성과·지표는 실제로 언급된 숫자만 써. 지어내지 마.

반드시 아래 포맷 그대로 출력해. 다른 말은 하지 마:

---
title: ${experienceName}
date: ${date}
---

> [!summary] 한 줄 요약. 무엇을, 누구를 위해, 어떤 결과로. 포폴 카드에 그대로 들어갈 한 문장.

## 맥락

- 왜 시작했나 / 어떤 문제·기회였나
- 시작 시점 조건: 예산, 오디언스, 리소스 — _제로베이스였다면 여기 명시_

## 내 역할

- 1인칭, 동사로. 내가 직접 한 것만.

## 성과·지표

> [!tip] 커뮤니티·에코시스템 그로스 언어로. 숫자가 소박해도 실제 숫자를 적을 것. 지어내지 말 것.

- 파트너십·연결:
- 참여자:
- 규모 성장:
- 재참여·유지:
- 도달:
- 조건 대비:

## 이 경험이 증명하는 것

- BD 관점 해석 한 줄:

## 접근·방법

- 어떻게 했나.

## 연결된 역량

-

## 관련

- 연도:
- 조직:
- 사람:
- 연관 프로젝트:

## 회고

- 잘된 것 / 막힌 것 / 다음엔`,
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return text.trim()
}
