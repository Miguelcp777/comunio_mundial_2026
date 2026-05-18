import { NextRequest, NextResponse } from "next/server";
import { createClient as createBrowserlessClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurada en .env.local" }, { status: 500 });

  const adminClient = createBrowserlessClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
