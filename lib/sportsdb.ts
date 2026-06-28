/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

export const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
export const WC_LEAGUE_ID = "4429";

// TheSportsDB team name → our FIFA code (from teams table).
// Single source of truth — imported by the cron, force-sync, sync-status and sync-bracket.
export const NAME_TO_FIFA: Record<string, string> = {
  "Mexico": "MEX",
  "South Africa": "RSA",
  "South Korea": "KOR",
  "Czech Republic": "CZE",
  "Canada": "CAN",
  "Bosnia-Herzegovina": "BIH",
  "USA": "USA",
  "United States": "USA",
  "Paraguay": "PAR",
  "Brazil": "BRA",
  "Morocco": "MAR",
  "Qatar": "QAT",
  "Switzerland": "SUI",
  "Haiti": "HAI",
  "Scotland": "SCO",
  "Germany": "GER",
  "Curaçao": "CUW",
  "Curacao": "CUW",
  "Ivory Coast": "CIV",
  "Côte d'Ivoire": "CIV",
  "Ecuador": "ECU",
  "Netherlands": "NED",
  "Japan": "JPN",
  "Australia": "AUS",
  "Turkey": "TUR",
  "Belgium": "BEL",
  "Egypt": "EGY",
  "Saudi Arabia": "KSA",
  "Uruguay": "URU",
  "Spain": "ESP",
  "Cape Verde": "CPV",
  "Sweden": "SWE",
  "Tunisia": "TUN",
  "France": "FRA",
  "Senegal": "SEN",
  "Iraq": "IRQ",
  "Norway": "NOR",
  "Argentina": "ARG",
  "Algeria": "ALG",
  "Austria": "AUT",
  "Jordan": "JOR",
  "Portugal": "POR",
  "DR Congo": "COD",
  "Congo DR": "COD",
  "Uzbekistan": "UZB",
  "Colombia": "COL",
  "England": "ENG",
  "Croatia": "CRO",
  "Ghana": "GHA",
  "Panama": "PAN",
  "New Zealand": "NZL",
  "Iran": "IRN",
};

type SportsDbEvent = {
  strHomeTeam: string;
  strAwayTeam: string;
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null;
};

export type BracketSyncResult = {
  assigned: { match_id: number; match_number: number | null; home: string; away: string }[];
  unmatched_rows: { match_id: number; match_number: number | null; match_date: string | null }[];
  // Already-assigned rows whose teams disagree with the API for that slot (not overwritten — just flagged)
  mismatches: { match_id: number; match_number: number | null; match_date: string | null; db: string; api: string; swapped: boolean }[];
  errors: string[];
};

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Minute-precision UTC key, e.g. "2026-06-28T19:00". Robust to timezone-suffix quirks.
function utcKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

// TheSportsDB strTimestamp has no offset but is UTC wall-clock — append "Z" before parsing.
function eventKey(e: SportsDbEvent): string | null {
  if (e.strTimestamp) {
    const ts = e.strTimestamp.endsWith("Z") ? e.strTimestamp : `${e.strTimestamp}Z`;
    return utcKey(ts);
  }
  if (e.dateEvent && e.strTime) {
    return utcKey(`${e.dateEvent}T${e.strTime}Z`);
  }
  return null;
}

/**
 * Fill in knockout matchups (home/away teams) from TheSportsDB.
 *
 * Idempotent and incremental: only touches knockout rows whose teams are still null,
 * and only assigns when the API already publishes both real teams (placeholder names
 * like "Winner Group A" aren't in NAME_TO_FIFA, so they're skipped automatically).
 *
 * The join key is the kickoff timestamp (matches.match_date, UTC) — the official schedule
 * dates/venues are pre-seeded and identical to TheSportsDB's, so this is exact. Rows that
 * can't be matched are returned in `unmatched_rows` for manual resolution in the admin panel.
 *
 * Already-assigned rows are never overwritten, but are compared against the API for their
 * slot — any disagreement is returned in `mismatches` so the admin can review it.
 *
 * Does NOT overwrite venue/date (DB stores city, API stores stadium) and never touches
 * finished matches.
 */
export async function assignBracketTeams(supabase: SupabaseClient): Promise<BracketSyncResult> {
  const result: BracketSyncResult = { assigned: [], unmatched_rows: [], mismatches: [], errors: [] };

  // 1. All non-finished knockout rows (empty → assign; assigned → reconcile against API)
  const { data: rows, error: rowsErr } = await supabase
    .from("matches")
    .select("id, match_number, match_date, stage, home_team_id, away_team_id")
    .neq("stage", "group")
    .eq("is_finished", false)
    .not("match_date", "is", null);

  if (rowsErr) {
    result.errors.push(`rows: ${rowsErr.message}`);
    return result;
  }
  if (!rows?.length) return result;

  // 2. teams: FIFA code ↔ id (both directions)
  const { data: teams, error: teamsErr } = await supabase.from("teams").select("id, code");
  if (teamsErr) {
    result.errors.push(`teams: ${teamsErr.message}`);
    return result;
  }
  const codeToId = new Map<string, number>((teams ?? []).map((t: any) => [t.code, t.id]));
  const idToCode = new Map<number, string>((teams ?? []).map((t: any) => [t.id, t.code]));

  // 3. Fetch events for each UTC date present in the pending rows
  const dates = [...new Set(rows.map((r: any) => utcKey(r.match_date).slice(0, 10)))];
  const eventsByKey = new Map<string, SportsDbEvent>();

  for (const date of dates) {
    try {
      const json = await fetchJSON(`${SPORTSDB_BASE}/eventsday.php?d=${date}&l=${WC_LEAGUE_ID}`);
      for (const e of (json.events ?? []) as SportsDbEvent[]) {
        const key = eventKey(e);
        if (key) eventsByKey.set(key, e);
      }
    } catch {
      // ignore this date — its rows fall through to unmatched
    }
    await new Promise((r) => setTimeout(r, 300)); // free-tier rate limit (~30/min)
  }

  // 4. Reconcile each row against the API event at its kickoff timestamp
  for (const row of rows as any[]) {
    const key = utcKey(row.match_date);
    const event = eventsByKey.get(key);

    // What the API says for this slot (only "confident" if both teams resolve to real codes/ids)
    const apiHomeCode = event ? NAME_TO_FIFA[event.strHomeTeam] : undefined;
    const apiAwayCode = event ? NAME_TO_FIFA[event.strAwayTeam] : undefined;
    const apiHomeId = apiHomeCode ? codeToId.get(apiHomeCode) : undefined;
    const apiAwayId = apiAwayCode ? codeToId.get(apiAwayCode) : undefined;
    const apiConfident = !!(event && apiHomeId && apiAwayId && apiHomeId !== apiAwayId);

    const alreadyAssigned = !!(row.home_team_id && row.away_team_id);

    if (alreadyAssigned) {
      // Don't overwrite manual/previous assignments — just flag disagreements with the API
      if (apiConfident && (row.home_team_id !== apiHomeId || row.away_team_id !== apiAwayId)) {
        const swapped = row.home_team_id === apiAwayId && row.away_team_id === apiHomeId;
        result.mismatches.push({
          match_id: row.id,
          match_number: row.match_number,
          match_date: row.match_date,
          db: `${idToCode.get(row.home_team_id) ?? row.home_team_id} vs ${idToCode.get(row.away_team_id) ?? row.away_team_id}`,
          api: `${apiHomeCode} vs ${apiAwayCode}`,
          swapped,
        });
      }
      continue;
    }

    // Empty row → assign if the API already publishes both teams
    if (!apiConfident) {
      result.unmatched_rows.push({
        match_id: row.id,
        match_number: row.match_number,
        match_date: row.match_date,
      });
      continue;
    }

    const { error: updErr } = await supabase
      .from("matches")
      .update({ home_team_id: apiHomeId, away_team_id: apiAwayId })
      .eq("id", row.id);

    if (updErr) {
      result.errors.push(`#${row.match_number}: ${updErr.message}`);
      continue;
    }

    result.assigned.push({
      match_id: row.id,
      match_number: row.match_number,
      home: apiHomeCode!,
      away: apiAwayCode!,
    });
  }

  return result;
}
