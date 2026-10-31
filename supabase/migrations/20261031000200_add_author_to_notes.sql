-- Second migration: who wrote the note, plus two fake sample rows.
alter table public.notes add column author text not null default 'unknown';

insert into public.notes (body, author) values
  ('First note written from a migration file', 'sample-user-a'),
  ('Second sample note', 'sample-user-b');
