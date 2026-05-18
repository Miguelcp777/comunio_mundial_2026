"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export default function LeaderboardPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold">
          🏆 <span className="text-gold-gradient">Clasificación</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">{profiles.length} jugadores</p>
      </div>

      {/* Top 3 podium (if enough players) */}
      {profiles.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* 2nd place */}
          <div className="glass p-4 text-center mt-8">
            <span className="text-3xl mb-2 block">🥈</span>
            <div className="font-semibold text-sm truncate">{profiles[1].display_name}</div>
            <div className="points-badge mt-2 inline-block">{profiles[1].total_points}</div>
          </div>
          {/* 1st place */}
          <div className="glass-strong glow-gold p-4 text-center">
            <span className="text-4xl mb-2 block">🥇</span>
            <div className="font-bold text-gold-300 truncate">{profiles[0].display_name}</div>
            <div className="points-badge mt-2 inline-block">{profiles[0].total_points}</div>
          </div>
          {/* 3rd place */}
          <div className="glass p-4 text-center mt-8">
            <span className="text-3xl mb-2 block">🥉</span>
            <div className="font-semibold text-sm truncate">{profiles[2].display_name}</div>
            <div className="points-badge mt-2 inline-block">{profiles[2].total_points}</div>
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="glass-strong overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-xs text-white/40 font-medium w-12">#</th>
              <th className="text-left py-3 px-4 text-xs text-white/40 font-medium">Jugador</th>
              <th className="text-right py-3 px-4 text-xs text-white/40 font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile, index) => (
              <tr
                key={profile.id}
                className={`border-b border-white/5 transition-colors hover:bg-white/3
                  ${profile.id === currentUserId ? "bg-gold-400/5" : ""}`}
              >
                <td className="py-3 px-4 text-lg">{getMedal(index)}</td>
                <td className="py-3 px-4">
                  <span className={`font-medium ${profile.id === currentUserId ? "text-gold-300" : ""}`}>
                    {profile.display_name}
                    {profile.id === currentUserId && (
                      <span className="text-xs text-white/30 ml-2">(tú)</span>
                    )}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="points-badge">{profile.total_points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {profiles.length === 0 && (
          <div className="p-12 text-center text-white/30">
            Aún no hay jugadores registrados.
          </div>
        )}
      </div>
    </div>
  );
}
