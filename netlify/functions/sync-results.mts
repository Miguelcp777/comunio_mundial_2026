import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const WC_LEAGUE_ID = "4429";

// TheSportsDB team name → our FIFA code (from teams table)
const NAME_TO_FIFA: Record<string, string> = {
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

function calcPoints(
  homeGoals: number, awayGoals: number,
  predHome: number, predAway: number
): number {
  let pts = 0;
  const sign = (h: number, a: number) => h > a ? "H" : h < a ? "A" : "D";
  if (sign(homeGoals, awayGoals) === sign(predHome, predAway)) pts += 3;
  if (homeGoals === predHome) pts += 1;
  if (awayGoals === predAway) pts += 1;
  return pts;
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Returns unique dates for the last 2 days + today
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

  if (!pending?.length) return { statusCode: 200, body: "No pending matches" };

  // Fetch TheSportsDB events for each relevant date
  const dates = getRecentDates();
  const eventsByDate: Record<string, any[]> = {};

  for (const date of dates) {
    try {
      const json = await fetchJSON(`${SPORTSDB_BASE}/eventsday.php?d=${date}&l=${WC_LEAGUE_ID}`);
      eventsByDate[date] = json.events ?? [];
    } catch {
      eventsByDate[date] = [];
    }
    // Respect free-tier rate limit (30 req/min)
    await new Promise(r => setTimeout(r, 300));
  }

  const updatedMatches: number[] = [];

  for (const match of pending) {
    const homeCode = (match.home_team as any)?.code as string | undefined;
    const awayCode = (match.away_team as any)?.code as string | undefined;
    if (!homeCode || !awayCode) continue;

    const matchDate = match.match_date!.split("T")[0];
    const dayEvents = eventsByDate[matchDate] ?? [];

    const event = dayEvents.find((e: any) => {
      return NAME_TO_FIFA[e.strHomeTeam] === homeCode &&
             NAME_TO_FIFA[e.strAwayTeam] === awayCode;
    });

    if (!event) continue;

    const isFinished =
      event.strStatus === "Match Finished" ||
      event.strStatus === "FT" ||
      event.strStatus === "AET" ||
      event.strStatus === "PEN";

    if (!isFinished) continue;
    if (event.intHomeScore === null || event.intAwayScore === null) continue;

    const homeGoals = parseInt(event.intHomeScore, 10);
    const awayGoals = parseInt(event.intAwayScore, 10);
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

    // Recalculate points for all predictions on this match
    const { data: preds } = await supabase
      .from("match_predictions")
      .select("id, user_id, predicted_home_goals, predicted_away_goals")
      .eq("match_id", match.id);

    if (!preds?.length) continue;

    const affectedUsers = new Set<string>();

    for (const pred of preds) {
      const pts = calcPoints(homeGoals, awayGoals, pred.predicted_home_goals, pred.predicted_away_goals);
      await supabase.from("match_predictions").update({ points_earned: pts }).eq("id", pred.id);
      affectedUsers.add(pred.user_id);
    }

    // Update total_points for each affected user
    for (const userId of affectedUsers) {
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
      const tournTotal = tournPred?.points_earned ?? 0;

      await supabase
        .from("profiles")
        .update({ total_points: matchTotal + tournTotal })
        .eq("id", userId);
    }
  }

  const msg = updatedMatches.length
    ? `Updated ${updatedMatches.length} match(es): IDs ${updatedMatches.join(", ")}`
    : "No new results";

  console.log(`[sync-results] ${new Date().toISOString()} — ${msg}`);
  return { statusCode: 200, body: msg };
});
