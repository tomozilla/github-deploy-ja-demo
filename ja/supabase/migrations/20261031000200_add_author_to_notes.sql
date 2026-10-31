-- 2つ目のマイグレーション: ノートの書き手を表す列と、ダミーのサンプル2行を追加します。
alter table public.notes add column author text not null default 'unknown';

-- サンプルの中身（日本語の意味）: 「マイグレーションファイルから書いた最初のノート」「2つ目のサンプルノート」
insert into public.notes (body, author) values
  ('First note written from a migration file', 'sample-user-a'),
  ('Second sample note', 'sample-user-b');
