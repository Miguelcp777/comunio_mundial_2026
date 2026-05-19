/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const WC_LEAGUE_ID = "4429";

const NAME_TO_FIFA: Record<string, string> = {
  "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR",
  "Czech Republic": "CZE", "Canada": "CAN", "Bosnia-Herzegovina": "BIH",
  "USA": "USA", "United States": "USA", "Paraguay": "PAR", "Brazil": "BRA",
  "Morocco": "MAR", "Qatar": "QAT", "Switzerland": "SUI", "Haiti": "HAI",
  "Scotland": "SCO", "Germany": "GER", "Curaçao": "CUW", "Curacao": "CUW",
  "Ivory Coast": "CIV", "Côte d'Ivoire": "CIV", "Ecuador": "ECU", "Netherlands": "NED", "Japan": "JPN",
  "Australia": "AUS", "Turkey": "TUR", "Belgium": "BEL", "Egypt": "EGY",
  "Saudi Arabia": "KSA", "Uruguay": "URU", "Spain": "ESP", "Cape Verde": "CPV",
  "Sweden": "SWE", "Tunisia": "TUN", "France": "FRA", "Senegal": "SEN",
  "Iraq": "IRQ", "Norway": "NOR", "Argentina": "ARG", "Algeria": "ALG",
  "Austria": "AUT", "Jordan": "JOR", "Portugal": "POR", "DR Congo": "COD",
  "Congo DR": "COD", "Uzbekistan": "UZB", "Colombia": "COL", "England": "ENG",
  "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN", "New Zealand": "NZL",
  "Iran": "IRN",
};

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  // Get our pending matches (last 3 days + today)
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();

  const { data: pending } = await supabase
    .from("matches")
    .select(`id, match_date, match_number,
      home_team:teams!matches_home_team_id_fkey(id, code, name),
      away_team:teams!matches_away_team_id_fkey(id, code, name)`)
    .eq("is_finished", false)
    .not("match_date", "is", null)
    .gte("match_date", threeDaysAgo)
    .lte("match_date", tomorrow)
    .order("match_date");

  // Get last 2 finished matches (proof of sync working)
  const { data: recentFinished } = await supabase
    .from("matches")
    .select(`id, match_date, home_goals, away_goals, match_number,
      home_team:teams!matches_home_team_id_fkey(code, name),
      away_team:teams!matches_away_team_id_fkey(code, name)`)
    .eq("is_finished", true)
    .not("match_date", "is", null)
    .order("match_date", { ascending: false })
    .limit(5);

  // Fetch today's TheSportsDB events
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let sportsdbEvents: any[] = [];
  try {
    const [todayRes, yesRes] = await Promise.all([
      fetch(`${SPORTSDB_BASE}/eventsday.php?d=${today}&l=${WC_LEAGUE_ID}`),
      fetch(`${SPORTSDB_BASE}/eventsday.php?d=${yesterday}&l=${WC_LEAGUE_ID}`),
    ]);
    const [todayJson, yesJson] = await Promise.all([todayRes.json(), yesRes.json()]);
    sportsdbEvents = [...(todayJson.events ?? []), ...(yesJson.events ?? [])];
  } catch {
    sportsdbEvents = [];
  }

  // Check mapping for pending matches
  const FIFA_TO_NAME = Object.fromEntries(
    Object.entries(NAME_TO_FIFA).map(([name, fifa]) => [fifa, name])
  );

  const mappingCheck = (pending ?? []).map(m => {
    const homeCode = (m.home_team as any)?.code;
    const awayCode = (m.away_team as any)?.code;
    const homeName = homeCode ? FIFA_TO_NAME[homeCode] : null;
    const awayName = awayCode ? FIFA_TO_NAME[awayCode] : null;
    const found = sportsdbEvents.find(e =>
      NAME_TO_FIFA[e.strHomeTeam] === homeCode && NAME_TO_FIFA[e.strAwayTeam] === awayCode
    );
    return {
      match_id: m.id,
      match_number: m.match_number,
      match_date: m.match_date,
      home: { code: homeCode, name: (m.home_team as any)?.name, sportsdb_name: homeName, mapped: !!homeName },
      away: { code: awayCode, name: (m.away_team as any)?.name, sportsdb_name: awayName, mapped: !!awayName },
      found_in_api: !!found,
      api_status: found?.strStatus ?? null,
      api_score: found ? `${found.intHomeScore ?? "?"} - ${found.intAwayScore ?? "?"}` : null,
    };
  });

  // Unknown team names from TheSportsDB (not in our mapping)
  const unmappedApiTeams = sportsdbEvents
    .flatMap(e => [e.strHomeTeam, e.strAwayTeam])
    .filter(name => !NAME_TO_FIFA[name]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    pending_count: pending?.length ?? 0,
    sportsdb_events_today: sportsdbEvents.length,
    mapping_check: mappingCheck,
    recent_finished: recentFinished ?? [],
    unmapped_api_teams: [...new Set(unmappedApiTeams)],
  });
}
