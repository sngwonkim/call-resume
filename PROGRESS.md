# call_resume 진행 상황 (2026-05-20)

## 앱 개요
이메일 하나로 접속 → 전화하듯 말하면 → AI가 이력서 재료로 정리해주는 서비스

## 현재 스택
- Next.js 16.2.6 (Turbopack), React 19
- Supabase (DB, 로그인 없이 token 기반)
- Resend (이메일 발송)
- ~~Gemini~~ → **내일 Anthropic Claude로 교체 예정**
- 배포: 아직 로컬 개발 중

---

## 오늘 해결한 것들

### 1. 서버가 안 뜨는 문제 (핵심 원인)
- WSL 안에서 Next.js 서버가 백그라운드로 실행 중이었음
- Windows `taskkill`로는 WSL 프로세스를 못 잡음 → 계속 "프로세스 없음" 에러
- **해결**: WSL에서 `kill <PID>` + `.next` 삭제 후 PowerShell에서 재시작

### 2. `supabaseKey is required` 브라우저 에러
- `lib/supabase.ts`에서 `supabaseAdmin`(서비스 롤 키)을 클라이언트 컴포넌트가 같이 임포트
- 브라우저는 `SUPABASE_SERVICE_ROLE_KEY`를 모름 → 크래시
- **해결**: 파일 분리
  - `lib/supabase.ts` → anon 클라이언트만 (브라우저 안전)
  - `lib/supabase-admin.ts` → admin 클라이언트 (서버 전용)
  - `app/api/process/route.ts`가 `lib/supabase-admin`에서 임포트하도록 수정

### 3. Gemini 모델 404
- `gemini-1.5-flash` deprecated → `gemini-2.0-flash`로 교체했으나 무료 일일 한도 소진

### 4. Call 페이지 UI 전면 개편 (아이폰 통화 스타일)
- 검정 배경, 수신 전화 화면: 펄스 링 + 초록 원형 전화 버튼
- 통화 중: 초록 MM:SS 타이머 + 빨간 원형 종료 버튼

### 5. Turbopack 워크스페이스 루트 경고 수정
- `next.config.ts`에 `turbopack.root: path.resolve(__dirname)` 추가

---

## 현재 작동 상태

| 기능 | 상태 |
|------|------|
| 이메일 입력 → 링크 발송 (Resend) | ✅ 작동 |
| Supabase workspace 생성/조회 | ✅ 작동 |
| 통화 화면 (Speech Recognition) | ✅ 작동 |
| 통화 세션 저장 (Supabase) | ✅ 작동 |
| AI 정리 (Gemini → Claude) | ❌ **내일 교체 필요** |
| 대시보드 표시 | ✅ 작동 (데이터만 있으면) |

---

## 내일 할 것 (최우선)

### Gemini → Anthropic Claude 교체

**1. 패키지 설치** (PowerShell)
```powershell
npm install @anthropic-ai/sdk
```

**2. `.env.local` 에 추가**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. `lib/claude.ts` 전체 교체** (아래 코드로 덮어쓰기)
```typescript
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
```

**4. 서버 재시작**
```powershell
npm run dev
```

---

## 서버 실행 주의사항

- 반드시 **Windows PowerShell** 에서 `npm run dev` 실행 (WSL 터미널 아님)
- 이미 실행 중 에러 나면 → PowerShell에서 `netstat -ano | findstr :3000` 으로 PID 찾아 `taskkill /PID <번호> /F`
- 그래도 안 되면 WSL에서: `kill $(ps aux | grep "next dev" | grep -v grep | awk '{print $2}')`

---

## 파일 구조 (주요 파일)
```
call_resume/
├── app/
│   ├── page.tsx                    # 이메일 입력 메인 페이지
│   ├── [token]/
│   │   ├── page.tsx                # 대시보드 (이력서 목록)
│   │   └── call/page.tsx           # 통화 화면 (아이폰 UI)
│   └── api/
│       ├── send-link/route.ts      # 이메일 발송 API
│       └── process/route.ts        # AI 정리 API
├── lib/
│   ├── supabase.ts                 # anon 클라이언트 (브라우저용)
│   ├── supabase-admin.ts           # admin 클라이언트 (서버 전용)
│   ├── claude.ts                   # AI 처리 ← 내일 교체
│   └── speech.ts                   # 음성 인식
├── types/index.ts
├── next.config.ts                  # turbopack.root 설정 포함
├── supabase_schema.sql             # DB 스키마 참고용
└── .env.local                      # 환경변수
```

## Supabase
- 프로젝트: `ldkygmgqesrpxsmyxrwg.supabase.co`
- 테이블: `workspaces`, `call_sessions`, `resume_items`
- RLS: 전체 공개 (token 기반, 로그인 없음)
