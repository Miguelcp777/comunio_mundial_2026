"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatMatchDate, formatStage } from "@/lib/utils";
import type { Team, Match, Profile } from "@/lib/types/database";
import Image from "next/image";

type MatchWithTeams = Match & { home_team: Team | null; away_team: Team | null };

const KO_STAGES = ["quarter_final", "semi_final", "third_place", "final"];

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
  const [tab, setTab] = useState<"usuarios" | "partidos">("partidos");
  const [koStage, setKoStage] = useState("quarter_final");

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

  const koMatches = matches.filter(m => KO_STAGES.includes(m.stage) && m.stage === koStage);

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
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["partidos", "usuarios"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.82rem",
            background: tab === t ? "rgba(212,175,55,0.15)" : "transparent",
            color: tab === t ? "#D4AF37" : "rgba(255,255,255,0.4)",
            outline: tab === t ? "1px solid rgba(212,175,55,0.25)" : "none",
          }}>
            {t === "partidos" ? "⚽ Partidos KO" : "👥 Usuarios"}
          </button>
        ))}
      </div>

      {/* ── PARTIDOS TAB ── */}
      {tab === "partidos" && (
        <div>
          {/* Stage selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { key: "quarter_final", label: "Cuartos de Final" },
              { key: "semi_final",    label: "Semifinales" },
              { key: "third_place",   label: "3er Puesto" },
              { key: "final",         label: "Final" },
            ].map(s => (
              <button key={s.key} onClick={() => setKoStage(s.key)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.78rem",
                background: koStage === s.key ? "rgba(168,85,247,0.15)" : "transparent",
                color: koStage === s.key ? "#a855f7" : "rgba(255,255,255,0.4)",
                outline: koStage === s.key ? "1px solid rgba(168,85,247,0.25)" : "none",
              }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {koMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teams}
                onUpdate={loadData}
              />
            ))}
            {koMatches.length === 0 && (
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

  const hasTeams = !!(match.home_team_id && match.away_team_id);
  const isFinished = match.is_finished;

  const assignTeams = async () => {
    if (!homeId || !awayId || homeId === awayId) return;
    setSaving(true);
    const { error } = await supabase.from("matches").update({
      home_team_id: parseInt(homeId),
      away_team_id: parseInt(awayId),
    }).eq("id", match.id);
    if (error) alert(error.message);
    else onUpdate();
    setSaving(false);
  };

  const saveResult = async () => {
    const h = parseInt(homeGoals), a = parseInt(awayGoals);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    const { error } = await supabase.from("matches").update({
      home_goals: h, away_goals: a, is_finished: true,
    }).eq("id", match.id);
    if (error) alert(error.message);
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
        {match.venue && <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.2)" }}>{match.venue}</span>}
        {isFinished && <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>✓ Finalizado</span>}
      </div>

      <div style={{ padding: "16px" }}>
        {/* Teams display / assignment */}
        {hasTeams ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: (isFinished && !editResult) ? 0 : 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              {match.home_team && (
                <Image src={getFlagUrl(match.home_team.code, "w80")} alt={match.home_team.name}
                  width={24} height={16} style={{ borderRadius: 3, flexShrink: 0 }} />
              )}
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {match.home_team?.name ?? "Por determinar"}
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
                {match.away_team?.name ?? "Por determinar"}
              </span>
              {match.away_team && (
                <Image src={getFlagUrl(match.away_team.code, "w80")} alt={match.away_team.name}
                  width={24} height={16} style={{ borderRadius: 3, flexShrink: 0 }} />
              )}
            </div>
          </div>
        ) : (
          /* Team assignment */
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Asignar equipos</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={homeId} onChange={e => setHomeId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "0.82rem", outline: "none" }}>
                <option value="">Equipo local...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={awayId} onChange={e => setAwayId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: "0.82rem", outline: "none" }}>
                <option value="">Equipo visitante...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {!hasTeams && (
            <Btn onClick={assignTeams} disabled={saving || !homeId || !awayId || homeId === awayId} small>
              {saving ? "..." : "Asignar equipos"}
            </Btn>
          )}
          {hasTeams && !isFinished && (
            <Btn onClick={saveResult} disabled={saving || homeGoals === "" || awayGoals === ""} small>
              {saving ? "..." : "Guardar resultado"}
            </Btn>
          )}
          {hasTeams && isFinished && !editResult && (
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
