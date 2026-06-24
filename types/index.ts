export type Category =
  | '직무경험'
  | '프로젝트'
  | '스킬·역량'
  | '교육'
  | '수상·자격증'
  | '기타'

export type JobTag =
  | '마케팅'
  | '브랜딩'
  | '콘텐츠·카피'
  | '기획·PM'
  | 'PR·홍보'
  | '영업·BD'
  | 'HR·채용'
  | '리서치·분석'
  | '운영·어드민'
  | 'CS·고객관리'

export const CATEGORIES: Category[] = [
  '직무경험', '프로젝트', '스킬·역량', '교육', '수상·자격증', '기타',
]

export const JOB_TAGS: JobTag[] = [
  '마케팅', '브랜딩', '콘텐츠·카피', '기획·PM', 'PR·홍보',
  '영업·BD', 'HR·채용', '리서치·분석', '운영·어드민', 'CS·고객관리',
]

export interface Workspace {
  id: string
  email: string
  token: string
  created_at: string
}

export interface CallSession {
  id: string
  workspace_id: string
  transcript: string | null
  status: 'recording' | 'processing' | 'done'
  created_at: string
}

export interface ResumeItem {
  id: string
  workspace_id: string
  session_id: string | null
  category: Category
  content: string
  keywords: string[]
  job_tags: JobTag[]
  created_at: string
}
