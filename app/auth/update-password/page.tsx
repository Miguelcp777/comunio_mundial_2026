"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const match = !confirm || password === confirm;
  const confirmError = confirm && !match ? "Las contraseñas no coinciden." : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true); setError(null);

    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "#0d1225", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "40px 32px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.3rem", color: "white", marginBottom: 10 }}>Contraseña actualizada</h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Redirigiendo al dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 0 40px rgba(212,175,55,0.05)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>🔑</span>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.3rem", color: "white" }}>Nueva contraseña</h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Elige una contraseña de al menos 6 caracteres</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.82rem", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Nueva contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Confirmar contraseña</label>
              <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${confirmError ? "rgba(239,68,68,0.5)" : confirm && match ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: "white", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
              {confirmError && <p style={{ fontSize: "0.73rem", color: "#ef4444", marginTop: 5 }}>{confirmError}</p>}
            </div>
            <button type="submit" disabled={loading || !!confirmError || !password}
              style={{ marginTop: 4, background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "13px 24px", borderRadius: 12, border: "none", cursor: loading || !!confirmError || !password ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: loading || !!confirmError || !password ? 0.5 : 1 }}>
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
