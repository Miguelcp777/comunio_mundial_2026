"use client";
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatMatchDate, formatStage, getTeamName } from "@/lib/utils";
import type { Team, Match, Profile } from "@/lib/types/database";
import Image from "next/image";

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null };

const ALL_STAGES = [
  { key: "group",        label: "Grupos" },
  { key: "round_of_32",  label: "16avos" },
  { key: "round_of_16",  label: "Octavos" },
  { key: "quarter_final",label: "Cuartos" },
  { key: "semi_final",   label: "Semis" },
  { key: "third_place",  label: "3er Puesto" },
  { key: "final",        label: "Final" },
];
const GROUPS = "ABCDEFGHIJKL".split("");

/* ── helpers ── */
function Btn({ children, onClick, disabled, variant = "gold", small = false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "gold" | "danger" | "ghost"; small?: boolean;
}) {
  const bg = variant === "gold" ? "linear-gradient(135deg,#D4AF37,#b8941e)"
    : variant === "danger" ? "rgba(239,68,68,0.15)"
    : "rgba(255,255,255,0.06)";
  const color = variant === "gold" ? "#070b1e" : variant === "danger" ? "#ef4444" : "rgba(255,255,255,0.7)";
  const border = variant === "danger" ? "1px solid rgba(239,68,68,0.25)" : variant === "ghost" ? "1px solid rgba(255,255,255,0.1)" : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: bg, color, border,
      fontFamily: "var(--font-heading)", fontWeight: 800,
      padding: small ? "5px 12px" : "8px 18px",
      borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      fontSize: small ? "0.75rem" : "0.82rem",
      opacity: disabled ? 0.4 : 1, transition: "opacity 0.15s",
    }}>
      {children}
    </button>
  );
}

/* UTC ISO → "YYYY-MM-DDTHH:MM" in the browser's local time, for <input type="datetime-local"> */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.68rem", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
      {children}
    </p>
  );
}

/* ── main page ── */
export default function AdminPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"usuarios" | "partidos" | "sync">("partidos");
  const [activeStage, setActiveStage] = useState("group");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) { setLoading(false); return; }
    setIsAdmin(true);

    const [matchesRes, teamsRes, usersRes] = await Promise.all([
      supabase.from("matches")
        .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
        .order("match_number"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("profiles").select("*").order("total_points", { ascending: false }),
    ]);

    if (matchesRes.data) setMatches(matchesRes.data as MatchWithTeams[]);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleMatches = matches.filter(m => {
    if (m.stage !== activeStage) return false;
    if (activeStage === "group" && activeGroup && m.group_letter !== activeGroup) return false;
    return true;
  });

  if (loading) return (
    <div style={{ padding: "24px 16px", maxWidth: 900, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 40, width: 280, borderRadius: 8, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
    </div>
  );

  if (!isAdmin) return (
    <div style={{ padding: "80px 16px", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: 16 }}>🚫</div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", color: "#ef4444", marginBottom: 8 }}>Acceso denegado</h1>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>No tienes permisos de administrador.</p>
    </div>
  );

  return (
    <div style={{ padding: "24px 16px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white", display: "flex", alignItems: "center", gap: 10 }}>
          <span>⚙️</span>
          <span style={{ background: "linear-gradient(135deg,#ecc64e,#D4AF37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Panel de Administración
          </span>
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          {users.length} usuarios · {matches.length} partidos
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          { key: "partidos", label: "⚽ Partidos" },
          { key: "usuarios", label: "👥 Usuarios" },
          { key: "sync",     label: "🔄 Sincronización API" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.82rem",
            background: tab === t.key ? "rgba(212,175,55,0.15)" : "transparent",
            color: tab === t.key ? "#D4AF37" : "rgba(255,255,255,0.4)",
            outline: tab === t.key ? "1px solid rgba(212,175,55,0.25)" : "none",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PARTIDOS TAB ── */}
      {tab === "partidos" && (
        <div>
          {/* Stage selector */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
            {ALL_STAGES.map(s => {
              const count = matches.filter(m => m.stage === s.key).length;
              const finished = matches.filter(m => m.stage === s.key && m.is_finished).length;
              const active = activeStage === s.key;
              return (
                <button key={s.key} onClick={() => { setActiveStage(s.key); setActiveGroup(null); }} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.78rem",
                  background: active ? "rgba(168,85,247,0.15)" : "transparent",
                  color: active ? "#a855f7" : "rgba(255,255,255,0.4)",
                  outline: active ? "1px solid rgba(168,85,247,0.25)" : "none",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {s.label}
                  {count > 0 && (
                    <span style={{
                      fontSize: "0.65rem", padding: "1px 5px", borderRadius: 20,
                      background: finished === count ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      color: finished === count ? "#22c55e" : "rgba(255,255,255,0.4)",
                    }}>
                      {finished}/{count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group filter (only for group stage) */}
          {activeStage === "group" && (
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setActiveGroup(null)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--font-heading)",
                background: activeGroup === null ? "rgba(212,175,55,0.15)" : "transparent",
                color: activeGroup === null ? "#D4AF37" : "rgba(255,255,255,0.35)",
                outline: activeGroup === null ? "1px solid rgba(212,175,55,0.25)" : "none",
              }}>
                Todos
              </button>
              {GROUPS.map(g => {
                const gCount = matches.filter(m => m.stage === "group" && m.group_letter === g).length;
                if (gCount === 0) return null;
                const gDone = matches.filter(m => m.stage === "group" && m.group_letter === g && m.is_finished).length;
                const active = activeGroup === g;
                return (
                  <button key={g} onClick={() => setActiveGroup(g)} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--font-heading)",
                    background: active ? "rgba(212,175,55,0.15)" : "transparent",
                    color: active ? "#D4AF37" : "rgba(255,255,255,0.35)",
                    outline: active ? "1px solid rgba(212,175,55,0.25)" : "none",
                  }}>
                    Grupo {g}
                    {gDone === gCount && gCount > 0 && <span style={{ marginLeft: 4, color: "#22c55e" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} teams={teams} onUpdate={loadData} />
            ))}
            {visibleMatches.length === 0 && (
              <div style={{ padding: "48px", textAlign: "center", color: "rgba(255,255,255,0.2)", background: "#0d1225", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                No hay partidos en esta fase.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── USUARIOS TAB ── */}
      {tab === "usuarios" && (
        <UsersPanel users={users} onUpdate={loadData} />
      )}

      {/* ── SYNC TAB ── */}
      {tab === "sync" && <SyncPanel />}
    </div>
  );
}

/* ── MatchCard ── */
function MatchCard({ match, teams, onUpdate }: { match: MatchWithTeams; teams: Team[]; onUpdate: () => void }) {
  const supabase = createClient();
  const [homeId, setHomeId] = useState(match.home_team_id?.toString() ?? "");
  const [awayId, setAwayId] = useState(match.away_team_id?.toString() ?? "");
  const [homeGoals, setHomeGoals] = useState(match.home_goals?.toString() ?? "");
  const [awayGoals, setAwayGoals] = useState(match.away_goals?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [editResult, setEditResult] = useState(false);
  const [editTeams, setEditTeams] = useState(false);
  const [editDate, setEditDate] = useState(false);
  const [dateValue, setDateValue] = useState(toDatetimeLocal(match.match_date));
  const [savingDate, setSavingDate] = useState(false);

  const hasTeams = !!(match.home_team_id && match.away_team_id);
  const isFinished = match.is_finished;
  const showAssign = !hasTeams || editTeams;

  const assignTeams = async () => {
    if (!homeId || !awayId || homeId === awayId) return;
    setSaving(true);
    const { error } = await supabase.from("matches").update({
      home_team_id: parseInt(homeId),
      away_team_id: parseInt(awayId),
    }).eq("id", match.id);
    if (error) alert(error.message);
    else { setEditTeams(false); onUpdate(); }
    setSaving(false);
  };

  const saveDate = async () => {
    if (!dateValue) return;
    setSavingDate(true);
    // datetime-local is naive local time → store the corresponding UTC instant
    const iso = new Date(dateValue).toISOString();
    const { error } = await supabase.from("matches").update({ match_date: iso }).eq("id", match.id);
    if (error) alert(error.message);
    else { setEditDate(false); onUpdate(); }
    setSavingDate(false);
  };

  const saveResult = async () => {
    const h = parseInt(homeGoals), a = parseInt(awayGoals);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    const res = await fetch("/api/admin/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, homeGoals: h, awayGoals: a }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else { setEditResult(false); onUpdate(); }
    setSaving(false);
  };

  return (
    <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
      {/* Match header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <span style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.65rem", padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {formatStage(match.stage)}
        </span>
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>#{match.match_number}</span>
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{formatMatchDate(match.match_date)}</span>
        {match.group_letter && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>Grupo {match.group_letter}</span>}
        {match.venue && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{match.venue}</span>}
        {isFinished && <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>✓ Finalizado</span>}
      </div>

      <div style={{ padding: "16px" }}>
        {/* Teams display / assignment */}
        {!showAssign ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (isFinished && !editResult) ? 0 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              {match.home_team && (
                <Image src={getFlagUrl(match.home_team.code, "w80")} alt={getTeamName(match.home_team.code, match.home_team.name)}
                  width={24} height={16} style={{ borderRadius: 3, flexShrink: 0 }} />
              )}
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {match.home_team ? getTeamName(match.home_team.code, match.home_team.name) : "Por determinar"}
              </span>
            </div>

            {isFinished && !editResult ? (
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37", flexShrink: 0 }}>
                {match.home_goals} — {match.away_goals}
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <input type="number" min="0" max="20" value={homeGoals} onChange={e => setHomeGoals(e.target.value)}
                  style={{ width: 44, height: 40, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", textAlign: "center", outline: "none" }} />
                <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                <input type="number" min="0" max="20" value={awayGoals} onChange={e => setAwayGoals(e.target.value)}
                  style={{ width: 44, height: 40, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "white", fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", textAlign: "center", outline: "none" }} />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                {match.away_team ? getTeamName(match.away_team.code, match.away_team.name) : "Por determinar"}
              </span>
              {match.away_team && (
                <Image src={getFlagUrl(match.away_team.code, "w80")} alt={getTeamName(match.away_team.code, match.away_team.name)}
                  width={24} height={16} style={{ borderRadius: 3, flexShrink: 0 }} />
              )}
            </div>
          </div>
        ) : (
          /* Team assignment */
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>{editTeams ? "Reasignar equipos" : "Asignar equipos"}</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={homeId} onChange={e => setHomeId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, background: "#1a2035", border: "1px solid rgba(255,255,255,0.18)", color: "white", fontSize: "0.82rem", outline: "none", colorScheme: "dark" }}>
                <option value="" style={{ background: "#1a2035", color: "rgba(255,255,255,0.5)" }}>Equipo local...</option>
                {teams.map(t => <option key={t.id} value={t.id} style={{ background: "#1a2035", color: "white" }}>{getTeamName(t.code, t.name)}</option>)}
              </select>
              <select value={awayId} onChange={e => setAwayId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, background: "#1a2035", border: "1px solid rgba(255,255,255,0.18)", color: "white", fontSize: "0.82rem", outline: "none", colorScheme: "dark" }}>
                <option value="" style={{ background: "#1a2035", color: "rgba(255,255,255,0.5)" }}>Equipo visitante...</option>
                {teams.map(t => <option key={t.id} value={t.id} style={{ background: "#1a2035", color: "white" }}>{getTeamName(t.code, t.name)}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Manual date/time override (fallback if the API sync misses or shifts a fixture) */}
        {editDate && (
          <div style={{ margin: "4px 0 12px" }}>
            <SectionLabel>Editar fecha y hora (tu hora local)</SectionLabel>
            <input type="datetime-local" value={dateValue} onChange={e => setDateValue(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 10, background: "#1a2035", border: "1px solid rgba(255,255,255,0.18)", color: "white", fontSize: "0.82rem", outline: "none", colorScheme: "dark", width: "100%", maxWidth: 260 }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {showAssign && (
            <Btn onClick={assignTeams} disabled={saving || !homeId || !awayId || homeId === awayId} small>
              {saving ? "..." : editTeams ? "Guardar equipos" : "Asignar equipos"}
            </Btn>
          )}
          {showAssign && editTeams && (
            <Btn variant="ghost" onClick={() => { setEditTeams(false); setHomeId(match.home_team_id?.toString() ?? ""); setAwayId(match.away_team_id?.toString() ?? ""); }} small>Cancelar</Btn>
          )}
          {hasTeams && !editTeams && (
            <Btn variant="ghost" onClick={() => setEditTeams(true)} small>Reasignar equipos</Btn>
          )}
          {hasTeams && !isFinished && !editTeams && (
            <Btn onClick={saveResult} disabled={saving || homeGoals === "" || awayGoals === ""} small>
              {saving ? "..." : "Guardar resultado"}
            </Btn>
          )}
          {hasTeams && isFinished && !editResult && !editTeams && (
            <Btn variant="ghost" onClick={() => setEditResult(true)} small>Editar resultado</Btn>
          )}
          {editResult && (
            <>
              <Btn onClick={saveResult} disabled={saving || homeGoals === "" || awayGoals === ""} small>
                {saving ? "..." : "Guardar"}
              </Btn>
              <Btn variant="ghost" onClick={() => setEditResult(false)} small>Cancelar</Btn>
            </>
          )}
          {editDate ? (
            <>
              <Btn onClick={saveDate} disabled={savingDate || !dateValue} small>{savingDate ? "..." : "Guardar fecha"}</Btn>
              <Btn variant="ghost" onClick={() => { setEditDate(false); setDateValue(toDatetimeLocal(match.match_date)); }} small>Cancelar</Btn>
            </>
          ) : (
            <Btn variant="ghost" onClick={() => setEditDate(true)} small>📅 Fecha</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── UsersPanel ── */
function UsersPanel({ users, onUpdate }: { users: Profile[]; onUpdate: () => void }) {
  return (
    <div>
      <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "1fr 120px 100px 80px", gap: 12 }}>
          {["Jugador", "Alias", "Puntos", ""].map(h => (
            <span key={h} style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {users.map(user => <UserRow key={user.id} user={user} onUpdate={onUpdate} />)}
        {users.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.875rem" }}>
            No hay usuarios.
          </div>
        )}
      </div>
      <p style={{ marginTop: 10, fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>
        * Borrar usuario requiere <code style={{ color: "rgba(168,85,247,0.8)" }}>SUPABASE_SERVICE_ROLE_KEY</code> en .env.local
      </p>
    </div>
  );
}

/* ── SyncPanel ── */
function SyncPanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncingBracket, setSyncingBracket] = useState(false);
  const [bracketResult, setBracketResult] = useState<any>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sync-status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ error: "Error al conectar con la API" });
    }
    setLoading(false);
  };

  const forceSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/force-sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      await loadStatus();
    } catch {
      setSyncResult({ error: "Error al sincronizar" });
    }
    setSyncing(false);
  };

  const syncBracket = async () => {
    setSyncingBracket(true);
    setBracketResult(null);
    try {
      const res = await fetch("/api/admin/sync-bracket", { method: "POST" });
      const data = await res.json();
      setBracketResult(data);
      await loadStatus();
    } catch {
      setBracketResult({ error: "Error al sincronizar cruces" });
    }
    setSyncingBracket(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const card = (bg: string, border: string) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "14px 18px",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.95rem", color: "white" }}>
            Estado de sincronización con TheSportsDB
          </p>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            Cron automático cada 5 min · Liga FIFA World Cup ID: 4429
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={loadStatus} disabled={loading} small>
            {loading ? "Cargando..." : "↻ Actualizar"}
          </Btn>
          <Btn variant="ghost" onClick={syncBracket} disabled={syncingBracket} small>
            {syncingBracket ? "Asignando..." : "🔗 Sincronizar cruces"}
          </Btn>
          <Btn onClick={forceSync} disabled={syncing} small>
            {syncing ? "Sincronizando..." : "⚡ Sync resultados"}
          </Btn>
        </div>
      </div>

      {/* Bracket sync feedback */}
      {bracketResult && (
        <div style={{
          ...card(
            bracketResult.error ? "rgba(239,68,68,0.08)" : bracketResult.assigned_count > 0 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
            bracketResult.error ? "rgba(239,68,68,0.25)" : bracketResult.assigned_count > 0 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"
          ),
        }}>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.88rem", color: bracketResult.error ? "#ef4444" : bracketResult.assigned_count > 0 ? "#22c55e" : "rgba(255,255,255,0.6)" }}>
            {bracketResult.error ?? bracketResult.message}
          </p>
          {bracketResult.assigned?.length > 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Cruces asignados: {bracketResult.assigned.map((a: any) => `#${a.match_number} ${a.home}-${a.away}`).join(", ")}
            </p>
          )}
          {bracketResult.unmatched_count > 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Sin emparejar (resolver a mano): {bracketResult.unmatched_count} partido(s)
            </p>
          )}
        </div>
      )}

      {/* Sync result feedback */}
      {syncResult && (
        <div style={{
          ...card(
            syncResult.error ? "rgba(239,68,68,0.08)" : syncResult.updated > 0 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
            syncResult.error ? "rgba(239,68,68,0.25)" : syncResult.updated > 0 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"
          ),
        }}>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.88rem", color: syncResult.error ? "#ef4444" : syncResult.updated > 0 ? "#22c55e" : "rgba(255,255,255,0.6)" }}>
            {syncResult.error ?? syncResult.message}
          </p>
          {syncResult.match_ids?.length > 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Partidos actualizados: #{syncResult.match_ids.join(", #")}
            </p>
          )}
          {syncResult.recalculated > 0 && (
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              Predicciones recalculadas: {syncResult.recalculated}
            </p>
          )}
        </div>
      )}

      {status && !status.error && (
        <>
          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[
              { label: "Partidos pendientes",   value: status.pending_count,              color: status.pending_count > 0 ? "#eab308" : "#22c55e" },
              { label: "Eventos API (hoy/ayer)", value: status.sportsdb_events_today,      color: "#a855f7" },
              { label: "Completados recientes",  value: status.recent_finished?.length,    color: "#D4AF37" },
              { label: "Equipos sin mapear",     value: status.unmapped_api_teams?.length, color: status.unmapped_api_teams?.length > 0 ? "#ef4444" : "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.5rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Unmapped teams warning */}
          {status.unmapped_api_teams?.length > 0 && (
            <div style={card("rgba(239,68,68,0.07)", "rgba(239,68,68,0.2)")}>
              <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "#ef4444", marginBottom: 8 }}>
                ⚠️ Nombres de equipo desconocidos en TheSportsDB
              </p>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                Estos nombres no tienen mapeo y no se sincronizarán:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {status.unmapped_api_teams.map((n: string) => (
                  <span key={n} style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: "0.78rem", color: "#ef4444", fontFamily: "var(--font-heading)", fontWeight: 700 }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pending matches mapping check */}
          {status.mapping_check?.length > 0 && (
            <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "white" }}>
                  Partidos pendientes — estado API
                </p>
              </div>
              {status.mapping_check.map((m: any) => {
                const ok = m.home.mapped && m.away.mapped;
                const found = m.found_in_api;
                return (
                  <div key={m.match_id} style={{
                    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
                    padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                  }}>
                    <span style={{ fontSize: "1rem" }}>
                      {found ? (m.api_status === "Match Finished" || m.api_status === "FT" ? "✅" : "🟡") : ok ? "🔵" : "❌"}
                    </span>
                    <div>
                      <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "white" }}>
                        {m.home.name ?? "?"} vs {m.away.name ?? "?"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        #{m.match_number} · {m.match_date?.slice(0, 10)}
                        {found && m.api_status && ` · API: ${m.api_status}`}
                        {found && m.api_score && ` · ${m.api_score}`}
                        {!found && ok && " · No encontrado en API hoy/ayer"}
                        {!ok && ` · Sin mapeo: ${!m.home.mapped ? m.home.name : ""}${!m.home.mapped && !m.away.mapped ? ", " : ""}${!m.away.mapped ? m.away.name : ""}`}
                      </div>
                    </div>
                    <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-heading)", fontWeight: 700, color: found && (m.api_status === "Match Finished" || m.api_status === "FT") ? "#22c55e" : found ? "#eab308" : ok ? "#a855f7" : "#ef4444" }}>
                      {found && (m.api_status === "Match Finished" || m.api_status === "FT") ? "LISTO" : found ? "EN CURSO" : ok ? "MAPEADO" : "SIN MAPEO"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recently finished */}
          {status.recent_finished?.length > 0 && (
            <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "white" }}>
                  Últimos partidos sincronizados ✅
                </p>
              </div>
              {status.recent_finished.map((m: any) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.7)" }}>
                    {m.home_team ? getTeamName(m.home_team.code, m.home_team.name) : "?"} vs {m.away_team ? getTeamName(m.away_team.code, m.away_team.name) : "?"}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "#D4AF37", flexShrink: 0 }}>
                    {m.home_goals} — {m.away_goals}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            Última consulta: {new Date(status.timestamp).toLocaleString("es-ES")} · Free tier: max 3 resultados/día vía API
          </p>
        </>
      )}

      {status?.error && (
        <div style={card("rgba(239,68,68,0.08)", "rgba(239,68,68,0.2)")}>
          <p style={{ fontSize: "0.85rem", color: "#ef4444" }}>{status.error}</p>
        </div>
      )}

      {loading && !status && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onUpdate }: { user: Profile; onUpdate: () => void }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.display_name);
  const [points, setPoints] = useState(user.total_points.toString());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveUser = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name.trim(),
      total_points: parseInt(points) || 0,
    }).eq("id", user.id);
    if (error) alert(error.message);
    else { setEditing(false); onUpdate(); }
    setSaving(false);
  };

  const deleteUser = async () => {
    setDeleting(true);
    const res = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else onUpdate();
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 120px 100px 80px", gap: 12,
      padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
      alignItems: "center",
    }}>
      {/* Avatar + info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)",
        }}>
          {user.display_name.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.id.slice(0, 8)}…
          </div>
          {user.is_admin && <span style={{ fontSize: "0.65rem", color: "#D4AF37", fontWeight: 700 }}>ADMIN</span>}
        </div>
      </div>

      {/* Display name */}
      {editing ? (
        <input value={name} onChange={e => setName(e.target.value)}
          style={{ padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "0.82rem", outline: "none", width: "100%" }} />
      ) : (
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.display_name}
        </span>
      )}

      {/* Points */}
      {editing ? (
        <input type="number" value={points} onChange={e => setPoints(e.target.value)}
          style={{ padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#D4AF37", fontSize: "0.82rem", outline: "none", width: "100%", fontFamily: "var(--font-heading)", fontWeight: 800 }} />
      ) : (
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "#D4AF37" }}>
          {user.total_points}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        {editing ? (
          <>
            <Btn onClick={saveUser} disabled={saving} small>{saving ? "..." : "✓"}</Btn>
            <Btn variant="ghost" onClick={() => { setEditing(false); setName(user.display_name); setPoints(user.total_points.toString()); }} small>✕</Btn>
          </>
        ) : confirmDelete ? (
          <>
            <Btn variant="danger" onClick={deleteUser} disabled={deleting} small>{deleting ? "..." : "Confirmar"}</Btn>
            <Btn variant="ghost" onClick={() => setConfirmDelete(false)} small>No</Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setEditing(true)} small>✏️</Btn>
            <Btn variant="danger" onClick={() => setConfirmDelete(true)} small>🗑</Btn>
          </>
        )}
      </div>
    </div>
  );
}
