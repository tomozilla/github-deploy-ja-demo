-- First migration: a tiny "notes" table with Row Level Security turned on.
-- (Fake sample table for this demo; nothing real.)
create table public.notes (
  id bigint generated always as identity primary key,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Anyone signed in may read notes; nobody can write through the API yet.
create policy "notes are readable by signed-in users"
  on public.notes for select
  to authenticated
  using (true);
