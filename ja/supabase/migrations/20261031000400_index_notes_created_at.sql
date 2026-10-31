-- まったく問題のないマイグレーション。壊れたマイグレーションがまだリポジトリに残っている間にマージされました。
create index notes_created_at_idx on public.notes (created_at);
