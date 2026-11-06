-- Datei: supabase/pruefung.sql
-- Schutz vor erfundenen Läufen und anstößigen Spitznamen (Prüfung 6.11., ROADMAP „Prüfung“).
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
-- Erneut ausführen ist unschädlich. Setzt rangliste.sql und online.sql voraus.
--
-- 1) Läufe: Wer „100 richtig in 1 ms“ einreicht, wird abgelehnt. Mehr als ein Treffer je
--    0,4 Sekunden ist nicht zu schaffen (der Zeit-Sprint dauert 30 Sekunden, ≈ 40 Treffer sind
--    schon sehr gut). Der Zeit-Sprint endet nach 30 Sekunden (+ etwas Luft).
-- 2) Namen: einfacher Wortfilter (Groß/Klein, Leerzeichen, Zahlen als Buchstaben werden
--    ignoriert). Bewusst kurz; die Liste lässt sich unten jederzeit erweitern.

-- ── 1) Läufe ─────────────────────────────────────────────────────────────
create or replace function public.submit_online_run(
  p_player uuid, p_mode text, p_day text, p_code text, p_correct integer, p_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  if p_mode not in ('sprint', 'survival') then
    raise exception 'falscher Modus';
  end if;
  -- Je Wurf 3 Zeichen; mehr Treffer als Würfe geht nicht
  if length(p_code) % 3 <> 0 or p_correct > length(p_code) / 3 then
    raise exception 'ungültiger Lauf';
  end if;
  -- Schneller als ein Treffer je 0,4 s ist nicht zu schaffen
  if p_correct > p_ms / 400 + 1 then
    raise exception 'unplausibler Lauf';
  end if;
  -- Zeit-Sprint: 30 Sekunden (+ Luft für die Übertragung)
  if p_mode = 'sprint' and p_ms > 31000 then
    raise exception 'unplausibler Lauf';
  end if;
  -- nur heute (±1 Tag wegen Zeitzonen)
  if p_day !~ '^\d{4}-\d{2}-\d{2}$' or p_day::date not between current_date - 1 and current_date + 1 then
    raise exception 'falscher Tag';
  end if;
  insert into online_runs (mode, day, player, code, correct, ms)
  values (p_mode, p_day, p_player, lower(p_code), p_correct, p_ms)
  on conflict (mode, day, player) do update
    set code = excluded.code, correct = excluded.correct, ms = excluded.ms, created_at = now()
    where excluded.correct > online_runs.correct;
end;
$$;

grant execute on function public.submit_online_run(uuid, text, text, text, integer, integer) to anon, authenticated;

-- Schon eingereichte, unmögliche Läufe entfernen (zuerst mit select ansehen, dann löschen):
--   select mode, day, correct, ms from online_runs where correct > ms / 400 + 1;
--   delete from online_runs where correct > ms / 400 + 1;

-- ── 2) Namen ─────────────────────────────────────────────────────────────
-- Name vereinfachen: klein, Umlaute/ß ausgeschrieben, Ziffern/Zeichen als Buchstaben, ohne Trenner
create or replace function public.simplify_name(p_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      replace(replace(replace(replace(lower(p_name), 'ß', 'ss'), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'),
      '013457@$',
      'oieasta' || 's'
    ),
    '[ _.\-]', '', 'g'
  );
$$;

-- Wortliste (Teilstücke des vereinfachten Namens). Gern erweitern.
create table if not exists public.blocked_words (word text primary key);
alter table public.blocked_words enable row level security;
revoke all on public.blocked_words from anon, authenticated;

insert into public.blocked_words (word) values
  ('nazi'), ('hitler'), ('heilhitler'), ('wichser'), ('hurensohn'), ('arschloch'), ('fotze'),
  ('schlampe'), ('scheisse'), ('ficker'), ('ficken'), ('nigger'), ('nigga'), ('fuck'),
  ('bitch'), ('cunt'), ('kanake'), ('vergewalt')
on conflict do nothing;

create or replace function public.name_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from blocked_words w where position(w.word in simplify_name(p_name)) > 0
  );
$$;

-- Spitzname setzen: wie bisher, plus Wortfilter
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
  if not name_allowed(clean) then
    raise exception 'ungültiger Name';
  end if;
  insert into players (id, name) values (p_player, clean)
  on conflict (id) do update set name = excluded.name, updated_at = now();
end;
$$;

grant execute on function public.set_name(uuid, text) to anon, authenticated;

-- Schon vergebene, unpassende Namen zurücksetzen (zuerst ansehen, dann ändern):
--   select id, name from players where not name_allowed(name);
--   update players set name = 'Spieler ' || (1000 + floor(random() * 9000))::int where not name_allowed(name);
