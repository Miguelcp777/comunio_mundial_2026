/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Devuelve la predicción de torneo (campeón/subcampeón/3º) de un usuario.
// La propia siempre; la de otros solo una vez que el Mundial ha empezado (las
// predicciones de torneo ya están cerradas) — mismo criterio de revelado que /api/predictions.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Revelado: la propia siempre; la de otros solo si el torneo ya ha arrancado
  const isOwn = userId === user.id;
  if (!isOwn) {
    const { data: firstMatch } = await service
      .from("matches")
      .select("match_date")
      .not("match_date", "is", null)
      .order("match_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    const started = firstMatch?.match_date
      ? Date.now() >= new Date(firstMatch.match_date).getTime() - 15 * 60 * 1000
      : false;
    if (!started) {
      return NextResponse.json({
        available: false,
        message: "Las predicciones del torneo se revelarán cuando empiece el Mundial.",
      });
    }
  }

  const { data: tp } = await service
    .from("tournament_predictions")
    .select(`points_earned, is_locked,
      champion:teams!tournament_predictions_champion_team_id_fkey(*),
      runner_up:teams!tournament_predictions_runner_up_team_id_fkey(*),
      third_place:teams!tournament_predictions_third_place_team_id_fkey(*)`)
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    available: true,
    prediction: tp
      ? {
          points_earned: (tp as any).points_earned ?? null,
          champion: (tp as any).champion ?? null,
          runner_up: (tp as any).runner_up ?? null,
          third_place: (tp as any).third_place ?? null,
        }
      : null,
  });
}
