-- 修正済み: 「if not exists」を付けたので、列がすでに存在していても安全に実行できます。
alter table public.notes add column if not exists author text;
