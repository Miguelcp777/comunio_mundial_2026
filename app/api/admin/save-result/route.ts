import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function calcPoints(hg: number, ag: number, ph: number, pa: number): number {
  let pts = 0;
  const sign = (h: number, a: number) => h > a ? "H" : h < a ? "A" : "D";
  if (sign(hg, ag) === sign(ph, pa)) pts += 3;
  if (hg === ph) pts += 1;
  if (ag === pa) pts += 1;
  return pts;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { matchId, homeGoals, awayGoals } = await req.json();
  if (typeof matchId !== "number" || typeof homeGoals !== "number" || typeof awayGoals !== "number") {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Update match
  const { error: matchErr } = await service
    .from("matches")
    .update({ home_goals: homeGoals, away_goals: awayGoals, is_finished: true })
    .eq("id", matchId);

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });

  // Recalculate points for all predictions on this match
  const { data: preds } = await service
    .from("match_predictions")
    .select("id, user_id, predicted_home_goals, predicted_away_goals")
    .eq("match_id", matchId);

  const affectedUsers = new Set<string>();

  for (const pred of preds ?? []) {
    const pts = calcPoints(homeGoals, awayGoals, pred.predicted_home_goals, pred.predicted_away_goals);
    await service.from("match_predictions").update({ points_earned: pts }).eq("id", pred.id);
    affectedUsers.add(pred.user_id);
  }

  // Update total_points for each affected user
  for (const userId of affectedUsers) {
    const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
      service.from("match_predictions").select("points_earned").eq("user_id", userId).not("points_earned", "is", null),
      service.from("tournament_predictions").select("points_earned").eq("user_id", userId).single(),
    ]);
    const total =
      (matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0) +
      (tournPred?.points_earned ?? 0);
    await service.from("profiles").update({ total_points: total }).eq("id", userId);
  }

  return NextResponse.json({
    ok: true,
    predictions_updated: preds?.length ?? 0,
    users_updated: affectedUsers.size,
  });
}
