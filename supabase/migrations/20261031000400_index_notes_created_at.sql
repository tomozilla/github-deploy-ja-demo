-- A perfectly valid migration, merged while the broken one is still in the repo.
create index notes_created_at_idx on public.notes (created_at);
