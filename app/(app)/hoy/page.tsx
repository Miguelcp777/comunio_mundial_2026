"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatStage, getTeamName } from "@/lib/utils";
import type { Team, Match, MatchPrediction } from "@/lib/types/database";
import Image from "next/image";

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null };

function formatCountdown(ms: number): { h: number; m: number; s: number; urgent: boolean } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    urgent: ms < 60 * 60 * 1000,
  };
}

export default function HoyPage() {
  const supabase = createClient();
  const [todayMatches, setTodayMatches] = useState<MatchWithTeams[]>([]);
  const [nextMatch, setNextMatch] = useState<MatchWithTeams | null>(null);
  const [predictions, setPredictions] = useState<Record<number, MatchPrediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [localPreds, setLocalPreds] = useState<Record<number, { home: string; away: string }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [savedMatches, setSavedMatches] = useState<Set<number>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    const { data: allMatches } = await supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true });

    if (allMatches) {
      const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
      const today = (allMatches as MatchWithTeams[]).filter(m => {
        if (!m.match_date) return false;
        return new Date(m.match_date).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }) === todayStr;
      });
      setTodayMatches(today);

      if (today.length === 0) {
        const future = (allMatches as MatchWithTeams[]).find(
          m => m.match_date && !m.is_finished && new Date(m.match_date) > new Date()
        );
        setNextMatch(future ?? null);
      }
    }

    if (user) {
      const { data: predsData } = await supabase
        .from("match_predictions").select("*").eq("user_id", user.id);
      if (predsData) {
        const map: Record<number, MatchPrediction> = {};
        predsData.forEach(p => (map[p.match_id] = p));
        setPredictions(map);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const ch = supabase.channel("hoy-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, p => {
        setTodayMatches(prev => prev.map(m =>
          m.id === p.new.id
            ? { ...m, home_goals: p.new.home_goals, away_goals: p.new.away_goals, is_finished: p.new.is_finished }
            : m
        ));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  const isLocked = (matchDate: string | null) => {
    if (!matchDate) return true;
    return now >= new Date(matchDate).getTime() - 15 * 60 * 1000;
  };

  const firstUpcoming = todayMatches.find(
    m => m.match_date && !m.is_finished && now < new Date(m.match_date).getTime()
  );
  const countdownMs = firstUpcoming?.match_date
    ? new Date(firstUpcoming.match_date).getTime() - now
    : null;

  const savePrediction = async (matchId: number) => {
    if (!userId) return;
    const local = localPreds[matchId];
    if (!local) return;
    const hg = parseInt(local.home);
    const ag = parseInt(local.away);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) return;

    setSavingMatch(matchId);
    setSaveErrors(prev => { const n = { ...prev }; delete n[matchId]; return n; });

    const existing = predictions[matchId];
    const q = existing
      ? supabase.from("match_predictions")
          .update({ predicted_home_goals: hg, predicted_away_goals: ag })
          .eq("id", existing.id).select().single()
      : supabase.from("match_predictions")
          .insert({ user_id: userId, match_id: matchId, predicted_home_goals: hg, predicted_away_goals: ag })
          .select().single();

    const { error, data } = await q;
    if (error) {
      setSaveErrors(prev => ({ ...prev, [matchId]: "Error al guardar" }));
    } else if (data) {
      setPredictions(prev => ({ ...prev, [matchId]: data as MatchPrediction }));
      setSavedMatches(prev => new Set([...prev, matchId]));
      setTimeout(() => setSavedMatches(prev => { const s = new Set(prev); s.delete(matchId); return s; }), 2500);
    }
    setSavingMatch(null);
  };

  const todayLabel = new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid",
  });

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 36, width: 160, borderRadius: 10, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 16, width: 220, borderRadius: 8, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 130, borderRadius: 20, marginBottom: 16 }} />
        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16, marginBottom: 10 }} />)}
      </div>
    );
  }

  const cd = countdownMs !== null && countdownMs > 0 ? formatCountdown(countdownMs) : null;
  const allDone = todayMatches.length > 0 && todayMatches.every(m => m.is_finished);

  return (
    <div style={{ padding: "24px 16px", maxWidth: 600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem",
          letterSpacing: "-0.02em", color: "white",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: todayMatches.length > 0 ? "#22c55e" : "rgba(255,255,255,0.2)",
            boxShadow: todayMatches.length > 0 ? "0 0 10px rgba(34,197,94,0.7)" : "none",
            display: "inline-block", flexShrink: 0,
          }} />
          Hoy
        </h1>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", marginTop: 4, textTransform: "capitalize" }}>
          {todayLabel}
        </p>
      </div>

      {/* No matches today */}
      {todayMatches.length === 0 && (
        <div style={{
          textAlign: "center", padding: "52px 24px",
          background: "#0d1225", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>😴</div>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.1rem", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
            No hay partidos hoy
          </p>
          {nextMatch?.match_date && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                Próximo partido
              </p>
              <p style={{ fontSize: "0.9rem", color: "#D4AF37", fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                {new Date(nextMatch.match_date).toLocaleDateString("es-ES", {
                  weekday: "long", day: "numeric", month: "long",
                  timeZone: "Europe/Madrid",
                })}
              </p>
              {nextMatch.home_team && nextMatch.away_team && (
                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                  {getTeamName(nextMatch.home_team.code, nextMatch.home_team.name)} vs {getTeamName(nextMatch.away_team.code, nextMatch.away_team.name)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Countdown card */}
      {cd && firstUpcoming && (
        <div style={{
          marginBottom: 20,
          background: cd.urgent
            ? "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.04) 100%)"
            : "linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0.03) 100%)",
          border: `1px solid ${cd.urgent ? "rgba(239,68,68,0.25)" : "rgba(212,175,55,0.25)"}`,
          borderRadius: 20, padding: "22px 24px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "0.68rem", color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase", letterSpacing: "0.12em",
            marginBottom: 10, fontFamily: "var(--font-heading)", fontWeight: 700,
          }}>
            {firstUpcoming.home_team && firstUpcoming.away_team
              ? `${getTeamName(firstUpcoming.home_team.code, firstUpcoming.home_team.name)} vs ${getTeamName(firstUpcoming.away_team.code, firstUpcoming.away_team.name)}`
              : "Primer partido"} · empieza en
          </p>

          {/* Big countdown digits */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4 }}>
            {cd.h > 0 && (
              <>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "3.2rem", lineHeight: 1, color: cd.urgent ? "#ef4444" : "#D4AF37", letterSpacing: "-0.04em" }}>
                    {String(cd.h).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>h</div>
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "2.8rem", color: cd.urgent ? "rgba(239,68,68,0.5)" : "rgba(212,175,55,0.4)", lineHeight: 1.1, marginBottom: 6 }}>:</div>
              </>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "3.2rem", lineHeight: 1, color: cd.urgent ? "#ef4444" : "#D4AF37", letterSpacing: "-0.04em" }}>
                {String(cd.m).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>min</div>
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "2.8rem", color: cd.urgent ? "rgba(239,68,68,0.5)" : "rgba(212,175,55,0.4)", lineHeight: 1.1, marginBottom: 6 }}>:</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "3.2rem", lineHeight: 1, color: cd.urgent ? "#ef4444" : "#D4AF37", letterSpacing: "-0.04em" }}>
                {String(cd.s).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>seg</div>
            </div>
          </div>

          {/* Flags */}
          {firstUpcoming.home_team && firstUpcoming.away_team && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 }}>
              <Image src={getFlagUrl(firstUpcoming.home_team.code, "w80")} alt={getTeamName(firstUpcoming.home_team.code, firstUpcoming.home_team.name)} width={24} height={16} style={{ borderRadius: 3 }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                {firstUpcoming.match_date
                  ? new Date(firstUpcoming.match_date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
                  : ""}
              </span>
              <Image src={getFlagUrl(firstUpcoming.away_team.code, "w80")} alt={getTeamName(firstUpcoming.away_team.code, firstUpcoming.away_team.name)} width={24} height={16} style={{ borderRadius: 3 }} />
            </div>
          )}
        </div>
      )}

      {/* All matches done banner */}
      {allDone && (
        <div style={{
          marginBottom: 16, padding: "14px 18px", borderRadius: 14,
          background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: "1.2rem" }}>✅</span>
          <p style={{ fontSize: "0.85rem", color: "#22c55e", fontFamily: "var(--font-heading)", fontWeight: 700, margin: 0 }}>
            Todos los partidos del día finalizados
          </p>
        </div>
      )}

      {/* Match list */}
      {todayMatches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todayMatches.map(match => {
            const locked = isLocked(match.match_date);
            const pred = predictions[match.id];
            const local = localPreds[match.id] || {
              home: pred?.predicted_home_goals?.toString() ?? "",
              away: pred?.predicted_away_goals?.toString() ?? "",
            };
            const saving = savingMatch === match.id;
            const saved = savedMatches.has(match.id);
            const hasTeams = !!(match.home_team && match.away_team);
            const canSave = !locked && hasTeams && !match.is_finished;
            const saveErr = saveErrors[match.id];

            const kickoffMs = match.match_date ? new Date(match.match_date).getTime() : 0;
            const isInProgress = !match.is_finished && kickoffMs > 0 && now >= kickoffMs && now < kickoffMs + 130 * 60 * 1000;
            const matchCdMs = !locked && !match.is_finished && match.match_date
              ? new Date(match.match_date).getTime() - now : null;
            const matchCd = matchCdMs !== null && matchCdMs > 0 ? formatCountdown(matchCdMs) : null;

            let borderColor = "rgba(255,255,255,0.07)";
            if (match.is_finished) borderColor = "rgba(34,197,94,0.15)";
            else if (isInProgress) borderColor = "rgba(239,68,68,0.3)";
            else if (!locked) borderColor = "rgba(212,175,55,0.2)";

            return (
              <div key={match.id} style={{ background: "#0d1225", border: `1px solid ${borderColor}`, borderRadius: 16, overflow: "hidden" }}>

                {/* Card header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 14px",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "#D4AF37" }}>
                      {match.match_date
                        ? new Date(match.match_date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
                        : "—"}
                    </span>
                    <span style={{ fontSize: "0.63rem", color: "rgba(255,255,255,0.3)", background: "rgba(168,85,247,0.1)", padding: "2px 7px", borderRadius: 6, fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                      {formatStage(match.stage)}{match.group_letter ? ` · Gr. ${match.group_letter}` : ""}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-heading)", fontWeight: 800, flexShrink: 0 }}>
                    {match.is_finished && <span style={{ color: "#22c55e" }}>✓ Final</span>}
                    {isInProgress && <span style={{ color: "#ef4444" }}>🔴 En juego</span>}
                    {!match.is_finished && !isInProgress && locked && <span style={{ color: "rgba(255,255,255,0.25)" }}>🔒 Cerrado</span>}
                    {matchCd && (
                      <span style={{ color: matchCd.urgent ? "#ef4444" : "#22c55e" }}>
                        ⏱ {matchCd.h > 0 ? `${matchCd.h}h ${String(matchCd.m).padStart(2, "0")}m` : `${String(matchCd.m).padStart(2, "0")}:${String(matchCd.s).padStart(2, "0")}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams + prediction inputs */}
                <div style={{ padding: "14px" }}>
                  {hasTeams ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Home team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
                        <Image src={getFlagUrl(match.home_team!.code, "w80")} alt={getTeamName(match.home_team!.code, match.home_team!.name)} width={26} height={17} style={{ borderRadius: 3, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getTeamName(match.home_team!.code, match.home_team!.name)}
                        </span>
                      </div>

                      {/* Score / inputs */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {match.is_finished ? (
                          <>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", color: "#22c55e" }}>{match.home_goals}</div>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem" }}>—</span>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", color: "#22c55e" }}>{match.away_goals}</div>
                          </>
                        ) : (
                          <>
                            <input
                              type="number" min="0" max="20" disabled={locked}
                              value={local.home}
                              onChange={e => setLocalPreds(prev => ({ ...prev, [match.id]: { ...local, home: e.target.value } }))}
                              style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${local.home !== "" ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.12)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", textAlign: "center", outline: "none", opacity: locked ? 0.35 : 1, cursor: locked ? "not-allowed" : "text" }}
                              placeholder="—"
                            />
                            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.9rem", fontWeight: 700 }}>—</span>
                            <input
                              type="number" min="0" max="20" disabled={locked}
                              value={local.away}
                              onChange={e => setLocalPreds(prev => ({ ...prev, [match.id]: { ...local, away: e.target.value } }))}
                              style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${local.away !== "" ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.12)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", textAlign: "center", outline: "none", opacity: locked ? 0.35 : 1, cursor: locked ? "not-allowed" : "text" }}
                              placeholder="—"
                            />
                          </>
                        )}
                      </div>

                      {/* Away team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                          {getTeamName(match.away_team!.code, match.away_team!.name)}
                        </span>
                        <Image src={getFlagUrl(match.away_team!.code, "w80")} alt={getTeamName(match.away_team!.code, match.away_team!.name)} width={26} height={17} style={{ borderRadius: 3, flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.82rem", padding: "4px 0" }}>
                      Equipos por determinar
                    </div>
                  )}

                  {/* Save row */}
                  {hasTeams && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 28 }}>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", flex: 1 }}>
                        {saveErr && <span style={{ color: "#ef4444" }}>⚠ {saveErr}</span>}
                        {!saveErr && pred && !match.is_finished && (
                          <span>Mi pronóstico: <strong style={{ color: "#D4AF37" }}>{pred.predicted_home_goals} — {pred.predicted_away_goals}</strong></span>
                        )}
                        {match.is_finished && pred && pred.points_earned !== null && (
                          <span>
                            Mi pronóstico: {pred.predicted_home_goals}—{pred.predicted_away_goals} ·{" "}
                            <strong style={{ color: pred.points_earned === 5 ? "#D4AF37" : pred.points_earned >= 3 ? "#22c55e" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-heading)" }}>
                              {pred.points_earned} pts
                            </strong>
                          </span>
                        )}
                        {match.is_finished && !pred && (
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>Sin pronóstico</span>
                        )}
                      </div>
                      {canSave && (
                        <button
                          onClick={() => savePrediction(match.id)}
                          disabled={saving || !local.home || !local.away}
                          style={{
                            flexShrink: 0,
                            background: saved ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg,#D4AF37,#b8941e)",
                            color: saved ? "#22c55e" : "#070b1e",
                            border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
                            fontFamily: "var(--font-heading)", fontWeight: 800,
                            padding: "7px 18px", borderRadius: 9,
                            cursor: (saving || !local.home || !local.away) ? "not-allowed" : "pointer",
                            fontSize: "0.82rem",
                            opacity: (saving || !local.home || !local.away) ? 0.45 : 1,
                            transition: "all 0.2s",
                          }}
                        >
                          {saving ? "..." : saved ? "✓ Guardado" : pred ? "Actualizar" : "Guardar"}
                        </button>
                      )}
                      {locked && !match.is_finished && pred && pred.points_earned === null && (
                        <span style={{ fontSize: "0.72rem", color: "#22c55e", fontFamily: "var(--font-heading)", fontWeight: 700, flexShrink: 0 }}>✓ Enviado</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
