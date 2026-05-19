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

const STAGES = [
  { key: "group",       label: "Grupos"     },
  { key: "round_of_32", label: "32avos"     },
  { key: "round_of_16", label: "Octavos"    },
  { key: "quarter_final",label: "Cuartos"   },
  { key: "semi_final",  label: "Semis"      },
  { key: "third_place", label: "3er Puesto" },
  { key: "final",       label: "Final"      },
];
const GROUPS = "ABCDEFGHIJKL".split("");

export default function DashboardPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<number, MatchPrediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [activeStage, setActiveStage] = useState("group");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [localPredictions, setLocalPredictions] = useState<Record<number, { home: string; away: string }>>({});

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: matchesData } = await supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true });

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

  useEffect(() => { loadData(); }, [loadData]);

  // Supabase Realtime: update match scores live as they come in
  useEffect(() => {
    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, home_goals: payload.new.home_goals, away_goals: payload.new.away_goals, is_finished: payload.new.is_finished }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

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
      const { error } = await supabase.from("match_predictions").update({
        predicted_home_goals: homeGoals,
        predicted_away_goals: awayGoals,
      }).eq("id", existing.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from("match_predictions").insert({
        user_id: userId, match_id: matchId,
        predicted_home_goals: homeGoals, predicted_away_goals: awayGoals,
      });
      if (error) alert(error.message);
    }

    await loadData();
    setSavingMatch(null);
  };

  const filteredMatches = matches.filter((m) => {
    if (m.stage !== activeStage) return false;
    if (activeStage === "group" && activeGroup && m.group_letter !== activeGroup) return false;
    return true;
  });

  const predCount = filteredMatches.filter((m) => predictions[m.id]).length;

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 960, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px", maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>
            Partidos
          </h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Introduce tu predicción antes del pitido inicial
          </p>
        </div>
        {filteredMatches.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.5rem", color: "#D4AF37", lineHeight: 1 }}>
              {predCount}/{filteredMatches.length}
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>predicciones</div>
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 4, paddingBottom: 4 }}>
        {STAGES.map((s) => {
          const active = activeStage === s.key;
          return (
            <button key={s.key} onClick={() => { setActiveStage(s.key); if (s.key !== "group") setActiveGroup(null); }}
              style={{
                padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-heading)",
                whiteSpace: "nowrap", transition: "all 0.15s",
                background: active ? "rgba(212,175,55,0.15)" : "transparent",
                color: active ? "#D4AF37" : "rgba(255,255,255,0.4)",
                outline: active ? "1px solid rgba(212,175,55,0.25)" : "none",
              }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Group filter */}
      {activeStage === "group" && (
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
          {[{ key: null, label: "Todos" }, ...GROUPS.map(g => ({ key: g, label: `Grupo ${g}` }))].map(({ key, label }) => {
            const active = activeGroup === key;
            return (
              <button key={String(key)} onClick={() => setActiveGroup(key)}
                style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: "0.75rem", fontWeight: 600, fontFamily: "var(--font-heading)",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                  background: active ? "rgba(168,85,247,0.15)" : "transparent",
                  color: active ? "#a855f7" : "rgba(255,255,255,0.35)",
                  outline: active ? "1px solid rgba(168,85,247,0.25)" : "none",
                }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }} />

      {/* Match grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 12 }}>
        {filteredMatches.map((match) => {
          const locked = isPredictionLocked(match.match_date);
          const pred = predictions[match.id];
          const local = localPredictions[match.id] || {
            home: pred?.predicted_home_goals?.toString() ?? "",
            away: pred?.predicted_away_goals?.toString() ?? "",
          };
          const saving = savingMatch === match.id;
          const hasTeams = match.home_team && match.away_team;
          const canSave = !locked && hasTeams && !match.is_finished;
          const hasPred = !!pred;

          return (
            <div key={match.id} style={{
              background: "#0d1225",
              border: `1px solid ${hasPred && !match.is_finished ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 16, overflow: "hidden",
              opacity: locked ? 0.65 : 1,
            }}>
              {/* Card header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    background: "rgba(168,85,247,0.15)", color: "#a855f7",
                    fontFamily: "var(--font-heading)", fontWeight: 700,
                    fontSize: "0.65rem", padding: "3px 8px", borderRadius: 20,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    {formatStage(match.stage)}
                  </span>
                  {match.group_letter && (
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                      Grupo {match.group_letter}
                    </span>
                  )}
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.15)" }}>#{match.match_number}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {hasPred && !match.is_finished && !locked && (
                    <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✓ Guardado</span>
                  )}
                  {locked && (
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>🔒 Cerrado</span>
                  )}
                  {match.is_finished && (
                    <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✓ Final</span>
                  )}
                </div>
              </div>

              {/* Teams & score */}
              <div style={{ padding: "16px 14px" }}>
                {hasTeams ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Home */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      <Image src={getFlagUrl(match.home_team!.code, "w80")} alt={match.home_team!.name}
                        width={26} height={17} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.87rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {match.home_team!.name}
                      </span>
                    </div>

                    {/* Score */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {match.is_finished ? (
                        <>
                          <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37" }}>
                            {match.home_goals}
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: "0.9rem" }}>—</span>
                          <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37" }}>
                            {match.away_goals}
                          </div>
                        </>
                      ) : (
                        <>
                          <input type="number" min="0" max="20" disabled={locked} value={local.home}
                            onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, home: e.target.value } }))}
                            style={{
                              width: 38, height: 38, borderRadius: 10, border: `2px solid ${local.home !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`,
                              background: "rgba(255,255,255,0.05)", color: "white",
                              fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem",
                              textAlign: "center", outline: "none",
                              opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text",
                            }} placeholder="—" />
                          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: "0.9rem" }}>—</span>
                          <input type="number" min="0" max="20" disabled={locked} value={local.away}
                            onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, away: e.target.value } }))}
                            style={{
                              width: 38, height: 38, borderRadius: 10, border: `2px solid ${local.away !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`,
                              background: "rgba(255,255,255,0.05)", color: "white",
                              fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem",
                              textAlign: "center", outline: "none",
                              opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text",
                            }} placeholder="—" />
                        </>
                      )}
                    </div>

                    {/* Away */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "0.87rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                        {match.away_team!.name}
                      </span>
                      <Image src={getFlagUrl(match.away_team!.code, "w80")} alt={match.away_team!.name}
                        width={26} height={17} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "8px 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.2)" }}>
                    Equipos por determinar
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                  {match.venue && `${match.venue} · `}{formatMatchDate(match.match_date)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {pred && pred.points_earned !== null && (
                    <span style={{ background: "linear-gradient(135deg, #D4AF37, #b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "3px 10px", borderRadius: 20, fontSize: "0.8rem" }}>
                      {pred.points_earned} pts
                    </span>
                  )}
                  {canSave && (
                    <button onClick={() => savePrediction(match.id)}
                      disabled={saving || !local.home || !local.away}
                      style={{
                        background: "linear-gradient(135deg, #D4AF37, #b8941e)",
                        color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800,
                        padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: "0.78rem", opacity: (saving || !local.home || !local.away) ? 0.4 : 1,
                        transition: "opacity 0.15s",
                      }}>
                      {saving ? "..." : hasPred ? "Actualizar" : "Guardar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredMatches.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "60px 24px", textAlign: "center", color: "rgba(255,255,255,0.2)", background: "#0d1225", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
            No hay partidos en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
