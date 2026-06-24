# call_resume 프로젝트 스펙
_마지막 업데이트: 2026-05-20_

---

## 한줄 요약
말하듯 떠들면 AI가 이력서 재료를 정리해주는 웹앱

## 배경 / 문제
이력서·자소서 쓰려면 경험 정리가 먼저인데, 타이핑으로 하는 게 막막하고 귀찮다.
그냥 전화하듯 말하면 뒤에서 알아서 정리해주는 게 있으면 쓰겠다.
나중에 배포도 하면 좋고.

---

## 결정된 것들

### 입력 방식
- 실시간 음성 통화처럼 — 사용자가 쭉~ 말함
- "전화 틀어놓고 신세한탄하는" 느낌. 조리없이 말해도 OK
- AI가 중간에 끼어드는 건 최소화
- silence detection: 3~5초 침묵 감지 시 짧은 리액션 ("음... 계속해요" 류)
- 실시간 STT 텍스트를 화면에 흘려보여줌 (말하면서 내용이 쌓이는 느낌)

### STT 엔진
- MVP: Web Speech API (무료, 세팅 간단)
- 한국어 정확도 문제 확인되면 Deepgram으로 교체 (분당 ~$0.006)
- 배포 전 정확도 테스트 후 최종 결정

### 결과물 — 카테고리 구성
문과/인문계 직무 타겟. 6개 항목으로 분류:

1. **직무경험** — 회사/기관, 기간, 역할, 성과
2. **프로젝트** — 무엇을, 어떻게, 결과
3. **스킬/역량** — 툴, 소프트스킬, 외국어 등
4. **교육** — 학교, 전공, 수료
5. **수상/자격증**
6. **기타** — 분류 애매한 것들

### 직무 태그 시스템
각 항목에 AI가 자동으로 직무 태그를 붙여줌 — "이 경험은 이런 직무에 잘 맞아요" 제안 형태.

태그 후보 (문과 직무 기준):
- 마케팅 / 브랜딩
- 콘텐츠 / 카피라이팅
- 기획 / PM
- PR / 홍보
- 영업 / BD
- HR / 채용
- 리서치 / 분석
- 운영 / 어드민
- CS / 고객관리
- 커뮤니케이션 (범용)

사용 방식:
- 통화 세션 종료 후 AI가 각 항목에 태그 1~3개 자동 제안
- 사용자가 확정/수정 가능
- 노트북 화면에서 태그로 필터링해서 "마케팅 지원할 때 쓸 것들만 보기" 가능

### 플랫폼
- 웹앱 (모바일 + 노트북 둘 다)
- 모바일: 음성 입력 / 노트북: 확인·편집·활용
- 둘이 연동되어야 함

### 인증
- 소셜 로그인 X (서비스 무겁게 만들고 싶지 않음)
- 이메일 입력 → 링크 발송 방식
  - 이메일은 "계정" 개념 없이 링크 배달용으로만 사용
  - "링크 다시 보내줘" 기능으로 유실 복구 가능
  - 디바이스 localStorage에도 보관 (같은 기기에서는 링크 불필요)

---

### 최종 출력
- 마크다운(.md) 내보내기
- 태그 필터로 "마케팅 지원용만 뽑기" 같은 선택적 내보내기 가능

### silence detection 톤
- 친근한 톤 — "응, 계속해봐요 :)" 류

---

### 데이터 보관
- 영구 보관 (만료 없음), 사용자가 직접 삭제 가능

---

## 기술 스택 (확정)
- 프론트: Next.js (App Router)
- 백엔드: Supabase (DB + 이메일 발송)
- STT: Web Speech API (MVP) → Deepgram 교체 가능
- AI 정리/분류: Claude API
- 저장: Supabase PostgreSQL
- 스타일: Tailwind CSS

---

## DB 스키마

### workspaces
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| email | text | 링크 발송용 이메일 |
| token | text | URL 접근 토큰 (hex 32자) |
| created_at | timestamptz | |

### call_sessions
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| workspace_id | uuid | FK → workspaces |
| transcript | text | 전체 발화 텍스트 |
| status | text | recording / processing / done |
| created_at | timestamptz | |

### resume_items
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| workspace_id | uuid | FK → workspaces |
| session_id | uuid | FK → call_sessions |
| category | text | 직무경험/프로젝트/스킬·역량/교육/수상·자격증/기타 |
| content | text | 마크다운 정리 내용 |
| keywords | text[] | 핵심 키워드 배열 |
| job_tags | text[] | 직무 태그 배열 |
| created_at | timestamptz | |

---

## 파일 구조
```
call_resume/
├── app/
│   ├── page.tsx                  # 랜딩 (이메일 입력)
│   ├── [token]/
│   │   ├── page.tsx              # 대시보드 (노트북 뷰)
│   │   └── call/
│   │       └── page.tsx          # 통화 화면 (모바일)
├── components/
│   ├── CallScreen.tsx            # 음성 녹음 UI + silence detection
│   ├── TranscriptView.tsx        # 실시간 STT 텍스트 흐름
│   ├── ItemCard.tsx              # 정리된 항목 카드
│   └── TagFilter.tsx             # 직무 태그 필터
├── lib/
│   ├── supabase.ts
│   ├── claude.ts                 # AI 분류/정리 프롬프트
│   └── speech.ts                 # Web Speech API 래퍼
└── app/api/
    ├── process/route.ts          # 통화 종료 후 AI 처리
    └── send-link/route.ts        # 이메일 링크 발송
```

---

### 직무 태그 목록 (확정)
마케팅 / 브랜딩 / 콘텐츠·카피 / 기획·PM / PR·홍보 / 영업·BD / HR·채용 / 리서치·분석 / 운영·어드민 / CS·고객관리

### silence detection
- 5초 침묵 감지 후 친근한 리액션

---

### 이메일 발송
- Resend (무료 플랜 월 3000건, Next.js 연동 깔끔)

---

## 미결
없음 — 스펙 확정 완료
