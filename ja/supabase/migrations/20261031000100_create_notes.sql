-- 1つ目のマイグレーション: Row Level Security を有効にした小さな「notes」テーブル。
-- （このデモ用のダミーのテーブルです。実データではありません。）
create table public.notes (
  id bigint generated always as identity primary key,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- ログイン済みのユーザーなら誰でもノートを読めます。API 経由の書き込みは、今のところ誰にもできません。
create policy "notes are readable by signed-in users"
  on public.notes for select
  to authenticated
  using (true);
