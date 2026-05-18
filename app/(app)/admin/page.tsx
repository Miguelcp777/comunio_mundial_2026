"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, formatMatchDate } from "@/lib/utils";
import type { Team, Match } from "@/lib/types/database";
import Image from "next/image";

type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
};

export default function AdminPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "knockout">("results");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      const [matchesRes, teamsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
          .order("match_number"),
        supabase.from("teams").select("*").order("name"),
      ]);

      if (matchesRes.data) setMatches(matchesRes.data as MatchWithTeams[]);
      if (teamsRes.data) setTeams(teamsRes.data);
      setLoading(false);
    }
    loadData();
  }, []);

  const saveResult = async (matchId: number, homeGoals: number, awayGoals: number) => {
    setSaving(matchId);
    const { error } = await supabase
      .from("matches")
      .update({ home_goals: homeGoals, away_goals: awayGoals, is_finished: true })
      .eq("id", matchId);

    if (error) alert(error.message);
    else {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, home_goals: homeGoals, away_goals: awayGoals, is_finished: true } : m
        )
      );
    }
    setSaving(null);
  };

  const assignTeams = async (matchId: number, homeTeamId: number, awayTeamId: number) => {
    setSaving(matchId);
    const { error } = await supabase
      .from("matches")
      .update({ home_team_id: homeTeamId, away_team_id: awayTeamId })
      .eq("id", matchId);

    if (error) alert(error.message);
    setSaving(null);
    // Reload to get fresh team data
    window.location.reload();
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><div className="skeleton h-48 w-full" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <span className="text-6xl mb-4 block">🚫</span>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold text-danger mb-2">Acceso denegado</h1>
        <p className="text-white/40">No tienes permisos de administrador.</p>
      </div>
    );
  }

  const unfinishedWithTeams = matches.filter((m) => !m.is_finished && m.home_team && m.away_team);
  const knockoutWithoutTeams = matches.filter((m) => m.stage !== "group" && (!m.home_team_id || !m.away_team_id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold mb-6">
        ⚙️ <span className="text-gold-gradient">Panel de Administración</span>
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "results" ? "bg-gold-400/15 text-gold-300" : "text-white/50 hover:text-white"
          }`}
        >
          Resultados ({unfinishedWithTeams.length})
        </button>
        <button
          onClick={() => setActiveTab("knockout")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "knockout" ? "bg-gold-400/15 text-gold-300" : "text-white/50 hover:text-white"
          }`}
        >
          Asignar Equipos ({knockoutWithoutTeams.length})
        </button>
      </div>

      {activeTab === "results" && (
        <div className="space-y-3">
          {unfinishedWithTeams.map((match) => (
            <ResultForm key={match.id} match={match} saving={saving} onSave={saveResult} />
          ))}
          {unfinishedWithTeams.length === 0 && (
            <div className="glass p-8 text-center text-white/30">
              Todos los partidos con equipos asignados ya tienen resultado.
            </div>
          )}
        </div>
      )}

      {activeTab === "knockout" && (
        <div className="space-y-3">
          {knockoutWithoutTeams.map((match) => (
            <KnockoutForm
              key={match.id}
              match={match}
              teams={teams}
              saving={saving}
              onAssign={assignTeams}
            />
          ))}
          {knockoutWithoutTeams.length === 0 && (
            <div className="glass p-8 text-center text-white/30">
              Todos los partidos de eliminatoria tienen equipos asignados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultForm({
  match,
  saving,
  onSave,
}: {
  match: MatchWithTeams;
  saving: number | null;
  onSave: (id: number, h: number, a: number) => void;
}) {
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");

  return (
    <div className="glass p-4 flex flex-col sm:flex-row items-center gap-3">
      <span className="text-xs text-white/30 w-8">#{match.match_number}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className="text-sm font-medium truncate">{match.home_team?.name}</span>
        {match.home_team && (
          <Image src={getFlagUrl(match.home_team.code, "w40")} alt="" width={24} height={16} className="flag-img" />
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number" min="0" max="20"
          value={homeGoals}
          onChange={(e) => setHomeGoals(e.target.value)}
          className="score-input !w-12 !h-10 !text-lg"
        />
        <span className="text-white/30">-</span>
        <input
          type="number" min="0" max="20"
          value={awayGoals}
          onChange={(e) => setAwayGoals(e.target.value)}
          className="score-input !w-12 !h-10 !text-lg"
        />
      </div>
      <div className="flex items-center gap-2 flex-1">
        {match.away_team && (
          <Image src={getFlagUrl(match.away_team.code, "w40")} alt="" width={24} height={16} className="flag-img" />
        )}
        <span className="text-sm font-medium truncate">{match.away_team?.name}</span>
      </div>
      <button
        onClick={() => {
          const h = parseInt(homeGoals);
          const a = parseInt(awayGoals);
          if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0) onSave(match.id, h, a);
        }}
        disabled={saving === match.id || !homeGoals || !awayGoals}
        className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-40 shrink-0"
      >
        {saving === match.id ? "..." : "Guardar"}
      </button>
    </div>
  );
}

function KnockoutForm({
  match,
  teams,
  saving,
  onAssign,
}: {
  match: MatchWithTeams;
  teams: Team[];
  saving: number | null;
  onAssign: (id: number, h: number, a: number) => void;
}) {
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-white/30">#{match.match_number}</span>
        <span className="stage-badge">{match.stage.replace(/_/g, " ")}</span>
        <span className="text-xs text-white/30">{formatMatchDate(match.match_date)}</span>
        <span className="text-xs text-white/30">{match.venue}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={homeTeamId}
          onChange={(e) => setHomeTeamId(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Equipo local...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={awayTeamId}
          onChange={(e) => setAwayTeamId(e.target.value)}
          className="input-field text-sm"
        >
          <option value="">Equipo visitante...</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button
        onClick={() => {
          if (homeTeamId && awayTeamId && homeTeamId !== awayTeamId) {
            onAssign(match.id, parseInt(homeTeamId), parseInt(awayTeamId));
          }
        }}
        disabled={saving === match.id || !homeTeamId || !awayTeamId || homeTeamId === awayTeamId}
        className="btn-primary !py-1.5 !px-4 text-xs mt-3 disabled:opacity-40"
      >
        {saving === match.id ? "..." : "Asignar equipos"}
      </button>
    </div>
  );
}
