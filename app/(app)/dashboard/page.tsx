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

      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from("match_predictions")
        .insert({
          user_id: userId,
          match_id: matchId,
          predicted_home_goals: homeGoals,
          predicted_away_goals: awayGoals,
        });

      if (error) alert(error.message);
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

  // Count predictions made for current filtered matches
  const predCount = filteredMatches.filter((m) => predictions[m.id]).length;

  if (loading) {
    return (
      <div className="px-4 py-8 max-w-5xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold">
            <span className="text-gold-gradient">Partidos</span>
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Introduce tu predicción antes del candado
          </p>
        </div>
        {filteredMatches.length > 0 && (
          <div className="text-right shrink-0 ml-4">
            <div className="font-[var(--font-heading)] text-xl font-bold text-gold-300">
              {predCount}/{filteredMatches.length}
            </div>
            <div className="text-xs text-white/30">predicciones</div>
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div className="mb-1">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {stages.map((s) => {
            const isActive = activeStage === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setActiveStage(s.key);
                  if (s.key !== "group") setActiveGroup(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200
                  ${isActive
                    ? "text-gold-300"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                style={isActive ? { background: "rgba(212,175,55,0.12)" } : {}}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group filter — only for group stage */}
      {activeStage === "group" && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 mb-3 mt-2">
          <button
            onClick={() => setActiveGroup(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${!activeGroup
                ? "text-purple-soft"
                : "text-white/35 hover:text-white/60 hover:bg-white/5"
              }`}
            style={!activeGroup ? { background: "rgba(168,85,247,0.12)" } : {}}
          >
            Todos
          </button>
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${activeGroup === g
                  ? "text-purple-soft"
                  : "text-white/35 hover:text-white/60 hover:bg-white/5"
                }`}
              style={activeGroup === g ? { background: "rgba(168,85,247,0.12)" } : {}}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="mb-4 border-t border-white/5" />

      {/* Matches grid — 1 col on mobile/tablet, 2 cols on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {filteredMatches.map((match) => {
          const locked = isPredictionLocked(match.match_date);
          const pred = predictions[match.id];
          const local = localPredictions[match.id] || {
            home: pred?.predicted_home_goals?.toString() ?? "",
            away: pred?.predicted_away_goals?.toString() ?? "",
          };
          const saving = savingMatch === match.id;
          const hasTeams = match.home_team && match.away_team;
          const hasPrediction = !!pred;
          const canSave = !locked && hasTeams && !match.is_finished;

          return (
            <div
              key={match.id}
              className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
                locked ? "opacity-70" : "hover:glow-gold"
              } ${hasPrediction && !match.is_finished ? "border-gold-400/10" : ""}`}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="stage-badge shrink-0">{formatStage(match.stage)}</span>
                  {match.group_letter && (
                    <span className="text-xs text-white/30 shrink-0">Grupo {match.group_letter}</span>
                  )}
                  <span className="text-xs text-white/15 shrink-0">#{match.match_number}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {hasPrediction && !match.is_finished && !locked && (
                    <span className="text-xs text-success/70 font-medium">✓ Guardado</span>
                  )}
                  {locked && (
                    <span className="lock-pulse text-xs text-white/35 flex items-center gap-1">
                      🔒 <span className="hidden sm:inline">Cerrado</span>
                    </span>
                  )}
                  {match.is_finished && (
                    <span className="text-xs text-success font-semibold">✓ Final</span>
                  )}
                </div>
              </div>

              {/* Teams & score */}
              <div className="px-4 py-4">
                {hasTeams ? (
                  <div className="flex items-center gap-2">
                    {/* Home team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Image
                        src={getFlagUrl(match.home_team!.code, "w80")}
                        alt={match.home_team!.name}
                        width={28}
                        height={19}
                        className="flag-img shrink-0"
                      />
                      <span className="text-sm font-semibold truncate">
                        {match.home_team!.name}
                      </span>
                    </div>

                    {/* Score section */}
                    <div className="flex items-center gap-1.5 shrink-0 mx-1">
                      {match.is_finished ? (
                        <>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-gold-300"
                            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}
                          >
                            {match.home_goals}
                          </div>
                          <span className="text-white/20 font-bold text-sm">—</span>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-gold-300"
                            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)" }}
                          >
                            {match.away_goals}
                          </div>
                        </>
                      ) : (
                        <>
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
                            className="score-input !w-10 !h-10 !text-base"
                            placeholder="—"
                          />
                          <span className="text-white/20 font-bold text-sm">—</span>
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
                            className="score-input !w-10 !h-10 !text-base"
                            placeholder="—"
                          />
                        </>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-semibold truncate text-right">
                        {match.away_team!.name}
                      </span>
                      <Image
                        src={getFlagUrl(match.away_team!.code, "w80")}
                        alt={match.away_team!.name}
                        width={28}
                        height={19}
                        className="flag-img shrink-0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-white/25 text-sm">
                    Equipos por determinar
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="text-xs text-white/25 truncate mr-2">
                  {match.venue && <span>{match.venue} · </span>}
                  {formatMatchDate(match.match_date)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pred && pred.points_earned !== null && (
                    <span className="points-badge">{pred.points_earned} pts</span>
                  )}
                  {canSave && (
                    <button
                      onClick={() => savePrediction(match.id)}
                      disabled={saving || !local.home || !local.away}
                      className="btn-primary !py-1.5 !px-3.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "..." : hasPrediction ? "Actualizar" : "Guardar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div className="xl:col-span-2 glass rounded-2xl p-12 text-center text-white/30">
            No hay partidos en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
