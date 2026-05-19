"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, getTeamName } from "@/lib/utils";
import type { Team } from "@/lib/types/database";
import Image from "next/image";

const LOCK_MINUTES_BEFORE = 15;

export default function TorneoPage() {
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [champion, setChampion] = useState<number | null>(null);
  const [runnerUp, setRunnerUp] = useState<number | null>(null);
  const [thirdPlace, setThirdPlace] = useState<number | null>(null);
  const [hasPrediction, setHasPrediction] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [firstMatchDate, setFirstMatchDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [teamsRes, userRes] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.auth.getUser(),
      ]);

      if (teamsRes.data) setTeams(teamsRes.data);

      const user = userRes.data.user;
      if (!user) { setLoading(false); return; }

      const [predRes, firstMatchRes] = await Promise.all([
        supabase.from("tournament_predictions").select("*").eq("user_id", user.id).single(),
        supabase.from("matches").select("match_date").not("match_date", "is", null).order("match_date", { ascending: true }).limit(1),
      ]);

      if (predRes.data) {
        setChampion(predRes.data.champion_team_id);
        setRunnerUp(predRes.data.runner_up_team_id);
        setThirdPlace(predRes.data.third_place_team_id);
        setHasPrediction(true);
        if (predRes.data.is_locked) { setIsLocked(true); }
      }

      if (firstMatchRes.data?.[0]?.match_date) {
        const d = new Date(firstMatchRes.data[0].match_date);
        setFirstMatchDate(d);
        const lockTime = new Date(d.getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);
        if (new Date() >= lockTime) setIsLocked(true);
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!champion || !runnerUp || !thirdPlace) { setError("Debes seleccionar las 3 posiciones."); return; }
    if (new Set([champion, runnerUp, thirdPlace]).size < 3) { setError("Los 3 equipos deben ser diferentes."); return; }
    setSaving(true); setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = { champion_team_id: champion, runner_up_team_id: runnerUp, third_place_team_id: thirdPlace };
    const { error: err } = hasPrediction
      ? await supabase.from("tournament_predictions").update(payload).eq("user_id", user.id)
      : await supabase.from("tournament_predictions").insert({ user_id: user.id, ...payload });

    if (err) { setError(err.message); }
    else { setHasPrediction(true); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const getTeam = (id: number | null) => teams.find(t => t.id === id) ?? null;

  const formatLockDate = (d: Date) =>
    d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) +
    " a las " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {[80, 160, 160, 160].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />)}
      </div>
    );
  }

  const lockDate = firstMatchDate ? new Date(firstMatchDate.getTime() - LOCK_MINUTES_BEFORE * 60 * 1000) : null;

  return (
    <div style={{ padding: "24px 16px", maxWidth: 700, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>
          Predicción del Torneo
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
          Elige el Campeón, Subcampeón y Tercer Clasificado del Mundial
        </p>
      </div>

      {/* Lock banner */}
      {isLocked ? (
        <div style={{
          marginBottom: 20, padding: "14px 18px", borderRadius: 14,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: "1.4rem" }}>🔒</span>
          <div>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", color: "#ef4444" }}>
              Predicción cerrada
            </p>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
              La predicción del torneo ya no se puede modificar. El Mundial ha comenzado.
            </p>
          </div>
        </div>
      ) : lockDate ? (
        <div style={{
          marginBottom: 20, padding: "14px 18px", borderRadius: 14,
          background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: "1.4rem" }}>⏰</span>
          <div>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", color: "#eab308" }}>
              Plazo límite para modificar
            </p>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              Se cerrará el <strong style={{ color: "rgba(255,255,255,0.8)" }}>{formatLockDate(lockDate)}</strong>,
              {" "}15 min antes del primer partido del Mundial.
            </p>
          </div>
        </div>
      ) : null}

      {/* Points info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { emoji: "🥇", pos: "Campeón",    pts: "+30" },
          { emoji: "🥈", pos: "Subcampeón", pts: "+20" },
          { emoji: "🥉", pos: "3er Puesto", pts: "+15" },
        ].map(s => (
          <div key={s.pos} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.1rem", color: "#D4AF37" }}>{s.pts}</div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.pos}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.82rem", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Selectors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Campeón", emoji: "🥇", value: champion, set: setChampion, exclude: [runnerUp, thirdPlace] },
          { label: "Subcampeón", emoji: "🥈", value: runnerUp, set: setRunnerUp, exclude: [champion, thirdPlace] },
          { label: "Tercer Clasificado", emoji: "🥉", value: thirdPlace, set: setThirdPlace, exclude: [champion, runnerUp] },
        ].map(({ label, emoji, value, set, exclude }) => {
          const selected = getTeam(value);
          const available = teams.filter(t => !exclude.includes(t.id) || t.id === value);
          return (
            <div key={label} style={{ background: "#0d1225", border: `1px solid ${selected ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: "1.6rem" }}>{emoji}</span>
                <div>
                  <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.95rem", color: "white" }}>{label}</p>
                  {selected && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Image src={getFlagUrl(selected.code, "w80")} alt={getTeamName(selected.code, selected.name)} width={24} height={16} style={{ borderRadius: 3 }} />
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "#D4AF37" }}>{getTeamName(selected.code, selected.name)}</span>
                    </div>
                  )}
                </div>
              </div>
              <select
                value={value ?? ""}
                onChange={e => { set(Number(e.target.value) || null); }}
                disabled={isLocked}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  background: "#1a2035", border: "1px solid rgba(255,255,255,0.15)",
                  color: "white", fontSize: "0.85rem", outline: "none",
                  colorScheme: "dark",
                  opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                <option value="" style={{ background: "#1a2035", color: "rgba(255,255,255,0.4)" }}>
                  Seleccionar equipo...
                </option>
                {available.map(t => (
                  <option key={t.id} value={t.id} style={{ background: "#1a2035", color: "white" }}>
                    {getTeamName(t.code, t.name)} · Grupo {t.group_letter}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {!isLocked && (
        <button
          onClick={handleSave}
          disabled={saving || !champion || !runnerUp || !thirdPlace}
          style={{
            width: "100%", padding: "14px 24px", borderRadius: 12, border: "none",
            background: saved ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg,#D4AF37,#b8941e)",
            color: saved ? "#22c55e" : "#070b1e",
            fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem",
            cursor: saving || !champion || !runnerUp || !thirdPlace ? "not-allowed" : "pointer",
            opacity: saving || !champion || !runnerUp || !thirdPlace ? 0.5 : 1,
            transition: "all 0.2s",
            outline: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
          }}
        >
          {saved ? "✓ Guardado" : saving ? "Guardando..." : hasPrediction ? "Actualizar predicción" : "Guardar predicción"}
        </button>
      )}
    </div>
  );
}
