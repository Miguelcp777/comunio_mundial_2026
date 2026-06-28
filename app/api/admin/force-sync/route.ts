/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { NAME_TO_FIFA, SPORTSDB_BASE, WC_LEAGUE_ID } from "@/lib/sportsdb";

function calcPoints(hg: number, ag: number, ph: number, pa: number): number {
  let pts = 0;
  const sign = (h: number, a: number) => h > a ? "H" : h < a ? "A" : "D";
  if (sign(hg, ag) === sign(ph, pa)) pts += 3;
  if (hg === ph) pts += 1;
  if (ag === pa) pts += 1;
  return pts;
}

export async function POST() {
  try {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor" }, { status: 500 });
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const inOneHour = new Date(Date.now() + 3600000).toISOString();

  const { data: pending } = await serviceClient
    .from("matches")
    .select(`id, match_date,
      home_team:teams!matches_home_team_id_fkey(id, code),
      away_team:teams!matches_away_team_id_fkey(id, code)`)
    .eq("is_finished", false)
    .not("match_date", "is", null)
    .gte("match_date", threeDaysAgo)
    .lte("match_date", inOneHour);

  if (!pending?.length) return NextResponse.json({ updated: 0, message: "No hay partidos pendientes" });

  // Get unique dates
  const dates = [...new Set(pending.map(m => m.match_date!.split("T")[0]))];
  const eventsByDate: Record<string, any[]> = {};

  for (const date of dates) {
    try {
      const res = await fetch(`${SPORTSDB_BASE}/eventsday.php?d=${date}&l=${WC_LEAGUE_ID}`);
      const json = await res.json();
      eventsByDate[date] = json.events ?? [];
    } catch {
      eventsByDate[date] = [];
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const updatedMatches: number[] = [];
  const errors: string[] = [];

  for (const match of pending) {
    const homeCode = (match.home_team as any)?.code as string | undefined;
    const awayCode = (match.away_team as any)?.code as string | undefined;
    if (!homeCode || !awayCode) continue;

    const matchDate = match.match_date!.split("T")[0];
    const event = (eventsByDate[matchDate] ?? []).find((e: any) =>
      NAME_TO_FIFA[e.strHomeTeam] === homeCode && NAME_TO_FIFA[e.strAwayTeam] === awayCode
    );

    if (!event) continue;

    const finished = ["Match Finished", "FT", "AET", "PEN"].includes(event.strStatus);
    if (!finished || event.intHomeScore === null || event.intAwayScore === null) continue;

    const homeGoals = parseInt(event.intHomeScore, 10);
    const awayGoals = parseInt(event.intAwayScore, 10);
    if (isNaN(homeGoals) || isNaN(awayGoals)) continue;

    const { error: matchErr } = await serviceClient
      .from("matches")
      .update({ home_goals: homeGoals, away_goals: awayGoals, is_finished: true })
      .eq("id", match.id);

    if (matchErr) { errors.push(matchErr.message); continue; }
    updatedMatches.push(match.id);

    const { data: preds } = await serviceClient
      .from("match_predictions")
      .select("id, user_id, predicted_home_goals, predicted_away_goals")
      .eq("match_id", match.id);

    if (!preds?.length) continue;

    const affectedUsers = new Set<string>();
    for (const pred of preds) {
      const pts = calcPoints(homeGoals, awayGoals, pred.predicted_home_goals, pred.predicted_away_goals);
      await serviceClient.from("match_predictions").update({ points_earned: pts }).eq("id", pred.id);
      affectedUsers.add(pred.user_id);
    }

    for (const userId of affectedUsers) {
      const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
        serviceClient.from("match_predictions").select("points_earned").eq("user_id", userId).not("points_earned", "is", null),
        serviceClient.from("tournament_predictions").select("points_earned").eq("user_id", userId).single(),
      ]);
      const total = (matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0) + (tournPred?.points_earned ?? 0);
      await serviceClient.from("profiles").update({ total_points: total }).eq("id", userId);
    }
  }

  // Phase 2: recalculate points for already-finished matches where predictions still have null points
  // (recovery path for partial sync failures)
  let recalculated = 0;
  const { data: finishedMatches } = await serviceClient
    .from("matches")
    .select("id, home_goals, away_goals")
    .eq("is_finished", true)
    .not("home_goals", "is", null)
    .not("away_goals", "is", null);

  for (const match of finishedMatches ?? []) {
    const { data: nullPreds } = await serviceClient
      .from("match_predictions")
      .select("id, user_id, predicted_home_goals, predicted_away_goals")
      .eq("match_id", match.id)
      .is("points_earned", null);

    if (!nullPreds?.length) continue;

    const usersToRecalc = new Set<string>();
    for (const pred of nullPreds) {
      const pts = calcPoints(match.home_goals!, match.away_goals!, pred.predicted_home_goals, pred.predicted_away_goals);
      await serviceClient.from("match_predictions").update({ points_earned: pts }).eq("id", pred.id);
      usersToRecalc.add(pred.user_id);
      recalculated++;
    }

    for (const userId of usersToRecalc) {
      const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
        serviceClient.from("match_predictions").select("points_earned").eq("user_id", userId).not("points_earned", "is", null),
        serviceClient.from("tournament_predictions").select("points_earned").eq("user_id", userId).single(),
      ]);
      const total = (matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0) + (tournPred?.points_earned ?? 0);
      await serviceClient.from("profiles").update({ total_points: total }).eq("id", userId);
    }
  }

  return NextResponse.json({
    updated: updatedMatches.length,
    match_ids: updatedMatches,
    recalculated,
    errors,
    message: updatedMatches.length
      ? `${updatedMatches.length} partido(s) actualizados`
      : recalculated > 0
      ? `${recalculated} predicción(es) con puntos recalculados`
      : "No hay resultados nuevos en TheSportsDB",
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error interno: ${message}` }, { status: 500 });
  }
}
