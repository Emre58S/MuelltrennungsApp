-- Datei: supabase/rangliste.sql
-- Ranglisten für Mülltrennung (anonym, ohne Login).
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
--
-- Datenschutz: gespeichert werden nur ein selbst gewählter Spitzname und
-- Punktzahlen. Die zufällige Geräte-ID (player) verlässt die Datenbank nie
-- wieder – Abfragen liefern nur „das bist du“ (is_me). So kann niemand die
-- Namen oder Ergebnisse anderer ändern.
-- Direkter Zugriff auf die Tabellen ist gesperrt; alles läuft über die
-- Funktionen unten (sie prüfen die Eingaben).

create table if not exists public.players (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 16),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  board text not null check (char_length(board) between 1 and 40),
  player uuid not null references public.players (id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  created_at timestamptz not null default now()
);

create index if not exists scores_board_score on public.scores (board, score desc);
create index if not exists scores_board_player on public.scores (board, player);

-- Kein direkter Zugriff: nur über die Funktionen
alter table public.players enable row level security;
alter table public.scores enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.scores from anon, authenticated;

-- Spitzname setzen oder ändern (legt den Spieler beim ersten Mal an)
create or replace function public.set_name(p_player uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := btrim(p_name);
begin
  if char_length(clean) not between 2 and 16 or clean !~ '^[[:alnum:] _.\-äöüÄÖÜß]+$' then
    raise exception 'ungültiger Name';
  end if;
  insert into players (id, name) values (p_player, clean)
  on conflict (id) do update set name = excluded.name, updated_at = now();
end;
$$;

-- Ergebnis eintragen (Bretter: zielwurf, zeit, runden, tagesaufgabe:JJJJ-MM-TT,
-- tagestrick:JJJJ-MM-TT)
create or replace function public.submit_score(p_player uuid, p_board text, p_score integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_board !~ '^(zielwurf|zeit|runden|tagesaufgabe:\d{4}-\d{2}-\d{2}|tagestrick:\d{4}-\d{2}-\d{2})$' then
    raise exception 'unbekannte Rangliste';
  end if;
  if p_score < 0 or p_score > 1000000 then
    raise exception 'ungültige Punktzahl';
  end if;
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  insert into scores (board, player, score) values (p_board, p_player, p_score);
end;
$$;

-- Bestenliste: bester Wert je Spieler, mit Platz (gleiche Punkte = gleicher Platz)
create or replace function public.top_scores(p_board text, p_player uuid, p_limit integer default 50)
returns table (rank bigint, name text, score integer, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select s.player, max(s.score) as score
    from scores s
    where s.board = p_board
    group by s.player
  )
  select rank() over (order by b.score desc), p.name, b.score, b.player = p_player
  from best b
  join players p on p.id = b.player
  order by b.score desc, p.name
  limit greatest(1, least(p_limit, 100));
$$;

-- Eigener Platz (auch wenn man nicht in den Top 50 ist)
create or replace function public.my_rank(p_board text, p_player uuid)
returns table (rank bigint, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select s.player, max(s.score) as score
    from scores s
    where s.board = p_board
    group by s.player
  ),
  ranked as (
    select player, score, rank() over (order by score desc) as rank from best
  )
  select rank, score from ranked where player = p_player;
$$;

grant execute on function public.set_name(uuid, text) to anon, authenticated;
grant execute on function public.submit_score(uuid, text, integer) to anon, authenticated;
grant execute on function public.top_scores(text, uuid, integer) to anon, authenticated;
grant execute on function public.my_rank(text, uuid) to anon, authenticated;
