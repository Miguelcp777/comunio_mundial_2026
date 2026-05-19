"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFlagUrl, getTeamName } from "@/lib/utils";
import type { Team } from "@/lib/types/database";
import Image from "next/image";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [teams, setTeams] = useState<Team[]>([]);
  const [champion, setChampion] = useState<number | null>(null);
  const [runnerUp, setRunnerUp] = useState<number | null>(null);
  const [thirdPlace, setThirdPlace] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPrediction, setHasPrediction] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: teamsData } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (teamsData) setTeams(teamsData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabase
          .from("tournament_predictions")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (existing) {
          setChampion(existing.champion_team_id);
          setRunnerUp(existing.runner_up_team_id);
          setThirdPlace(existing.third_place_team_id);
          setHasPrediction(true);
        }
      }
    }
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!champion || !runnerUp || !thirdPlace) {
      setError("Debes seleccionar las 3 posiciones.");
      return;
    }
    if (champion === runnerUp || champion === thirdPlace || runnerUp === thirdPlace) {
      setError("Los 3 equipos deben ser diferentes.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (hasPrediction) {
      const { error: err } = await supabase
        .from("tournament_predictions")
        .update({
          champion_team_id: champion,
          runner_up_team_id: runnerUp,
          third_place_team_id: thirdPlace,
        })
        .eq("user_id", user.id);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase
        .from("tournament_predictions")
        .insert({
          user_id: user.id,
          champion_team_id: champion,
          runner_up_team_id: runnerUp,
          third_place_team_id: thirdPlace,
        });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard");
  };

  const TeamSelector = ({
    label,
    emoji,
    value,
    onChange,
    exclude,
  }: {
    label: string;
    emoji: string;
    value: number | null;
    onChange: (id: number) => void;
    exclude: (number | null)[];
  }) => {
    const available = teams.filter((t) => !exclude.includes(t.id) || t.id === value);
    const selected = teams.find((t) => t.id === value);

    return (
      <div className="glass p-6 hover:glow-gold transition-all duration-500">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{emoji}</span>
          <h3 className="font-[var(--font-heading)] font-bold text-lg">{label}</h3>
        </div>

        {selected && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gold-400/10 border border-gold-400/20">
            <Image
              src={getFlagUrl(selected.code, "w80")}
              alt={selected.name}
              width={40}
              height={27}
              className="flag-img"
            />
            <span className="font-semibold text-gold-300">{selected.name}</span>
          </div>
        )}

        <select
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input-field"
        >
          <option value="">Seleccionar equipo...</option>
          {available.map((team) => (
            <option key={team.id} value={team.id}>
              {getTeamName(team.code, team.name)} (Grupo {team.group_letter})
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">🏆</span>
          <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold text-gold-gradient mb-3">
            Predicción del Torneo
          </h1>
          <p className="text-white/50 max-w-md mx-auto">
            Elige tu Campeón, Subcampeón y Tercer Clasificado.
            <span className="block text-sm text-warning mt-2">
              ⚠️ Se bloqueará el 11 de junio, 15 min antes del partido inaugural.
            </span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Selectors */}
        <div className="space-y-4 mb-8">
          <TeamSelector
            label="Campeón (+30 pts)"
            emoji="🥇"
            value={champion}
            onChange={setChampion}
            exclude={[runnerUp, thirdPlace]}
          />
          <TeamSelector
            label="Subcampeón (+20 pts)"
            emoji="🥈"
            value={runnerUp}
            onChange={setRunnerUp}
            exclude={[champion, thirdPlace]}
          />
          <TeamSelector
            label="Tercer Clasificado (+15 pts)"
            emoji="🥉"
            value={thirdPlace}
            onChange={setThirdPlace}
            exclude={[champion, runnerUp]}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !champion || !runnerUp || !thirdPlace}
            className="btn-primary flex-1 text-center !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : hasPrediction ? "Actualizar Predicción" : "Guardar Predicción"}
          </button>
          {hasPrediction && (
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-secondary !py-3.5"
            >
              Ir al Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
