-- Fixed: "if not exists" makes this safe to run even though the column exists.
alter table public.notes add column if not exists author text;
