-- Deliberately broken: the column "author" already exists, so this must fail.
alter table public.notes add column author text;
