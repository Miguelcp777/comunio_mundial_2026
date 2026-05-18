"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatMatchDate, formatStage, isPredictionLocked } from "@/lib/utils";
import type { Team, Match, MatchPrediction } from "@/lib/types/database";
import Image from "next/image";

type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
};

export default function DashboardPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<number, MatchPrediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState("group");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [localPredictions, setLocalPredictions] = useState<
    Record<number, { home: string; away: string }>
  >({});

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: matchesData } = await supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_number");

    if (matchesData) setMatches(matchesData as MatchWithTeams[]);

    if (user) {
      const { data: predsData } = await supabase
        .from("match_predictions")
        .select("*")
        .eq("user_id", user.id);

      if (predsData) {
        const map: Record<number, MatchPrediction> = {};
        predsData.forEach((p) => (map[p.match_id] = p));
        setPredictions(map);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePrediction = async (matchId: number) => {
    if (!userId) return;
    const local = localPredictions[matchId];
    if (!local) return;

    const homeGoals = parseInt(local.home);
    const awayGoals = parseInt(local.away);
    if (isNaN(homeGoals) || isNaN(awayGoals) || homeGoals < 0 || awayGoals < 0) return;

    setSavingMatch(matchId);

    const existing = predictions[matchId];
    if (existing) {
      const { error } = await supabase
        .from("match_predictions")
        .update({
          predicted_home_goals: homeGoals,
          predicted_away_goals: awayGoals,
        })
        .eq("id", existing.id);

      if (error) {
        alert(error.message);
      }
    } else {
      const { error } = await supabase
        .from("match_predictions")
        .insert({
          user_id: userId,
          match_id: matchId,
          predicted_home_goals: homeGoals,
          predicted_away_goals: awayGoals,
        });

      if (error) {
        alert(error.message);
      }
    }

    await loadData();
    setSavingMatch(null);
  };

  const stages = [
    { key: "group", label: "Grupos" },
    { key: "round_of_32", label: "32avos" },
    { key: "round_of_16", label: "Octavos" },
    { key: "quarter_final", label: "Cuartos" },
    { key: "semi_final", label: "Semis" },
    { key: "third_place", label: "3er Puesto" },
    { key: "final", label: "Final" },
  ];

  const groups = "ABCDEFGHIJKL".split("");

  const filteredMatches = matches.filter((m) => {
    if (m.stage !== activeStage) return false;
    if (activeStage === "group" && activeGroup && m.group_letter !== activeGroup) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold">
          ⚽ <span className="text-gold-gradient">Partidos</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Introduce tu predicción antes de que se cierre el candado
        </p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {stages.map((s) => (
          <button
            key={s.key}
            onClick={() => {
              setActiveStage(s.key);
              if (s.key !== "group") setActiveGroup(null);
            }}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all
              ${activeStage === s.key
                ? "bg-gold-400/15 text-gold-300 shadow-sm"
                : "text-white/50 hover:text-white hover:bg-white/5"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Group filter (only for group stage) */}
      {activeStage === "group" && (
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${!activeGroup ? "bg-purple-glow/20 text-purple-soft" : "text-white/40 hover:text-white/70"}`}
          >
            Todos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeGroup === g ? "bg-purple-glow/20 text-purple-soft" : "text-white/40 hover:text-white/70"}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Matches list */}
      <div className="space-y-4">
        {filteredMatches.map((match) => {
          const locked = isPredictionLocked(match.match_date);
          const pred = predictions[match.id];
          const local = localPredictions[match.id] || {
            home: pred?.predicted_home_goals?.toString() ?? "",
            away: pred?.predicted_away_goals?.toString() ?? "",
          };
          const saving = savingMatch === match.id;
          const hasTeams = match.home_team && match.away_team;

          return (
            <div
              key={match.id}
              className={`glass p-4 sm:p-6 transition-all duration-300 ${
                locked ? "opacity-75" : "hover:glow-gold"
              }`}
            >
              {/* Match header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="stage-badge">{formatStage(match.stage)}</span>
                  {match.group_letter && (
                    <span className="text-xs text-white/30">Grupo {match.group_letter}</span>
                  )}
                  <span className="text-xs text-white/20">#{match.match_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  {locked && (
                    <span className="lock-pulse text-sm" title="Predicciones cerradas">🔒</span>
                  )}
                  {match.is_finished && (
                    <span className="text-xs text-success font-medium">✓ Finalizado</span>
                  )}
                </div>
              </div>

              {/* Teams & Score */}
              {hasTeams ? (
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Home team */}
                  <div className="flex-1 flex items-center gap-2 sm:gap-3 justify-end text-right">
                    <span className="text-sm sm:text-base font-semibold truncate">
                      {match.home_team!.name}
                    </span>
                    <Image
                      src={getFlagUrl(match.home_team!.code, "w80")}
                      alt={match.home_team!.name}
                      width={36}
                      height={24}
                      className="flag-img shrink-0"
                    />
                  </div>

                  {/* Score inputs */}
                  <div className="flex items-center gap-2 shrink-0">
                    {match.is_finished ? (
                      <div className="flex items-center gap-2">
                        <span className="score-input flex items-center justify-center !cursor-default bg-gold-400/10 !border-gold-400/30">
                          {match.home_goals}
                        </span>
                        <span className="text-white/30 font-bold">-</span>
                        <span className="score-input flex items-center justify-center !cursor-default bg-gold-400/10 !border-gold-400/30">
                          {match.away_goals}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={locked}
                          value={local.home}
                          onChange={(e) =>
                            setLocalPredictions((prev) => ({
                              ...prev,
                              [match.id]: { ...local, home: e.target.value },
                            }))
                          }
                          className="score-input"
                          placeholder="-"
                        />
                        <span className="text-white/30 font-bold">-</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={locked}
                          value={local.away}
                          onChange={(e) =>
                            setLocalPredictions((prev) => ({
                              ...prev,
                              [match.id]: { ...local, away: e.target.value },
                            }))
                          }
                          className="score-input"
                          placeholder="-"
                        />
                      </div>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex-1 flex items-center gap-2 sm:gap-3">
                    <Image
                      src={getFlagUrl(match.away_team!.code, "w80")}
                      alt={match.away_team!.name}
                      width={36}
                      height={24}
                      className="flag-img shrink-0"
                    />
                    <span className="text-sm sm:text-base font-semibold truncate">
                      {match.away_team!.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-white/30 text-sm">
                  Equipos por determinar
                </div>
              )}

              {/* Footer: date + save button + points */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-white/30">
                  {match.venue} · {formatMatchDate(match.match_date)}
                </div>
                <div className="flex items-center gap-2">
                  {pred && pred.points_earned !== null && (
                    <span className="points-badge">
                      {pred.points_earned} pts
                    </span>
                  )}
                  {!locked && hasTeams && !match.is_finished && (
                    <button
                      onClick={() => savePrediction(match.id)}
                      disabled={saving || !local.home || !local.away}
                      className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-40"
                    >
                      {saving ? "..." : pred ? "Actualizar" : "Guardar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="glass p-12 text-center text-white/30">
            No hay partidos en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
