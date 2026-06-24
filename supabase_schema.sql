-- Supabase SQL Editor에 붙여넣고 실행하세요

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now()
);

create table call_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  transcript text,
  status text default 'recording',
  created_at timestamptz default now()
);

create table resume_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  session_id uuid references call_sessions(id) on delete set null,
  category text not null,
  content text not null,
  keywords text[] default '{}',
  job_tags text[] default '{}',
  created_at timestamptz default now()
);

-- RLS: token 기반 익명 접근 허용
alter table workspaces enable row level security;
alter table call_sessions enable row level security;
alter table resume_items enable row level security;

create policy "token으로 workspace 조회" on workspaces
  for select using (true);

create policy "workspace_id로 sessions 관리" on call_sessions
  for all using (true);

create policy "workspace_id로 items 관리" on resume_items
  for all using (true);
