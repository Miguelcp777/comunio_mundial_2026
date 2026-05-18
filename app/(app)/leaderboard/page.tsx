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
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const top3 = profiles.slice(0, 3);

  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [
    { profile: top3[1], rank: 1, medal: "🥈", height: "h-24", offset: "mt-8", color: "rgba(148,163,184,0.08)" },
    { profile: top3[0], rank: 0, medal: "🥇", height: "h-32", offset: "mt-0", color: "rgba(212,175,55,0.1)" },
    { profile: top3[2], rank: 2, medal: "🥉", height: "h-20", offset: "mt-12", color: "rgba(180,120,60,0.08)" },
  ];

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold">
            <span className="text-gold-gradient">Clasificación</span>
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {profiles.length} {profiles.length === 1 ? "jugador" : "jugadores"}
          </p>
        </div>
      </div>

      {/* Podium — top 3 */}
      {profiles.length >= 3 && (
        <div className="mb-8">
          <div className="flex items-end justify-center gap-3">
            {podiumOrder.map(({ profile, rank, medal, offset, color }) => {
              if (!profile) return null;
              const isCurrentUser = profile.id === currentUserId;
              const isFirst = rank === 0;
              return (
                <div
                  key={profile.id}
                  className={`flex-1 max-w-[160px] ${offset} rounded-2xl p-4 text-center transition-all duration-300`}
                  style={{
                    background: color,
                    border: isFirst
                      ? "1px solid rgba(212,175,55,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                    boxShadow: isFirst ? "0 0 30px rgba(212,175,55,0.08)" : "none",
                  }}
                >
                  <span className={`block mb-2 ${isFirst ? "text-4xl" : "text-3xl"}`}>{medal}</span>
                  <div
                    className={`font-semibold truncate mb-2 ${
                      isCurrentUser ? "text-gold-300" : isFirst ? "text-white" : "text-white/70"
                    } ${isFirst ? "text-sm" : "text-xs"}`}
                  >
                    {profile.display_name}
                    {isCurrentUser && (
                      <span className="block text-[10px] text-white/30 font-normal">tú</span>
                    )}
                  </div>
                  <span className="points-badge">{profile.total_points}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full ranking table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[3rem_1fr_auto] px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="text-xs text-white/30 font-medium">#</div>
          <div className="text-xs text-white/30 font-medium">Jugador</div>
          <div className="text-xs text-white/30 font-medium text-right">Puntos</div>
        </div>

        {/* Rows */}
        <div>
          {profiles.map((profile, index) => {
            const isCurrentUser = profile.id === currentUserId;
            const medal = getMedal(index);
            const isTop3 = index < 3;
            return (
              <div
                key={profile.id}
                className={`grid grid-cols-[3rem_1fr_auto] px-4 py-3.5 transition-colors duration-150 hover:bg-white/3
                  ${isCurrentUser ? "" : ""}`}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: isCurrentUser ? "rgba(212,175,55,0.05)" : "transparent",
                }}
              >
                <div className={`flex items-center ${isTop3 ? "text-lg" : "text-sm text-white/30 font-medium"}`}>
                  {medal}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium truncate block ${
                        isCurrentUser ? "text-gold-300" : "text-white/80"
                      }`}
                    >
                      {profile.display_name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] text-white/30">tú</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <span className="points-badge">{profile.total_points}</span>
                </div>
              </div>
            );
          })}

          {profiles.length === 0 && (
            <div className="p-12 text-center text-white/30">
              Aún no hay jugadores registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
