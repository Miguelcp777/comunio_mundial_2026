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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="skeleton h-48 w-full mb-4" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!profile) return null;

  const totalPredictions = matchPredictions.length;
  const scored = matchPredictions.filter((p) => p.points_earned !== null);
  const totalMatchPoints = scored.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const perfectScores = scored.filter((p) => p.points_earned === 5).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="glass-strong glow-gold p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gold-400/20 flex items-center justify-center text-3xl">
            👤
          </div>
          <div>
            <h1 className="font-[var(--font-heading)] text-2xl font-bold text-gold-gradient">
              {profile.display_name}
            </h1>
            <p className="text-sm text-white/40">
              Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: profile.total_points, label: "Puntos totales", icon: "🏆" },
            { value: totalPredictions, label: "Predicciones", icon: "📝" },
            { value: perfectScores, label: "Plenos (5 pts)", icon: "🎯" },
            { value: scored.length ? (totalMatchPoints / scored.length).toFixed(1) : "—", label: "Media pts/partido", icon: "📊" },
          ].map((stat) => (
            <div key={stat.label} className="glass p-3 text-center">
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="font-[var(--font-heading)] text-xl font-bold text-gold-300">
                {stat.value}
              </div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament prediction */}
      <div className="glass p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-heading)] text-lg font-bold">
            🏆 Predicción del Torneo
          </h2>
          <Link href="/onboarding" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
            Editar
          </Link>
        </div>

        {tournamentPred ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Campeón", teamId: tournamentPred.champion_team_id, emoji: "🥇" },
              { label: "Subcampeón", teamId: tournamentPred.runner_up_team_id, emoji: "🥈" },
              { label: "3er Puesto", teamId: tournamentPred.third_place_team_id, emoji: "🥉" },
            ].map((item) => {
              const team = getTeam(item.teamId);
              return (
                <div key={item.label} className="text-center">
                  <span className="text-2xl block mb-2">{item.emoji}</span>
                  {team && (
                    <>
                      <Image
                        src={getFlagUrl(team.code, "w80")}
                        alt={team.name}
                        width={40}
                        height={27}
                        className="flag-img mx-auto mb-1"
                      />
                      <span className="text-sm font-medium">{team.name}</span>
                    </>
                  )}
                  <div className="text-xs text-white/30 mt-1">{item.label}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm mb-3">No has hecho tu predicción del torneo</p>
            <Link href="/onboarding" className="btn-primary text-sm !py-2 !px-4">
              Hacer predicción
            </Link>
          </div>
        )}
      </div>

      {/* Recent predictions */}
      <div className="glass p-6">
        <h2 className="font-[var(--font-heading)] text-lg font-bold mb-4">
          📝 Últimas Predicciones
        </h2>

        {matchPredictions.length > 0 ? (
          <div className="space-y-2">
            {matchPredictions.slice(0, 10).map((pred) => (
              <div key={pred.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/60">
                  Partido #{pred.match_id} → {pred.predicted_home_goals} - {pred.predicted_away_goals}
                </span>
                {pred.points_earned !== null && (
                  <span className="points-badge">{pred.points_earned} pts</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-4">
            Aún no has hecho predicciones de partidos.
          </p>
        )}
      </div>
    </div>
  );
}
