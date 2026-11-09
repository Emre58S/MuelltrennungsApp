-- Datei: supabase/datenschutz.sql
-- Datenschutz im Betrieb: Löschen der eigenen Daten, Namen melden, regelmäßig Altes aufräumen.
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → New query → einfügen → Run.
-- Erneut ausführen ist unschädlich. Setzt rangliste.sql, online.sql, ghost.sql, parcours.sql, freunde.sql
-- (alle Tabellen hängen per „on delete cascade“ an players) und pruefung.sql voraus.
--
-- 1) delete_player: Spieler löscht seine Online-Daten selbst (Knopf in den Einstellungen).
-- 2) report_name + reports: Spieler melden einen unpassenden Namen (Pressen und Halten in der Rangliste).
-- 3) cleanup_old_data: löscht Tagesdaten, die niemand mehr braucht, und lange inaktive Spieler.

-- ── 1) Eigene Online-Daten löschen ───────────────────────────────────────
-- Der zufällige Spielercode (UUID) ist wie ein Passwort: nur wer ihn kennt, kann löschen
-- (so wie set_name auch nur mit dem Code geht). Löscht den Spieler und über „on delete cascade“
-- alles, was zu ihm gehört: Ergebnisse, Läufe, Ghost-Läufe, Parcours-Läufe, Freundes-Code,
-- Freundschaften und Sperren.
create or replace function public.delete_player(p_player uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from players where id = p_player;
end;
$$;

grant execute on function public.delete_player(uuid) to anon, authenticated;

-- ── 2) Namen melden ──────────────────────────────────────────────────────
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reporter uuid,                 -- wer gemeldet hat (ohne Fremdschlüssel: Meldung bleibt, auch wenn der Melder gelöscht wird)
  name text not null,            -- der gemeldete Spitzname
  context text not null default '', -- wo gesehen, z. B. „zeit“, „tagesaufgabe:2026-11-09“
  handled boolean not null default false
);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create or replace function public.report_name(p_player uuid, p_name text, p_context text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  if char_length(btrim(p_name)) not between 1 and 40 or char_length(coalesce(p_context, '')) > 60 then
    raise exception 'ungültige Meldung';
  end if;
  -- Missbrauchsschutz: höchstens 10 Meldungen je Spieler und Tag
  if (select count(*) from reports where reporter = p_player and created_at > now() - interval '1 day') >= 10 then
    raise exception 'zu viele Meldungen';
  end if;
  insert into reports (reporter, name, context) values (p_player, btrim(p_name), coalesce(p_context, ''));
end;
$$;

grant execute on function public.report_name(uuid, text, text) to anon, authenticated;

-- Meldungen ansehen und bearbeiten (nur du, im SQL-Editor oder Table Editor):
--   select created_at, name, context from reports where not handled order by created_at desc;
-- Namen zurücksetzen (alle Spieler mit genau diesem Namen):
--   update players set name = 'Spieler ' || (1000 + floor(random() * 9000))::int where name = 'GEMELDETER NAME';
-- Spieler ganz entfernen:
--   delete from players where name = 'GEMELDETER NAME';
-- Meldung als erledigt markieren:
--   update reports set handled = true where name = 'GEMELDETER NAME';

-- ── 3) Aufräumen ─────────────────────────────────────────────────────────
-- Löscht
--   • Ghost-Läufe und Parcours-Läufe, die älter als 30 Tage sind (sie werden nur für den jeweiligen Tag gebraucht),
--   • Tages-Ergebnisse (Tagesaufgabe/Tagestrick) älter als 30 Tage,
--   • Spieler, die seit p_months Monaten nichts mehr getan haben (kein Ergebnis, kein Lauf, kein Name geändert).
-- NICHT gelöscht werden die Läufe für „Gegen die Zeit“/„Ohne Fehler“ und die festen Ranglisten
-- (Zielwurf, Zeit, Runden), weil die Wochen- und Gesamtlisten sie brauchen.
create or replace function public.cleanup_old_data(p_months integer default 24)
returns table (ghost_runs_deleted integer, parcours_runs_deleted integer, daily_scores_deleted integer, inactive_players_deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  g integer;
  pc integer;
  d integer;
  pl integer;
  cutoff timestamptz := now() - make_interval(months => greatest(p_months, 6));
begin
  delete from ghost_runs where created_at < now() - interval '30 days';
  get diagnostics g = row_count;
  delete from parcours_runs where created_at < now() - interval '30 days';
  get diagnostics pc = row_count;
  delete from scores
   where (board like 'tagesaufgabe:%' or board like 'tagestrick:%')
     and created_at < now() - interval '30 days';
  get diagnostics d = row_count;
  delete from players p
   where p.updated_at < cutoff
     and not exists (select 1 from scores s where s.player = p.id and s.created_at >= cutoff)
     and not exists (select 1 from online_runs r where r.player = p.id and r.created_at >= cutoff)
     and not exists (select 1 from ghost_runs h where h.player = p.id and h.created_at >= cutoff)
     and not exists (select 1 from parcours_runs q where q.player = p.id and q.created_at >= cutoff);
  get diagnostics pl = row_count;
  return query select g, pc, d, pl;
end;
$$;

-- Nicht für die App: nur du darfst aufräumen
revoke execute on function public.cleanup_old_data(integer) from public, anon, authenticated;

-- Einmal von Hand ausprobieren (zeigt, wie viele Zeilen gelöscht wurden):
--   select * from cleanup_old_data();
--
-- Täglich automatisch (empfohlen): zuerst im Dashboard unter Database → Extensions „pg_cron“ einschalten, dann:
--   select cron.schedule('aufraeumen', '17 3 * * *', $$select public.cleanup_old_data()$$);
-- Plan ansehen: select * from cron.job;   Entfernen: select cron.unschedule('aufraeumen');
