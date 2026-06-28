import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { calcPoints } from "../../lib/utils";
import { NAME_TO_FIFA, SPORTSDB_BASE, WC_LEAGUE_ID, assignBracketTeams } from "../../lib/sportsdb";

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Returns dates for today and the last 2 days
function getRecentDates(): string[] {
  const dates: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().split("T")[0]);
  }
  return [...new Set(dates)];
}

export const handler = schedule("*/5 * * * *", async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Phase 0: fill in knockout matchups as TheSportsDB publishes each round.
  // Runs before the score sync so newly-assigned matches become eligible for it.
  let bracketAssigned = 0;
  try {
    const bracket = await assignBracketTeams(supabase);
    bracketAssigned = bracket.assigned.length;
    if (bracket.errors.length) console.error("[sync-results] bracket errors:", bracket.errors.join("; "));
    if (bracket.mismatches.length) {
      console.warn("[sync-results] bracket MISMATCHES (assigned ≠ API):",
        bracket.mismatches.map(m => `#${m.match_number} BD=${m.db} API=${m.api}`).join("; "));
    }
  } catch (e) {
    console.error("[sync-results] bracket sync failed:", e instanceof Error ? e.message : String(e));
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const inOneHour = new Date(Date.now() + 3600000).toISOString();

  // Fetch unfinished matches that should have been played by now
  const { data: pending } = await supabase
    .from("matches")
    .select(`
      id, match_date,
      home_team:teams!matches_home_team_id_fkey(id, code),
      away_team:teams!matches_away_team_id_fkey(id, code)
    `)
    .eq("is_finished", false)
    .not("match_date", "is", null)
    .gte("match_date", threeDaysAgo)
    .lte("match_date", inOneHour);

  if (!pending?.length) {
    const body = bracketAssigned ? `Assigned ${bracketAssigned} bracket matchup(s). No pending matches` : "No pending matches";
    return { statusCode: 200, body };
  }

  // Fetch TheSportsDB events for each relevant date
  const dates = getRecentDates();
  const eventsByDate: Record<string, unknown[]> = {};

  for (const date of dates) {
    try {
      const json = await fetchJSON(`${SPORTSDB_BASE}/eventsday.php?d=${date}&l=${WC_LEAGUE_ID}`) as { events?: unknown[] };
      eventsByDate[date] = json.events ?? [];
    } catch {
      eventsByDate[date] = [];
    }
    // Respect free-tier rate limit (30 req/min)
    await new Promise(r => setTimeout(r, 300));
  }

  const updatedMatches: number[] = [];

  for (const match of pending) {
    const homeCode = (match.home_team as unknown as { code: string } | null)?.code;
    const awayCode = (match.away_team as unknown as { code: string } | null)?.code;
    if (!homeCode || !awayCode) continue;

    const matchDate = match.match_date!.split("T")[0];
    const dayEvents = (eventsByDate[matchDate] ?? []) as Record<string, unknown>[];

    const event = dayEvents.find((e) => {
      return NAME_TO_FIFA[e.strHomeTeam as string] === homeCode &&
             NAME_TO_FIFA[e.strAwayTeam as string] === awayCode;
    });

    if (!event) continue;

    const isFinished =
      event.strStatus === "Match Finished" ||
      event.strStatus === "FT" ||
      event.strStatus === "AET" ||
      event.strStatus === "PEN";

    if (!isFinished) continue;
    if (event.intHomeScore === null || event.intAwayScore === null) continue;

    const homeGoals = parseInt(event.intHomeScore as string, 10);
    const awayGoals = parseInt(event.intAwayScore as string, 10);
    if (isNaN(homeGoals) || isNaN(awayGoals)) continue;

    // Update match result
    const { error: matchErr } = await supabase
      .from("matches")
      .update({ home_goals: homeGoals, away_goals: awayGoals, is_finished: true })
      .eq("id", match.id);

    if (matchErr) {
      console.error("Match update error:", matchErr.message);
      continue;
    }

    updatedMatches.push(match.id);

    // Fetch all predictions for this match
    const { data: preds } = await supabase
      .from("match_predictions")
      .select("id, user_id, predicted_home_goals, predicted_away_goals")
      .eq("match_id", match.id);

    if (!preds?.length) continue;

    // Batch-update points in a single upsert
    const pointsUpdates = preds.map(pred => ({
      id: pred.id,
      user_id: pred.user_id,
      match_id: match.id,
      predicted_home_goals: pred.predicted_home_goals,
      predicted_away_goals: pred.predicted_away_goals,
      points_earned: calcPoints(homeGoals, awayGoals, pred.predicted_home_goals, pred.predicted_away_goals),
    }));
    await supabase.from("match_predictions").upsert(pointsUpdates);

    const affectedUsers = [...new Set(preds.map(p => p.user_id))];

    // Recalculate total_points for all affected users in parallel
    await Promise.all(affectedUsers.map(async (userId) => {
      const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
        supabase
          .from("match_predictions")
          .select("points_earned")
          .eq("user_id", userId)
          .not("points_earned", "is", null),
        supabase
          .from("tournament_predictions")
          .select("points_earned")
          .eq("user_id", userId)
          .single(),
      ]);

      const matchTotal = matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0;
      const tournTotal = (tournPred as { points_earned?: number } | null)?.points_earned ?? 0;

      await supabase
        .from("profiles")
        .update({ total_points: matchTotal + tournTotal })
        .eq("id", userId);
    }));
  }

  // Phase 2: recalculate points for already-finished matches where predictions have null points
  // (recovery path for partial sync failures from prior runs)
  let recalculated = 0;
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id, home_goals, away_goals")
    .eq("is_finished", true)
    .not("home_goals", "is", null)
    .not("away_goals", "is", null);

  for (const match of finishedMatches ?? []) {
    const { data: nullPreds } = await supabase
      .from("match_predictions")
      .select("id, user_id, predicted_home_goals, predicted_away_goals")
      .eq("match_id", match.id)
      .is("points_earned", null);

    if (!nullPreds?.length) continue;

    const usersToRecalc = new Set<string>();
    for (const pred of nullPreds) {
      const pts = calcPoints(match.home_goals as number, match.away_goals as number, pred.predicted_home_goals, pred.predicted_away_goals);
      await supabase.from("match_predictions").update({ points_earned: pts }).eq("id", pred.id);
      usersToRecalc.add(pred.user_id);
      recalculated++;
    }

    for (const userId of usersToRecalc) {
      const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
        supabase.from("match_predictions").select("points_earned").eq("user_id", userId).not("points_earned", "is", null),
        supabase.from("tournament_predictions").select("points_earned").eq("user_id", userId).single(),
      ]);
      const matchTotal = matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0;
      const tournTotal = (tournPred as { points_earned?: number } | null)?.points_earned ?? 0;
      await supabase.from("profiles").update({ total_points: matchTotal + tournTotal }).eq("id", userId);
    }
  }

  const parts: string[] = [];
  if (bracketAssigned) parts.push(`Assigned ${bracketAssigned} bracket matchup(s)`);
  if (updatedMatches.length) parts.push(`Updated ${updatedMatches.length} match(es): IDs ${updatedMatches.join(", ")}`);
  if (recalculated) parts.push(`Recalculated ${recalculated} prediction(s)`);
  const msg = parts.length ? parts.join(". ") : "No new results";

  console.log(`[sync-results] ${new Date().toISOString()} — ${msg}`);
  return { statusCode: 200, body: msg };
});
