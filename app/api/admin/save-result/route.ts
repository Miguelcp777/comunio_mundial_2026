import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { calcPoints } from "@/lib/utils";

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor" }, { status: 500 });
  }

  const { matchId, homeGoals, awayGoals } = await req.json();
  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 || awayGoals < 0
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Update match result
  const { data: updatedMatch, error: matchErr } = await service
    .from("matches")
    .update({ home_goals: homeGoals, away_goals: awayGoals, is_finished: true })
    .eq("id", matchId)
    .select("id");

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
  if (!updatedMatch?.length) {
    return NextResponse.json({
      error: "No se pudo actualizar el partido. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurada correctamente en el servidor.",
    }, { status: 500 });
  }

  // Fetch all predictions for this match
  const { data: preds } = await service
    .from("match_predictions")
    .select("id, user_id, predicted_home_goals, predicted_away_goals")
    .eq("match_id", matchId);

  if (!preds?.length) {
    return NextResponse.json({ ok: true, predictions_updated: 0, users_updated: 0 });
  }

  // Update points_earned for each prediction individually
  // Using UPDATE (not upsert) to avoid triggering the INSERT RLS policy after the lock deadline
  for (const pred of preds) {
    const pts = calcPoints(homeGoals, awayGoals, pred.predicted_home_goals, pred.predicted_away_goals);
    const { error: predErr } = await service
      .from("match_predictions")
      .update({ points_earned: pts })
      .eq("id", pred.id);
    if (predErr) console.error("Prediction update error:", pred.id, predErr.message);
  }

  const affectedUsers = [...new Set(preds.map(p => p.user_id))];

  // Recalculate total_points for all affected users in parallel
  await Promise.all(affectedUsers.map(async (userId) => {
    const [{ data: matchPts }, { data: tournPred }] = await Promise.all([
      service.from("match_predictions").select("points_earned").eq("user_id", userId).not("points_earned", "is", null),
      service.from("tournament_predictions").select("points_earned").eq("user_id", userId).single(),
    ]);
    const total =
      (matchPts?.reduce((s, p) => s + (p.points_earned ?? 0), 0) ?? 0) +
      (tournPred?.points_earned ?? 0);
    await service.from("profiles").update({ total_points: total }).eq("id", userId);
  }));

  return NextResponse.json({
    ok: true,
    predictions_updated: preds.length,
    users_updated: affectedUsers.length,
  });
}
