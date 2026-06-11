"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatMatchDate, formatStage, isPredictionLocked, getTeamName } from "@/lib/utils";
import type { Team, Match, MatchPrediction } from "@/lib/types/database";
import Image from "next/image";

/* ─── Tournament warning modal ─── */
function TournamentWarningModal({ onClose, onGo }: { onClose: () => void; onGo: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 420, background: "#0d1225",
        borderRadius: 20, border: "1px solid rgba(212,175,55,0.25)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.06)",
        padding: "32px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏆</div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.25rem", color: "white", marginBottom: 10 }}>
          ¡Aún no has predicho el torneo!
        </h2>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 8 }}>
          Elige tu Campeón, Subcampeón y 3er Clasificado antes de que empiece el Mundial.
        </p>
        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 28 }}>
          Puedes ganar hasta{" "}
          <strong style={{ color: "#D4AF37" }}>65 puntos extra</strong>{" "}
          (30 campeón + 20 sub + 15 tercero).
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onGo}
            style={{
              background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e",
              fontFamily: "var(--font-heading)", fontWeight: 900,
              padding: "12px 24px", borderRadius: 12, border: "none",
              cursor: "pointer", fontSize: "0.95rem",
            }}
          >
            🏆 Ir a Predicción del Torneo
          </button>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-heading)", fontWeight: 700,
              padding: "10px 24px", borderRadius: 12, cursor: "pointer", fontSize: "0.8rem",
            }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Predictions modal ─── */
interface PredItem {
  display_name: string;
  predicted_home_goals: number;
  predicted_away_goals: number;
  points_earned: number | null;
  is_me: boolean;
}

function PredictionsModal({
  match,
  onClose,
}: {
  match: { id: number; homeTeam: string; awayTeam: string; homeCode: string; awayCode: string; isFinished: boolean };
  onClose: () => void;
}) {
  const [items, setItems] = useState<PredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true); setError(null); setNotAvailable(null); setItems([]);
    fetch(`/api/predictions?matchId=${match.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.available === false) { setNotAvailable(d.message); }
        else if (d.error) { setError(d.error); }
        else { setItems(d.items ?? []); }
      })
      .catch(() => setError("No se pudieron cargar los pronósticos."))
      .finally(() => setLoading(false));
  }, [match.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const totalWith = items.length;
  const perfect = items.filter(p => p.points_earned === 5).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }}>
      <div ref={ref} style={{
        width: "100%", maxWidth: 480, maxHeight: "85vh",
        background: "#0d1225", borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image src={getFlagUrl(match.homeCode, "w80")} alt={match.homeTeam} width={24} height={16} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "white" }}>{match.homeTeam}</span>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>vs</span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "white" }}>{match.awayTeam}</span>
              <Image src={getFlagUrl(match.awayCode, "w80")} alt={match.awayTeam} width={24} height={16} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.85rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>👥 {totalWith} pronóstico{totalWith !== 1 ? "s" : ""}</span>
            {match.isFinished && perfect > 0 && (
              <span style={{ fontSize: "0.72rem", color: "#D4AF37" }}>🎯 {perfect} pleno{perfect !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "10px 14px" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />)}
            </div>
          )}
          {!loading && notAvailable && (
            <div style={{ margin: "24px 0", padding: "20px 18px", borderRadius: 14, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
              <span style={{ fontSize: "1.8rem" }}>🔒</span>
              <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>{notAvailable}</p>
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(239,68,68,0.7)", fontSize: "0.85rem" }}>{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>Nadie ha pronosticado este partido.</div>
          )}
          {!loading && !error && items.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10, marginBottom: 6,
              background: item.is_me ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${item.is_me ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)"}`,
            }}>
              <span style={{ flexShrink: 0, width: 22, textAlign: "center", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.75rem", color: match.isFinished && item.points_earned !== null ? (i === 0 ? "#D4AF37" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "rgba(255,255,255,0.3)") : "rgba(255,255,255,0.25)" }}>
                {match.isFinished && item.points_earned !== null ? (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`) : `${i + 1}`}
              </span>
              <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: item.is_me ? 700 : 400, color: item.is_me ? "#D4AF37" : "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.display_name}{item.is_me && <span style={{ fontSize: "0.65rem", marginLeft: 6, opacity: 0.6 }}>(tú)</span>}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "white", flexShrink: 0 }}>
                {item.predicted_home_goals} — {item.predicted_away_goals}
              </span>
              {item.points_earned !== null ? (
                <span style={{ flexShrink: 0, minWidth: 46, textAlign: "center", background: item.points_earned === 5 ? "linear-gradient(135deg,#D4AF37,#b8941e)" : item.points_earned >= 3 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: item.points_earned === 5 ? "#070b1e" : item.points_earned >= 3 ? "#22c55e" : "rgba(255,255,255,0.4)", border: item.points_earned === 5 ? "none" : `1px solid ${item.points_earned >= 3 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`, fontFamily: "var(--font-heading)", fontWeight: 800, padding: "3px 8px", borderRadius: 8, fontSize: "0.78rem" }}>
                  {item.points_earned} pts
                </span>
              ) : (
                <span style={{ flexShrink: 0, minWidth: 46, textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.2)" }}>—</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", textAlign: "center", flexShrink: 0 }}>
          Los pronósticos se revelan al cerrar las apuestas (15 min antes del partido)
        </div>
      </div>
    </div>
  );
}

/* ─── News modal ─── */
interface NewsItem { title: string; link: string; pubDate: string; source: string; description: string; }

function NewsModal({ team, onClose }: { team: { code: string; name: string }; onClose: () => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true); setError(false); setItems([]);
    fetch(`/api/news?code=${team.code}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setError(!d.items?.length); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [team.code]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    try { return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div ref={ref} style={{ width: "100%", maxWidth: 500, maxHeight: "85vh", background: "#0d1225", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <Image src={getFlagUrl(team.code, "w80")} alt={team.name} width={32} height={21} style={{ borderRadius: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.4)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "white" }}>{team.name}</div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>Últimas noticias</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.9rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 14px" }}>
          {loading && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}</div>}
          {!loading && error && <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>No se encontraron noticias recientes.</div>}
          {!loading && !error && items.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", marginBottom: 8 }}>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.25)"; (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              >
                <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
                {item.description && <div style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4, marginBottom: 6 }}>{item.description}…</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.source && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#D4AF37", background: "rgba(212,175,55,0.1)", padding: "2px 7px", borderRadius: 6 }}>{item.source}</span>}
                  {item.pubDate && <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>{formatDate(item.pubDate)}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "rgba(212,175,55,0.6)" }}>Leer →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", textAlign: "center", flexShrink: 0 }}>
          Fuente: Google News en español · Se actualiza cada 15 min
        </div>
      </div>
    </div>
  );
}

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null; };

const STAGES = [
  { key: "group",        label: "Grupos"     },
  { key: "round_of_32",  label: "32avos"     },
  { key: "round_of_16",  label: "Octavos"    },
  { key: "quarter_final",label: "Cuartos"    },
  { key: "semi_final",   label: "Semis"      },
  { key: "third_place",  label: "3er Puesto" },
  { key: "final",        label: "Final"      },
];
const GROUPS = "ABCDEFGHIJKL".split("");

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [predictions, setPredictions] = useState<Record<number, MatchPrediction>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});
  const [activeStage, setActiveStage] = useState("group");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [localPredictions, setLocalPredictions] = useState<Record<number, { home: string; away: string }>>({});
  const [newsTeam, setNewsTeam] = useState<{ code: string; name: string } | null>(null);
  const [newsBannerDismissed, setNewsBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("news_banner_dismissed") === "1";
  });
  const [viewPredictions, setViewPredictions] = useState<{ id: number; homeTeam: string; awayTeam: string; homeCode: string; awayCode: string; isFinished: boolean; } | null>(null);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ saved: number; failed: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showTournWarning, setShowTournWarning] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      userIdRef.current = user.id;
    }

    const { data: matchesData } = await supabase
      .from("matches")
      .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("match_number", { ascending: true });

    if (matchesData) setMatches(matchesData as MatchWithTeams[]);

    if (user) {
      const [predsRes, tournPredRes] = await Promise.all([
        supabase.from("match_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_predictions").select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      if (predsRes.data) {
        const map: Record<number, MatchPrediction> = {};
        predsRes.data.forEach((p) => (map[p.match_id] = p));
        setPredictions(map);
      }

      // Show tournament warning if no prediction and tournament not yet locked
      const hasTournPred = !!tournPredRes.data;
      const alreadyDismissed = sessionStorage.getItem("tourn_warning_dismissed") === "1";
      if (!hasTournPred && !alreadyDismissed && matchesData) {
        const firstMatch = matchesData.find(m => m.match_date);
        if (firstMatch?.match_date) {
          const lockTime = new Date(firstMatch.match_date).getTime() - 15 * 60 * 1000;
          if (Date.now() < lockTime) setShowTournWarning(true);
        }
      }
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Countdown ticker — re-renders every second to update countdowns and lock states
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live match score updates via Realtime
  useEffect(() => {
    const channel = supabase
      .channel("matches-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload) => {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === payload.new.id
              ? { ...m, home_goals: payload.new.home_goals, away_goals: payload.new.away_goals, is_finished: payload.new.is_finished }
              : m
          )
        );
        // When a match just finished, reload the user's prediction to show earned points
        // Delay 2s to allow the backend to finish calculating points after updating the match
        if (payload.new.is_finished) {
          setTimeout(async () => {
            const uid = userIdRef.current;
            if (!uid) return;
            const { data } = await supabase
              .from("match_predictions")
              .select("*")
              .eq("user_id", uid)
              .eq("match_id", payload.new.id)
              .maybeSingle();
            if (data) {
              setPredictions(prev => ({ ...prev, [payload.new.id]: data as MatchPrediction }));
            }
          }, 2000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Use now-based lock check so UI auto-locks without page reload
  const isMatchLocked = (matchDate: string | null): boolean => {
    if (!matchDate) return true;
    return now >= new Date(matchDate).getTime() - 15 * 60 * 1000;
  };

  // Format countdown to prediction deadline
  const getCountdown = (matchDate: string | null): string => {
    if (!matchDate) return "";
    const deadline = new Date(matchDate).getTime() - 15 * 60 * 1000;
    const diff = deadline - now;
    if (diff <= 0) return "";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const savePrediction = async (matchId: number) => {
    if (!userId) return;
    const local = localPredictions[matchId];
    if (!local) return;
    const homeGoals = parseInt(local.home);
    const awayGoals = parseInt(local.away);
    if (isNaN(homeGoals) || isNaN(awayGoals) || homeGoals < 0 || awayGoals < 0) return;

    setSavingMatch(matchId);
    setSaveErrors(prev => { const next = { ...prev }; delete next[matchId]; return next; });

    const existing = predictions[matchId];
    const query = existing
      ? supabase.from("match_predictions")
          .update({ predicted_home_goals: homeGoals, predicted_away_goals: awayGoals })
          .eq("id", existing.id)
          .select()
          .single()
      : supabase.from("match_predictions")
          .insert({ user_id: userId, match_id: matchId, predicted_home_goals: homeGoals, predicted_away_goals: awayGoals })
          .select()
          .single();

    const { error, data } = await query;
    if (error) {
      setSaveErrors(prev => ({ ...prev, [matchId]: "Error al guardar. Inténtalo de nuevo." }));
    } else if (data) {
      setPredictions(prev => ({ ...prev, [matchId]: data as MatchPrediction }));
    }
    setSavingMatch(null);
  };

  const saveAllPending = async () => {
    if (!userId) return;
    setSavingBulk(true);
    setBulkResult(null);

    const toSave = filteredMatches.filter(m => {
      if (isMatchLocked(m.match_date) || m.is_finished || !m.home_team || !m.away_team) return false;
      const local = localPredictions[m.id];
      return local && local.home !== "" && local.away !== "";
    });

    let saved = 0;
    let failed = 0;

    await Promise.allSettled(toSave.map(async (match) => {
      const local = localPredictions[match.id];
      const homeGoals = parseInt(local.home);
      const awayGoals = parseInt(local.away);
      if (isNaN(homeGoals) || isNaN(awayGoals)) { failed++; return; }

      const existing = predictions[match.id];
      const query = existing
        ? supabase.from("match_predictions")
            .update({ predicted_home_goals: homeGoals, predicted_away_goals: awayGoals })
            .eq("id", existing.id).select().single()
        : supabase.from("match_predictions")
            .insert({ user_id: userId, match_id: match.id, predicted_home_goals: homeGoals, predicted_away_goals: awayGoals })
            .select().single();

      const { error, data } = await query;
      if (error) { failed++; }
      else { saved++; if (data) setPredictions(prev => ({ ...prev, [match.id]: data as MatchPrediction })); }
    }));

    setBulkResult({ saved, failed });
    setSavingBulk(false);
    setTimeout(() => setBulkResult(null), 4000);
  };

  const dismissBanner = () => {
    localStorage.setItem("news_banner_dismissed", "1");
    setNewsBannerDismissed(true);
  };

  const dismissTournWarning = () => {
    sessionStorage.setItem("tourn_warning_dismissed", "1");
    setShowTournWarning(false);
  };

  const goToTorneo = () => {
    sessionStorage.setItem("tourn_warning_dismissed", "1");
    setShowTournWarning(false);
    router.push("/torneo");
  };

  const filteredMatches = matches.filter((m) => {
    if (m.stage !== activeStage) return false;
    if (activeStage === "group" && activeGroup && m.group_letter !== activeGroup) return false;
    return true;
  });

  const predCount = filteredMatches.filter((m) => predictions[m.id]).length;

  // Matches with unsaved local predictions (for bulk save button)
  const pendingLocalCount = filteredMatches.filter(m => {
    if (isMatchLocked(m.match_date) || m.is_finished || !m.home_team || !m.away_team) return false;
    const local = localPredictions[m.id];
    return local && local.home !== "" && local.away !== "";
  }).length;

  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const todayMatches = matches.filter((m) => {
    if (!m.match_date) return false;
    return new Date(m.match_date).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }) === todayStr;
  });

  // Tournament progress
  const finishedCount = matches.filter(m => m.is_finished).length;
  const totalMatches = matches.length;

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

      {/* Modals */}
      {showTournWarning && <TournamentWarningModal onClose={dismissTournWarning} onGo={goToTorneo} />}
      {newsTeam && <NewsModal team={newsTeam} onClose={() => setNewsTeam(null)} />}
      {viewPredictions && <PredictionsModal match={viewPredictions} onClose={() => setViewPredictions(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>Partidos</h1>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Introduce tu predicción antes del pitido inicial</p>
        </div>
        {filteredMatches.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.5rem", color: "#D4AF37", lineHeight: 1 }}>{predCount}/{filteredMatches.length}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>predicciones</div>
          </div>
        )}
      </div>

      {/* Tournament progress bar */}
      {totalMatches > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progreso del torneo</span>
            <span style={{ fontSize: "0.68rem", color: finishedCount > 0 ? "#D4AF37" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
              {finishedCount}/{totalMatches} partidos jugados
            </span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((finishedCount / totalMatches) * 100)}%`, background: "linear-gradient(90deg,#D4AF37,#ecc64e)", borderRadius: 3, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {/* News tip banner */}
      {!newsBannerDismissed && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, marginBottom: 16, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)" }}>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📰</span>
          <p style={{ flex: 1, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4, margin: 0 }}>
            <strong style={{ color: "rgba(168,85,247,0.9)" }}>Consejo:</strong> pulsa sobre el nombre o la bandera de cualquier equipo para ver sus últimas noticias y hacer mejores predicciones.
          </p>
          <button onClick={dismissBanner} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", padding: "2px 4px" }} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      {/* ── Los partidos de hoy ── */}
      {todayMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "#D4AF37", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.8)", display: "inline-block", flexShrink: 0 }} />
              Los partidos de hoy
            </h2>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" })}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayMatches.map((match) => {
              const locked  = isMatchLocked(match.match_date);
              const pred    = predictions[match.id];
              const local   = localPredictions[match.id] || { home: pred?.predicted_home_goals?.toString() ?? "", away: pred?.predicted_away_goals?.toString() ?? "" };
              const saving  = savingMatch === match.id;
              const hasTeams = match.home_team && match.away_team;
              const canSave  = !locked && hasTeams && !match.is_finished;
              const countdown = !locked && !match.is_finished ? getCountdown(match.match_date) : "";

              return (
                <div key={match.id} style={{ background: "#0d1225", border: "1px solid rgba(212,175,55,0.18)", borderRadius: 14, overflow: "hidden", boxShadow: "0 0 20px rgba(212,175,55,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", flexWrap: "wrap" }}>
                    {/* Time + stage + countdown */}
                    <div style={{ flexShrink: 0, minWidth: 52 }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.95rem", color: "#D4AF37", lineHeight: 1 }}>
                        {match.match_date ? new Date(match.match_date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }) : "—"}
                      </div>
                      {countdown ? (
                        <div style={{ fontSize: "0.62rem", color: "#22c55e", marginTop: 2, fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                          ⏱ {countdown}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {formatStage(match.stage)}
                        </div>
                      )}
                    </div>

                    <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

                    {hasTeams ? (
                      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <div onClick={() => setNewsTeam({ code: match.home_team!.code, name: getTeamName(match.home_team!.code, match.home_team!.name) })} title="Ver noticias" style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, cursor: "pointer" }}>
                          <Image src={getFlagUrl(match.home_team!.code, "w80")} alt={getTeamName(match.home_team!.code, match.home_team!.name)} width={22} height={15} style={{ borderRadius: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getTeamName(match.home_team!.code, match.home_team!.name)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {match.is_finished ? (
                            <>
                              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37", minWidth: 22, textAlign: "center" }}>{match.home_goals}</span>
                              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>—</span>
                              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37", minWidth: 22, textAlign: "center" }}>{match.away_goals}</span>
                            </>
                          ) : (
                            <>
                              <input type="number" min="0" max="20" disabled={locked} value={local.home}
                                onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, home: e.target.value } }))}
                                style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${local.home !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", textAlign: "center", outline: "none", opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text" }} placeholder="—" />
                              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>—</span>
                              <input type="number" min="0" max="20" disabled={locked} value={local.away}
                                onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, away: e.target.value } }))}
                                style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${local.away !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", textAlign: "center", outline: "none", opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text" }} placeholder="—" />
                            </>
                          )}
                        </div>
                        <div onClick={() => setNewsTeam({ code: match.away_team!.code, name: getTeamName(match.away_team!.code, match.away_team!.name) })} title="Ver noticias" style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, justifyContent: "flex-end", cursor: "pointer" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{getTeamName(match.away_team!.code, match.away_team!.name)}</span>
                          <Image src={getFlagUrl(match.away_team!.code, "w80")} alt={getTeamName(match.away_team!.code, match.away_team!.name)} width={22} height={15} style={{ borderRadius: 2, flexShrink: 0 }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ flex: 1, textAlign: "center", fontSize: "0.8rem", color: "rgba(255,255,255,0.2)" }}>Equipos por determinar</div>
                    )}

                    <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.07)", flexShrink: 0 }} />

                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {pred && pred.points_earned !== null && (
                        <span style={{ background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "3px 9px", borderRadius: 16, fontSize: "0.75rem" }}>{pred.points_earned} pts</span>
                      )}
                      {pred && pred.points_earned === null && !match.is_finished && !canSave && <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 700 }}>✓</span>}
                      {canSave && (
                        <button onClick={() => savePrediction(match.id)} disabled={saving || !local.home || !local.away} style={{ background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: "0.75rem", opacity: (saving || !local.home || !local.away) ? 0.4 : 1 }}>
                          {saving ? "..." : pred ? "✓ Actualizar" : "Guardar"}
                        </button>
                      )}
                      {locked && hasTeams && (
                        <button onClick={() => setViewPredictions({ id: match.id, homeTeam: getTeamName(match.home_team!.code, match.home_team!.name), awayTeam: getTeamName(match.away_team!.code, match.away_team!.name), homeCode: match.home_team!.code, awayCode: match.away_team!.code, isFinished: match.is_finished })}
                          style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: "0.72rem" }}>
                          👥
                        </button>
                      )}
                      {match.is_finished && <span style={{ fontSize: "0.68rem", color: "#22c55e", fontWeight: 700 }}>✓ Final</span>}
                      {locked && !match.is_finished && <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)" }}>🔒</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: "rgba(212,175,55,0.1)", margin: "20px 0 4px" }} />
        </div>
      )}

      {/* Stage tabs */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 4, paddingBottom: 4 }}>
        {STAGES.map((s) => {
          const active = activeStage === s.key;
          return (
            <button key={s.key} onClick={() => { setActiveStage(s.key); if (s.key !== "group") setActiveGroup(null); }}
              style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-heading)", whiteSpace: "nowrap", transition: "all 0.15s", background: active ? "rgba(212,175,55,0.15)" : "transparent", color: active ? "#D4AF37" : "rgba(255,255,255,0.4)", outline: active ? "1px solid rgba(212,175,55,0.25)" : "none" }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Group filter */}
      {activeStage === "group" && (
        <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
          {[{ key: null, label: "Todos" }, ...GROUPS.map(g => ({ key: g, label: `Grupo ${g}` }))].map(({ key, label }) => {
            const active = activeGroup === key;
            return (
              <button key={String(key)} onClick={() => setActiveGroup(key)}
                style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, fontFamily: "var(--font-heading)", whiteSpace: "nowrap", transition: "all 0.15s", background: active ? "rgba(168,85,247,0.15)" : "transparent", color: active ? "#a855f7" : "rgba(255,255,255,0.35)", outline: active ? "1px solid rgba(168,85,247,0.25)" : "none" }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Bulk save row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, minHeight: 34 }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", flex: 1 }} />
        {pendingLocalCount > 0 && (
          <button
            onClick={saveAllPending}
            disabled={savingBulk}
            style={{
              marginLeft: 12, flexShrink: 0,
              background: savingBulk ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37",
              fontFamily: "var(--font-heading)", fontWeight: 800,
              padding: "6px 14px", borderRadius: 8, cursor: savingBulk ? "not-allowed" : "pointer",
              fontSize: "0.75rem", opacity: savingBulk ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {savingBulk ? "Guardando..." : `Guardar todos (${pendingLocalCount})`}
          </button>
        )}
        {bulkResult && (
          <span style={{ marginLeft: 10, fontSize: "0.72rem", color: bulkResult.failed === 0 ? "#22c55e" : "#ef4444", fontWeight: 700, flexShrink: 0 }}>
            {bulkResult.failed === 0 ? `✓ ${bulkResult.saved} guardados` : `✓ ${bulkResult.saved} · ✗ ${bulkResult.failed} fallidos`}
          </span>
        )}
      </div>

      {/* Match grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: 12 }}>
        {filteredMatches.map((match) => {
          const locked = isMatchLocked(match.match_date);
          const pred = predictions[match.id];
          const local = localPredictions[match.id] || { home: pred?.predicted_home_goals?.toString() ?? "", away: pred?.predicted_away_goals?.toString() ?? "" };
          const saving = savingMatch === match.id;
          const hasTeams = match.home_team && match.away_team;
          const canSave = !locked && hasTeams && !match.is_finished;
          const hasPred = !!pred;
          const saveError = saveErrors[match.id];

          return (
            <div key={match.id} style={{ background: "#0d1225", border: `1px solid ${hasPred && !match.is_finished ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, overflow: "hidden", opacity: locked ? 0.65 : 1 }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.65rem", padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {formatStage(match.stage)}
                  </span>
                  {match.group_letter && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Grupo {match.group_letter}</span>}
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.15)" }}>#{match.match_number}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {hasPred && !match.is_finished && !locked && <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✓ Guardado</span>}
                  {locked && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>🔒 Cerrado</span>}
                  {match.is_finished && <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✓ Final</span>}
                </div>
              </div>

              {/* Teams & score */}
              <div style={{ padding: "16px 14px" }}>
                {hasTeams ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div onClick={() => setNewsTeam({ code: match.home_team!.code, name: getTeamName(match.home_team!.code, match.home_team!.name) })} title="Ver noticias" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <Image src={getFlagUrl(match.home_team!.code, "w80")} alt={getTeamName(match.home_team!.code, match.home_team!.name)} width={26} height={17} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.87rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "underline dotted rgba(255,255,255,0.2)" }}>
                        {getTeamName(match.home_team!.code, match.home_team!.name)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {match.is_finished ? (
                        <>
                          <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37" }}>{match.home_goals}</div>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: "0.9rem" }}>—</span>
                          <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37" }}>{match.away_goals}</div>
                        </>
                      ) : (
                        <>
                          <input type="number" min="0" max="20" disabled={locked} value={local.home}
                            onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, home: e.target.value } }))}
                            style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${local.home !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", textAlign: "center", outline: "none", opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text" }} placeholder="—" />
                          <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 700, fontSize: "0.9rem" }}>—</span>
                          <input type="number" min="0" max="20" disabled={locked} value={local.away}
                            onChange={(e) => setLocalPredictions(prev => ({ ...prev, [match.id]: { ...local, away: e.target.value } }))}
                            style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${local.away !== "" ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`, background: "rgba(255,255,255,0.05)", color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", textAlign: "center", outline: "none", opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "text" }} placeholder="—" />
                        </>
                      )}
                    </div>
                    <div onClick={() => setNewsTeam({ code: match.away_team!.code, name: getTeamName(match.away_team!.code, match.away_team!.name) })} title="Ver noticias" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end", cursor: "pointer" }}>
                      <span style={{ fontSize: "0.87rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", textDecoration: "underline dotted rgba(255,255,255,0.2)" }}>
                        {getTeamName(match.away_team!.code, match.away_team!.name)}
                      </span>
                      <Image src={getFlagUrl(match.away_team!.code, "w80")} alt={getTeamName(match.away_team!.code, match.away_team!.name)} width={26} height={17} style={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "8px 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.2)" }}>Equipos por determinar</div>
                )}
              </div>

              {/* Card footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 6 }}>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {match.venue && `${match.venue} · `}{formatMatchDate(match.match_date)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {pred && pred.points_earned !== null && (
                    <span style={{ background: "linear-gradient(135deg, #D4AF37, #b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "3px 10px", borderRadius: 20, fontSize: "0.8rem" }}>{pred.points_earned} pts</span>
                  )}
                  {canSave && (
                    <button onClick={() => savePrediction(match.id)} disabled={saving || !local.home || !local.away}
                      style={{ background: "linear-gradient(135deg, #D4AF37, #b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.78rem", opacity: (saving || !local.home || !local.away) ? 0.4 : 1, transition: "opacity 0.15s" }}>
                      {saving ? "..." : hasPred ? "Actualizar" : "Guardar"}
                    </button>
                  )}
                  {locked && hasTeams && (
                    <button onClick={() => setViewPredictions({ id: match.id, homeTeam: getTeamName(match.home_team!.code, match.home_team!.name), awayTeam: getTeamName(match.away_team!.code, match.away_team!.name), homeCode: match.home_team!.code, awayCode: match.away_team!.code, isFinished: match.is_finished })}
                      style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: "0.75rem", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
                      👥 Pronósticos
                    </button>
                  )}
                </div>
                {/* Inline save error */}
                {saveError && (
                  <div style={{ width: "100%", fontSize: "0.72rem", color: "#ef4444", marginTop: 2 }}>
                    ⚠ {saveError}
                  </div>
                )}
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
