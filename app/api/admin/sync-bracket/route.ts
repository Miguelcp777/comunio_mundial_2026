import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { assignBracketTeams } from "@/lib/sportsdb";

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

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const result = await assignBracketTeams(service);

    return NextResponse.json({
      ...result,
      assigned_count: result.assigned.length,
      unmatched_count: result.unmatched_rows.length,
      message: result.assigned.length
        ? `${result.assigned.length} cruce(s) asignados`
        : result.unmatched_rows.length
        ? "No hay cruces nuevos publicados en TheSportsDB todavía"
        : "Todos los cruces ya están asignados",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error interno: ${message}` }, { status: 500 });
  }
}
