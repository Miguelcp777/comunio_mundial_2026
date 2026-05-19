"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatStage, getTeamName } from "@/lib/utils";
import type { Profile, Team } from "@/lib/types/database";
import Image from "next/image";

const RANK_COLORS = [
  { bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.25)", text: "#D4AF37", medal: "🥇" },
  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", medal: "🥈" },
  { bg: "rgba(180,120,60,0.08)", border: "rgba(180,120,60,0.2)", text: "#cd7c3a", medal: "🥉" },
];

type MatchBreakdown = {
  match_id: number;
  match_number: number;
  stage: string;
  predicted_home: number;
  predicted_away: number;
  real_home: number | null;
  real_away: number | null;
  points_earned: number;
  home_team: Team | null;
  away_team: Team | null;
};

type PointsDetail = {
  profile: Profile;
  tournamentPoints: number | null;
  champion: Team | null;
  runnerUp: Team | null;
  thirdPlace: Team | null;
  matches: MatchBreakdown[];
};

export default function LeaderboardPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PointsDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("total_points", { ascending: false });
      if (data) setProfiles(data);
      setLoading(false);
    }
    loadData();
  }, []);

  // Supabase Realtime: re-sort leaderboard when points change
  useEffect(() => {
    const channel = supabase
      .channel("profiles-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          setProfiles((prev) => {
            const updated = prev.map((p) =>
              p.id === payload.new.id ? { ...p, total_points: payload.new.total_points } : p
            );
            return [...updated].sort((a, b) => b.total_points - a.total_points);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const openDetail = useCallback(async (profile: Profile) => {
    setLoadingDetail(true);
    setDetail({ profile, tournamentPoints: null, champion: null, runnerUp: null, thirdPlace: null, matches: [] });

    const [predRes, tournRes] = await Promise.all([
      supabase
        .from("match_predictions")
        .select("*, match:matches(match_number, stage, home_goals, away_goals, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*))")
        .eq("user_id", profile.id)
        .not("points_earned", "is", null)
        .order("points_earned", { ascending: false }),
      supabase
        .from("tournament_predictions")
        .select("*, champion:teams!tournament_predictions_champion_team_id_fkey(*), runner_up:teams!tournament_predictions_runner_up_team_id_fkey(*), third_place:teams!tournament_predictions_third_place_team_id_fkey(*)")
        .eq("user_id", profile.id)
        .single(),
    ]);

    const matches: MatchBreakdown[] = (predRes.data ?? []).map((p: any) => ({
      match_id: p.match_id,
      match_number: p.match?.match_number ?? p.match_id,
      stage: p.match?.stage ?? "",
      predicted_home: p.predicted_home_goals,
      predicted_away: p.predicted_away_goals,
      real_home: p.match?.home_goals ?? null,
      real_away: p.match?.away_goals ?? null,
      points_earned: p.points_earned,
      home_team: p.match?.home_team ?? null,
      away_team: p.match?.away_team ?? null,
    }));

    const tourn = tournRes.data as any;
    setDetail({
      profile,
      tournamentPoints: tourn?.points_earned ?? null,
      champion: tourn?.champion ?? null,
      runnerUp: tourn?.runner_up ?? null,
      thirdPlace: tourn?.third_place ?? null,
      matches,
    });
    setLoadingDetail(false);
  }, [supabase]);

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const top3 = profiles.slice(0, 3);
  const podiumOrder = [
    top3[1] ? { profile: top3[1], rank: 1 } : null,
    top3[0] ? { profile: top3[0], rank: 0 } : null,
    top3[2] ? { profile: top3[2], rank: 2 } : null,
  ];

  return (
    <>
      <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>
            Clasificación
          </h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {profiles.length} {profiles.length === 1 ? "jugador" : "jugadores"} · Pulsa los puntos para ver el desglose
          </p>
        </div>

        {/* Podium */}
        {profiles.length >= 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {podiumOrder.map((item, idx) => {
              if (!item) return <div key={idx} />;
              const { profile, rank } = item;
              const c = RANK_COLORS[rank];
              const isMe = profile.id === currentUserId;
              const isFirst = rank === 0;
              return (
                <div key={profile.id} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 16, padding: "20px 12px", textAlign: "center",
                  marginTop: isFirst ? 0 : idx === 0 ? 20 : 32,
                  boxShadow: isFirst ? "0 0 24px rgba(212,175,55,0.1)" : "none",
                }}>
                  <div style={{ fontSize: isFirst ? "2.2rem" : "1.8rem", marginBottom: 10 }}>{c.medal}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: isFirst ? "0.9rem" : "0.82rem", color: isMe ? "#D4AF37" : "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                    {profile.display_name}
                  </div>
                  {isMe && <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>tú</div>}
                  <button
                    onClick={() => openDetail(profile)}
                    style={{
                      display: "inline-block", cursor: "pointer", border: "none",
                      background: isFirst ? "linear-gradient(135deg, #D4AF37, #b8941e)" : "rgba(255,255,255,0.08)",
                      color: isFirst ? "#070b1e" : c.text,
                      fontFamily: "var(--font-heading)", fontWeight: 900,
                      fontSize: "0.85rem", padding: "5px 14px", borderRadius: 20,
                      transition: "opacity 0.15s",
                    }}
                    title="Ver desglose de puntos"
                  >
                    {profile.total_points} pts
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {["#", "Jugador", "Pts"].map(h => (
              <span key={h} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

          {profiles.map((profile, index) => {
            const isMe = profile.id === currentUserId;
            const isTop3 = index < 3;
            const c = isTop3 ? RANK_COLORS[index] : null;
            return (
              <div key={profile.id} style={{
                display: "grid", gridTemplateColumns: "48px 1fr auto",
                padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: isMe ? "rgba(212,175,55,0.05)" : "transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {isTop3
                    ? <span style={{ fontSize: "1.2rem" }}>{c!.medal}</span>
                    : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>{index + 1}</span>
                  }
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: isMe ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
                    border: isMe ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.85rem",
                    color: isMe ? "#D4AF37" : "rgba(255,255,255,0.7)",
                  }}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", color: isMe ? "#D4AF37" : "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profile.display_name}
                    {isMe && <span style={{ marginLeft: 6, fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>tú</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => openDetail(profile)}
                    style={{
                      cursor: "pointer", border: "none",
                      background: isTop3 ? "linear-gradient(135deg, #D4AF37, #b8941e)" : "rgba(255,255,255,0.06)",
                      color: isTop3 ? "#070b1e" : "rgba(255,255,255,0.6)",
                      fontFamily: "var(--font-heading)", fontWeight: 900,
                      fontSize: "0.82rem", padding: "5px 13px", borderRadius: 20,
                      transition: "opacity 0.15s",
                    }}
                    title="Ver desglose de puntos"
                  >
                    {profile.total_points}
                  </button>
                </div>
              </div>
            );
          })}

          {profiles.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.875rem" }}>
              Aún no hay jugadores registrados.
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {detail && (
        <PointsModal
          detail={detail}
          loading={loadingDetail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

/* ── Points breakdown modal ── */
function PointsModal({ detail, loading, onClose }: { detail: PointsDetail; loading: boolean; onClose: () => void }) {
  const { profile, tournamentPoints, champion, runnerUp, thirdPlace, matches } = detail;

  const matchTotal = matches.reduce((s, m) => s + m.points_earned, 0);
  const tournTotal = tournamentPoints ?? 0;
  const grandTotal = matchTotal + tournTotal;

  const ptColor = (pts: number) =>
    pts === 5 ? "#D4AF37" : pts >= 3 ? "#22c55e" : pts > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)";

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d1225", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, width: "100%", maxWidth: 520,
          maxHeight: "85vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "#D4AF37",
            }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "white" }}>
                {profile.display_name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                Desglose de puntos
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[80, 60, 60, 60].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: h, borderRadius: 10 }} />
            ))}
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Total summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Partidos", value: matchTotal, icon: "⚽" },
                { label: "Torneo", value: tournTotal, icon: "🏆" },
                { label: "Total", value: grandTotal, icon: "🎯", highlight: true },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.highlight ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
                  border: s.highlight ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "12px 10px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "1rem", marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.3rem", color: s.highlight ? "#D4AF37" : "white", lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tournament prediction */}
            {(champion || runnerUp || thirdPlace || tournamentPoints !== null) && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.72rem", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    🏆 Predicción del Torneo
                  </span>
                  {tournamentPoints !== null && (
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.85rem", color: tournamentPoints > 0 ? "#D4AF37" : "rgba(255,255,255,0.3)" }}>
                      +{tournamentPoints} pts
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 0 }}>
                  {[
                    { label: "Campeón", team: champion, emoji: "🥇" },
                    { label: "Subcampeón", team: runnerUp, emoji: "🥈" },
                    { label: "3er Puesto", team: thirdPlace, emoji: "🥉" },
                  ].map((item, i) => (
                    <div key={item.label} style={{
                      flex: 1, padding: "12px 8px", textAlign: "center",
                      borderRight: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <div style={{ fontSize: "1.1rem", marginBottom: 6 }}>{item.emoji}</div>
                      {item.team ? (
                        <>
                          <Image src={getFlagUrl(item.team.code, "w80")} alt={getTeamName(item.team.code, item.team.name)}
                            width={28} height={18} style={{ borderRadius: 3, margin: "0 auto 4px", display: "block" }} />
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {getTeamName(item.team.code, item.team.name)}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)" }}>—</div>
                      )}
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match breakdown */}
            {matches.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.72rem", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ⚽ Partidos con puntos ({matches.length})
                  </span>
                </div>
                {matches.map((m, i) => (
                  <div key={m.match_id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    borderBottom: i < matches.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    {/* Teams */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        {m.home_team && (
                          <Image src={getFlagUrl(m.home_team.code, "w40")} alt={getTeamName(m.home_team.code, m.home_team.name)}
                            width={16} height={11} style={{ borderRadius: 2, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.home_team ? getTeamName(m.home_team.code, m.home_team.name) : `Partido #${m.match_number}`}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>vs</span>
                        {m.away_team && (
                          <Image src={getFlagUrl(m.away_team.code, "w40")} alt={getTeamName(m.away_team.code, m.away_team.name)}
                            width={16} height={11} style={{ borderRadius: 2, flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.away_team ? getTeamName(m.away_team.code, m.away_team.name) : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>
                          {formatStage(m.stage)}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)" }}>·</span>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                          Pred: {m.predicted_home}–{m.predicted_away}
                        </span>
                        {m.real_home !== null && (
                          <>
                            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)" }}>·</span>
                            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                              Real: {m.real_home}–{m.real_away}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Points */}
                    <span style={{
                      fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem",
                      color: ptColor(m.points_earned), flexShrink: 0, minWidth: 36, textAlign: "right",
                    }}>
                      +{m.points_earned}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {matches.length === 0 && tournamentPoints === null && (
              <div style={{ padding: "32px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.875rem" }}>
                Este jugador aún no tiene puntos registrados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
