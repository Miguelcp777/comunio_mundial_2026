"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl } from "@/lib/utils";
import type { Profile, Team, TournamentPrediction, MatchPrediction } from "@/lib/types/database";
import Image from "next/image";
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
      <div className="px-4 py-8 max-w-3xl mx-auto space-y-4">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
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
    { value: profile.total_points, label: "Puntos totales", icon: "🏆", highlight: true },
    { value: totalPredictions, label: "Predicciones", icon: "📝", highlight: false },
    { value: perfectScores, label: "Plenos (5 pts)", icon: "🎯", highlight: false },
    { value: avgPts, label: "Media / partido", icon: "📊", highlight: false },
  ];

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      {/* Profile header */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-4"
        style={{
          background: "rgba(212,175,55,0.05)",
          border: "1px solid rgba(212,175,55,0.12)",
          boxShadow: "0 0 40px rgba(212,175,55,0.05)",
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: "rgba(212,175,55,0.12)" }}
          >
            👤
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-[var(--font-heading)] text-xl sm:text-2xl font-bold text-gold-gradient truncate">
              {profile.display_name}
            </h1>
            <p className="text-xs text-white/35 mt-0.5">
              Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{
                background: stat.highlight ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
                border: stat.highlight ? "1px solid rgba(212,175,55,0.12)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-base mb-1">{stat.icon}</div>
              <div
                className={`font-[var(--font-heading)] text-xl font-bold leading-tight ${
                  stat.highlight ? "text-gold-300" : "text-white/90"
                }`}
              >
                {stat.value}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament prediction */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-heading)] text-base font-bold flex items-center gap-2">
            <span>🏆</span> Predicción del Torneo
          </h2>
          <Link
            href="/onboarding"
            className="text-xs text-gold-400/70 hover:text-gold-300 transition-colors flex items-center gap-1"
          >
            Editar →
          </Link>
        </div>

        {tournamentPred ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Campeón", teamId: tournamentPred.champion_team_id, emoji: "🥇", pts: "+30" },
              { label: "Subcampeón", teamId: tournamentPred.runner_up_team_id, emoji: "🥈", pts: "+20" },
              { label: "3er Puesto", teamId: tournamentPred.third_place_team_id, emoji: "🥉", pts: "+15" },
            ].map((item) => {
              const team = getTeam(item.teamId);
              return (
                <div
                  key={item.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-2xl block mb-2">{item.emoji}</span>
                  {team ? (
                    <>
                      <Image
                        src={getFlagUrl(team.code, "w80")}
                        alt={team.name}
                        width={36}
                        height={24}
                        className="flag-img mx-auto mb-1.5"
                      />
                      <span className="text-xs font-semibold text-white/80 block truncate">{team.name}</span>
                    </>
                  ) : (
                    <span className="text-xs text-white/25">Sin seleccionar</span>
                  )}
                  <div className="text-[10px] text-white/30 mt-1">{item.label} · {item.pts}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-white/35 text-sm mb-3">No has hecho tu predicción del torneo aún</p>
            <Link href="/onboarding" className="btn-primary text-sm !py-2 !px-5">
              Hacer predicción
            </Link>
          </div>
        )}

        {tournamentPred?.points_earned !== null && tournamentPred?.points_earned !== undefined && (
          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-sm text-white/40">Puntos del torneo</span>
            <span className="points-badge">{tournamentPred.points_earned} pts</span>
          </div>
        )}
      </div>

      {/* Recent predictions */}
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h2 className="font-[var(--font-heading)] text-base font-bold mb-4 flex items-center gap-2">
          <span>📋</span> Últimas Predicciones
          <span className="text-xs font-normal text-white/30 ml-auto">{totalPredictions} total</span>
        </h2>

        {matchPredictions.length > 0 ? (
          <div className="space-y-1">
            {matchPredictions.slice(0, 10).map((pred) => (
              <div
                key={pred.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-white/3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-xs font-mono text-white/25 shrink-0 w-14"
                  >
                    Partido #{pred.match_id}
                  </span>
                  <span
                    className="text-sm font-semibold shrink-0"
                    style={{ color: "var(--color-gold-300)" }}
                  >
                    {pred.predicted_home_goals} — {pred.predicted_away_goals}
                  </span>
                </div>
                {pred.points_earned !== null ? (
                  <span className="points-badge">{pred.points_earned} pts</span>
                ) : (
                  <span className="text-xs text-white/20">Pendiente</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/25 text-sm text-center py-6">
            Aún no has hecho predicciones de partidos.
          </p>
        )}
      </div>
    </div>
  );
}
