"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Team, TournamentPrediction, MatchPrediction } from "@/lib/types/database";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentPred, setTournamentPred] = useState<TournamentPrediction | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<MatchPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, teamsRes, tournRes, predsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("teams").select("*").order("name"),
        supabase.from("tournament_predictions").select("*").eq("user_id", user.id).single(),
        supabase.from("match_predictions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (tournRes.data) setTournamentPred(tournRes.data);
      if (predsRes.data) setMatchPredictions(predsRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  const getTeam = (id: number) => teams.find((t) => t.id === id);

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {[120, 160, 200].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const totalPredictions = matchPredictions.length;
  const scored = matchPredictions.filter((p) => p.points_earned !== null);
  const totalMatchPoints = scored.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const perfectScores = scored.filter((p) => p.points_earned === 5).length;
  const avgPts = scored.length ? (totalMatchPoints / scored.length).toFixed(1) : "—";

  const stats = [
    { value: profile.total_points, label: "Puntos totales", icon: "🏆", gold: true },
    { value: totalPredictions,     label: "Predicciones",   icon: "📝", gold: false },
    { value: perfectScores,        label: "Plenos (5 pts)", icon: "🎯", gold: false },
    { value: avgPts,               label: "Media/partido",  icon: "📊", gold: false },
  ];

  return (
    <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Profile header */}
      <div style={{
        background: "#0d1225",
        border: "1px solid rgba(212,175,55,0.15)",
        borderRadius: 18, padding: "24px",
        boxShadow: "0 0 32px rgba(212,175,55,0.06)",
      }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, flexShrink: 0,
            background: "rgba(212,175,55,0.12)",
            border: "2px solid rgba(212,175,55,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem",
            color: "#D4AF37",
          }}>
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", letterSpacing: "-0.02em", color: "#D4AF37" }}>
              {profile.display_name}
            </h1>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{
              background: stat.gold ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
              border: stat.gold ? "1px solid rgba(212,175,55,0.15)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: "1.4rem" }}>{stat.icon}</span>
              <div>
                <div style={{
                  fontFamily: "var(--font-heading)", fontWeight: 900,
                  fontSize: "1.4rem", color: stat.gold ? "#D4AF37" : "white",
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament prediction — card linking to /torneo */}
      <Link href="/torneo" style={{ textDecoration: "none" }}>
        <div style={{
          background: "#0d1225",
          border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 18, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem",
            }}>🏆</div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "white" }}>
                Predicción del Torneo
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
                {tournamentPred
                  ? `Campeón: ${getTeam(tournamentPred.champion_team_id)?.name ?? "—"}`
                  : "Aún no has hecho tu predicción"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {tournamentPred?.points_earned != null && (
              <span style={{ background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 900, padding: "4px 12px", borderRadius: 20, fontSize: "0.82rem" }}>
                {tournamentPred.points_earned} pts
              </span>
            )}
            <span style={{ fontSize: "1rem", color: "rgba(212,175,55,0.5)" }}>→</span>
          </div>
        </div>
      </Link>

      {/* Recent predictions */}
      <div style={{
        background: "#0d1225",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 18, padding: "24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "white", display: "flex", alignItems: "center", gap: 8 }}>
            <span>📋</span> Últimas Predicciones
          </h2>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>{totalPredictions} total</span>
        </div>

        {matchPredictions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {matchPredictions.slice(0, 10).map((pred) => (
              <div key={pred.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", minWidth: 60 }}>
                    Partido #{pred.match_id}
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "#D4AF37" }}>
                    {pred.predicted_home_goals} — {pred.predicted_away_goals}
                  </span>
                </div>
                {pred.points_earned !== null ? (
                  <span style={{ background: "linear-gradient(135deg, #D4AF37, #b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 900, padding: "3px 10px", borderRadius: 20, fontSize: "0.78rem" }}>
                    {pred.points_earned} pts
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>Pendiente</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", padding: "32px 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.2)" }}>
            Aún no has hecho predicciones de partidos.
          </p>
        )}
      </div>
    </div>
  );
}
