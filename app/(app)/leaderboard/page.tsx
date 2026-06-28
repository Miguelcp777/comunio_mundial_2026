"use client";
/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatStage, getTeamName } from "@/lib/utils";
import type { Profile, Team } from "@/lib/types/database";
import Image from "next/image";

const RANK_COLORS = [
  { bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.25)", text: "#D4AF37", medal: "🥇" },
  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", medal: "🥈" },
  { bg: "rgba(180,120,60,0.08)", border: "rgba(180,120,60,0.2)", text: "#cd7c3a", medal: "🥉" },
];

// Paleta para las líneas de la gráfica de evolución
const LINE_PALETTE = [
  "#D4AF37", "#a855f7", "#22c55e", "#3b82f6", "#ef4444", "#ec4899",
  "#f59e0b", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4", "#84cc16",
  "#e11d48", "#64748b", "#eab308", "#10b981",
];

// Un punto de la línea temporal: posición y puntos de cada jugador tras una jornada
type TimelinePoint = { label: string; date: string; ranks: Record<string, number>; points: Record<string, number> };

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

/* ── Desempates de clasificación ──
 * Orden: 1) puntos totales  2) plenos (resultado exacto = 5 pts)
 *        3) aciertos 1-X-2 (signo, >= 3 pts)  4) goles individuales acertados
 * Todo se deriva de points_earned. Valores posibles por partido: 0, 1, 3, 4, 5.
 *   pleno ⟺ 5 · signo ⟺ >= 3 · goles: 5→2, 4→1, 1→1, resto→0
 */
type RankStat = { plenos: number; signos: number; goles: number };
const EMPTY_STAT: RankStat = { plenos: 0, signos: 0, goles: 0 };

function golesAcertados(pe: number): number {
  if (pe === 5) return 2;
  if (pe === 4 || pe === 1) return 1;
  return 0;
}

function computeRankStats(rows: { user_id: string; points_earned: number | null }[]): Record<string, RankStat> {
  const map: Record<string, RankStat> = {};
  for (const r of rows) {
    if (r.points_earned === null) continue;
    const st = (map[r.user_id] ??= { plenos: 0, signos: 0, goles: 0 });
    if (r.points_earned === 5) st.plenos++;
    if (r.points_earned >= 3) st.signos++;
    st.goles += golesAcertados(r.points_earned);
  }
  return map;
}

function sortByRanking(profiles: Profile[], stats: Record<string, RankStat>): Profile[] {
  return [...profiles].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    const sa = stats[a.id] ?? EMPTY_STAT;
    const sb = stats[b.id] ?? EMPTY_STAT;
    if (sb.plenos !== sa.plenos) return sb.plenos - sa.plenos;     // 2º: más plenos
    if (sb.signos !== sa.signos) return sb.signos - sa.signos;     // 3º: más 1-X-2
    if (sb.goles !== sa.goles) return sb.goles - sa.goles;         // 4º: más goles acertados
    return a.display_name.localeCompare(b.display_name);           // estable: alfabético
  });
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Record<string, RankStat>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PointsDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga perfiles + estadísticas de desempate y ordena con los 4 criterios
  const loadLeaderboard = useCallback(async () => {
    const [profRes, predRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("match_predictions").select("user_id, points_earned").not("points_earned", "is", null),
    ]);
    const rankStats = computeRankStats(predRes.data ?? []);
    setStats(rankStats);
    setProfiles(sortByRanking(profRes.data ?? [], rankStats));
  }, [supabase]);

  // Reconstruye la evolución de la clasificación: puntos acumulados (de partidos) y
  // posición de cada jugador tras cada jornada con resultados. Derivado de los datos
  // existentes — no se almacenan snapshots.
  const loadTimeline = useCallback(async () => {
    const [matchesRes, predsRes, profRes] = await Promise.all([
      supabase.from("matches").select("id, match_date").eq("is_finished", true).not("match_date", "is", null).order("match_date", { ascending: true }),
      supabase.from("match_predictions").select("user_id, match_id, points_earned").not("points_earned", "is", null),
      supabase.from("profiles").select("id, display_name"),
    ]);
    const fmatches = (matchesRes.data ?? []) as { id: number; match_date: string }[];
    const preds = (predsRes.data ?? []) as { user_id: string; match_id: number; points_earned: number }[];
    const profs = (profRes.data ?? []) as { id: string; display_name: string }[];
    if (!fmatches.length || !profs.length) { setTimeline([]); return; }

    const predsByMatch = new Map<number, { user_id: string; pts: number }[]>();
    for (const p of preds) {
      if (p.points_earned == null) continue;
      const arr = predsByMatch.get(p.match_id) ?? [];
      arr.push({ user_id: p.user_id, pts: p.points_earned });
      predsByMatch.set(p.match_id, arr);
    }

    const day = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
    const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "Europe/Madrid" });

    // Partidos agrupados por día (en orden cronológico — fmatches viene ordenado)
    const byDay = new Map<string, { ids: number[]; firstIso: string }>();
    for (const m of fmatches) {
      const d = day(m.match_date);
      const entry = byDay.get(d) ?? { ids: [], firstIso: m.match_date };
      entry.ids.push(m.id);
      byDay.set(d, entry);
    }

    const cumulative: Record<string, number> = {};
    for (const pr of profs) cumulative[pr.id] = 0;

    const tl: TimelinePoint[] = [];
    for (const [d, entry] of byDay) {
      for (const mid of entry.ids) {
        for (const pr of predsByMatch.get(mid) ?? []) {
          cumulative[pr.user_id] = (cumulative[pr.user_id] ?? 0) + pr.pts;
        }
      }
      const ordered = [...profs].sort((a, b) =>
        (cumulative[b.id] ?? 0) - (cumulative[a.id] ?? 0) || a.display_name.localeCompare(b.display_name)
      );
      const ranks: Record<string, number> = {};
      const points: Record<string, number> = {};
      ordered.forEach((pr, i) => { ranks[pr.id] = i + 1; points[pr.id] = cumulative[pr.id] ?? 0; });
      tl.push({ label: dayLabel(entry.firstIso), date: d, ranks, points });
    }
    setTimeline(tl);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      await Promise.all([loadLeaderboard(), loadTimeline()]);
      setLoading(false);
    })();
  }, [loadLeaderboard, loadTimeline]);

  // Realtime: cuando cambian los puntos, refresca perfiles + desempates y re-ordena.
  // Debounce porque un sync actualiza varios perfiles seguidos (ráfaga de eventos).
  useEffect(() => {
    const channel = supabase
      .channel("profiles-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          if (refetchTimer.current) clearTimeout(refetchTimer.current);
          refetchTimer.current = setTimeout(() => { loadLeaderboard(); loadTimeline(); }, 400);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [supabase, loadLeaderboard, loadTimeline]);

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
      // Vía endpoint de servidor: RLS solo deja ver la predicción de torneo propia desde el cliente
      fetch(`/api/tournament-prediction?userId=${profile.id}`).then(r => r.json()).catch(() => null),
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

    const tourn = (tournRes as any)?.prediction ?? null;
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

        {/* Evolución de la clasificación */}
        <RankTimeline timeline={timeline} profiles={profiles} currentUserId={currentUserId} />

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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: isMe ? "#D4AF37" : "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {profile.display_name}
                      {isMe && <span style={{ marginLeft: 6, fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>tú</span>}
                    </div>
                    {(() => {
                      const st = stats[profile.id];
                      if (!st || (st.plenos === 0 && st.signos === 0)) return null;
                      return (
                        <div style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.32)", marginTop: 2, fontWeight: 600, whiteSpace: "nowrap" }}>
                          🎯 {st.plenos} {st.plenos === 1 ? "pleno" : "plenos"} · ✅ {st.signos} 1X2
                        </div>
                      );
                    })()}
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

/* ── Gráfica de evolución de la clasificación (bump chart) ── */
function RankTimeline({ timeline, profiles, currentUserId }: { timeline: TimelinePoint[]; profiles: Profile[]; currentUserId: string | null }) {
  const [iso, setIso] = useState<string | null>(null); // jugador aislado al pulsar la leyenda
  const [open, setOpen] = useState(true);

  const cardStyle: React.CSSProperties = {
    background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16, overflow: "hidden", marginBottom: 24,
  };
  const header = (
    <button onClick={() => setOpen(o => !o)} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer",
    }}>
      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", color: "white", display: "flex", alignItems: "center", gap: 8 }}>
        📈 Evolución de la clasificación
      </span>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
    </button>
  );

  if (timeline.length === 0) {
    return (
      <div style={cardStyle}>
        {header}
        {open && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            Aún no hay resultados suficientes para mostrar la evolución.
          </div>
        )}
      </div>
    );
  }

  const colorOf = (id: string) => LINE_PALETTE[Math.max(0, profiles.findIndex(p => p.id === id)) % LINE_PALETTE.length];
  const nameOf = (id: string) => profiles.find(p => p.id === id)?.display_name ?? "?";

  // Layout del SVG
  const n = timeline.length;
  const rows = Math.max(profiles.length, 1);
  const mL = 30, mR = 96, mT = 18, mB = 30;
  const W = Math.max(560, mL + mR + (n - 1) * 46);
  const H = mT + mB + Math.max(rows - 1, 1) * 30;
  const innerW = W - mL - mR;
  const innerH = H - mT - mB;
  const x = (i: number) => (n > 1 ? mL + (i * innerW) / (n - 1) : mL + innerW / 2);
  const y = (rank: number) => (rows > 1 ? mT + ((rank - 1) * innerH) / (rows - 1) : mT + innerH / 2);

  const last = timeline[n - 1];
  // jugadores ordenados por su posición final (para dibujar el líder al final encima)
  const drawOrder = [...profiles].map(p => p.id).filter(id => last.ranks[id] != null);
  const xLabelEvery = Math.ceil(n / 8);

  const lineStyle = (id: string) => {
    const isMe = id === currentUserId;
    let opacity = isMe ? 1 : 0.85;
    let width = isMe ? 3 : 1.8;
    if (iso) { const on = id === iso; opacity = on ? 1 : 0.08; width = on ? 3.2 : 1.5; }
    return { opacity, width };
  };

  return (
    <div style={cardStyle}>
      {header}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "8px 8px 14px" }}>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", padding: "4px 8px 8px" }}>
            Posición tras cada jornada (1 = líder). Pulsa un nombre para resaltarlo.
          </p>
          <div style={{ overflowX: "auto", overflowY: "hidden" }}>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", maxWidth: "none" }}>
              {/* Gridlines + números de posición */}
              {Array.from({ length: rows }, (_, r) => r + 1).map(r => (
                <g key={`grid-${r}`}>
                  <line x1={mL} y1={y(r)} x2={mL + innerW} y2={y(r)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  <text x={mL - 8} y={y(r) + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)" fontWeight={700}>{r}</text>
                </g>
              ))}
              {/* Etiquetas de fecha en el eje X */}
              {timeline.map((tp, i) => (
                (i % xLabelEvery === 0 || i === n - 1) ? (
                  <text key={`xl-${i}`} x={x(i)} y={H - 10} textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.3)">{tp.label}</text>
                ) : null
              ))}
              {/* Líneas de cada jugador */}
              {drawOrder.map(id => {
                const { opacity, width } = lineStyle(id);
                const col = colorOf(id);
                const d = timeline.map((tp, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(tp.ranks[id]).toFixed(1)}`).join(" ");
                return (
                  <path key={`ln-${id}`} d={d} fill="none" stroke={col} strokeWidth={width} strokeOpacity={opacity}
                    strokeLinejoin="round" strokeLinecap="round" onClick={() => setIso(iso === id ? null : id)} style={{ cursor: "pointer" }} />
                );
              })}
              {/* Puntos + tooltip nativo */}
              {drawOrder.map(id => {
                const { opacity } = lineStyle(id);
                const col = colorOf(id);
                const isMe = id === currentUserId;
                return timeline.map((tp, i) => (
                  <circle key={`dot-${id}-${i}`} cx={x(i)} cy={y(tp.ranks[id])} r={isMe ? 3 : 2.3}
                    fill={col} fillOpacity={opacity} stroke="#0d1225" strokeWidth={0.8}>
                    <title>{`${nameOf(id)} · #${tp.ranks[id]} · ${tp.points[id]} pts (${tp.label})`}</title>
                  </circle>
                ));
              })}
              {/* Nombre al final de cada línea */}
              {drawOrder.map(id => {
                const { opacity } = lineStyle(id);
                const isMe = id === currentUserId;
                const nm = nameOf(id);
                return (
                  <text key={`end-${id}`} x={mL + innerW + 6} y={y(last.ranks[id]) + 3} fontSize={9.5}
                    fill={colorOf(id)} fillOpacity={opacity} fontWeight={isMe ? 900 : 700}>
                    {nm.length > 11 ? nm.slice(0, 10) + "…" : nm}{isMe ? " (tú)" : ""}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Leyenda clicable */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 8px 2px" }}>
            {profiles.map((p, i) => {
              const on = iso === p.id;
              const isMe = p.id === currentUserId;
              return (
                <button key={p.id} onClick={() => setIso(on ? null : p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 16,
                    border: `1px solid ${on ? colorOf(p.id) : "rgba(255,255,255,0.08)"}`,
                    background: on ? "rgba(255,255,255,0.06)" : "transparent",
                    cursor: "pointer", fontSize: "0.72rem",
                    opacity: iso && !on ? 0.4 : 1,
                  }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: colorOf(p.id), flexShrink: 0 }} />
                  <span style={{ color: isMe ? "#D4AF37" : "rgba(255,255,255,0.7)", fontWeight: isMe ? 800 : 600 }}>
                    {i + 1}. {p.display_name}{isMe ? " (tú)" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Points breakdown modal ── */
function PointsModal({ detail, loading, onClose }: { detail: PointsDetail; loading: boolean; onClose: () => void }) {
  const { profile, tournamentPoints, champion, runnerUp, thirdPlace, matches } = detail;

  const matchTotal = matches.reduce((s, m) => s + m.points_earned, 0);
  const tournTotal = tournamentPoints ?? 0;
  const grandTotal = matchTotal + tournTotal;

  // Prediction stats
  const finishedMatches = matches.filter(m => m.real_home !== null);
  const perfectCount = finishedMatches.filter(m => m.points_earned === 5).length;
  const signHits = finishedMatches.filter(m => m.points_earned >= 3).length;
  const avgPts = finishedMatches.length > 0
    ? (finishedMatches.reduce((s, m) => s + m.points_earned, 0) / finishedMatches.length).toFixed(1)
    : null;
  const signPct = finishedMatches.length > 0
    ? Math.round((signHits / finishedMatches.length) * 100)
    : null;

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

            {/* Prediction stats */}
            {finishedMatches.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "Plenos (5 pts)", value: `${perfectCount}`, icon: "🎯" },
                  { label: "% 1/X/2 acertado", value: signPct !== null ? `${signPct}%` : "—", icon: "✅" },
                  { label: "Promedio/partido", value: avgPts ?? "—", icon: "📊" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.9rem", marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

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
