/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = parseInt(searchParams.get("matchId") ?? "");

  if (isNaN(matchId)) {
    return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
  }

  // Auth check — user must be logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Service client to bypass RLS and read all predictions
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch match to check lock status
  const { data: match } = await service
    .from("matches")
    .select("match_date, is_finished")
    .eq("id", matchId)
    .single();

  if (!match) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  if (!match.match_date) {
    return NextResponse.json({ error: "Fecha del partido no disponible" }, { status: 403 });
  }

  // Only reveal predictions after the 15-min lock window
  const deadline = new Date(match.match_date).getTime() - 15 * 60 * 1000;
  if (Date.now() < deadline) {
    return NextResponse.json({
      available: false,
      message: "No puedes ver los pronósticos hasta que el partido esté bloqueado para predicciones (15 min antes del pitido).",
    });
  }

  // Fetch all predictions with the user's display_name
  const { data: preds } = await service
    .from("match_predictions")
    .select("predicted_home_goals, predicted_away_goals, points_earned, user_id, profiles(display_name)")
    .eq("match_id", matchId);

  const items = (preds ?? []).map((p: any) => ({
    display_name: (p.profiles as any)?.display_name ?? "—",
    predicted_home_goals: p.predicted_home_goals,
    predicted_away_goals: p.predicted_away_goals,
    points_earned: p.points_earned,
    is_me: p.user_id === user.id,
  }));

  // Sort: by points desc (if finished), then by name
  items.sort((a: any, b: any) => {
    if (a.points_earned !== null && b.points_earned !== null) {
      if (b.points_earned !== a.points_earned) return b.points_earned - a.points_earned;
    } else if (a.points_earned !== null) return -1;
    else if (b.points_earned !== null) return 1;
    return a.display_name.localeCompare(b.display_name, "es");
  });

  return NextResponse.json({
    matchId,
    is_finished: match.is_finished,
    total_predictions: items.length,
    items,
  });
}
