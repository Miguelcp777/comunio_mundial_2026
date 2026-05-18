"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const RANK_COLORS = [
  { bg: "rgba(212,175,55,0.12)", border: "rgba(212,175,55,0.25)", text: "#D4AF37", medal: "🥇" },
  { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", medal: "🥈" },
  { bg: "rgba(180,120,60,0.08)", border: "rgba(180,120,60,0.2)", text: "#cd7c3a", medal: "🥉" },
];

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

  if (loading) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const top3 = profiles.slice(0, 3);
  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [
    top3[1] ? { profile: top3[1], rank: 1 } : null,
    top3[0] ? { profile: top3[0], rank: 0 } : null,
    top3[2] ? { profile: top3[2], rank: 2 } : null,
  ];

  return (
    <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>
          Clasificación
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
          {profiles.length} {profiles.length === 1 ? "jugador" : "jugadores"} · Actualizado en tiempo real
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
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: 16,
                padding: "20px 12px",
                textAlign: "center",
                marginTop: isFirst ? 0 : idx === 0 ? 20 : 32,
                boxShadow: isFirst ? "0 0 24px rgba(212,175,55,0.1)" : "none",
              }}>
                <div style={{ fontSize: isFirst ? "2.2rem" : "1.8rem", marginBottom: 10 }}>{c.medal}</div>
                <div style={{
                  fontFamily: "var(--font-heading)", fontWeight: 800,
                  fontSize: isFirst ? "0.9rem" : "0.82rem",
                  color: isMe ? "#D4AF37" : "white",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  marginBottom: 4,
                }}>
                  {profile.display_name}
                </div>
                {isMe && <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>tú</div>}
                <div style={{
                  display: "inline-block",
                  background: isFirst ? "linear-gradient(135deg, #D4AF37, #b8941e)" : "rgba(255,255,255,0.08)",
                  color: isFirst ? "#070b1e" : c.text,
                  fontFamily: "var(--font-heading)", fontWeight: 900,
                  fontSize: "0.85rem", padding: "4px 12px", borderRadius: 20,
                }}>
                  {profile.total_points} pts
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "48px 1fr auto",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>#</span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Jugador</span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pts</span>
        </div>

        {/* Rows */}
        {profiles.map((profile, index) => {
          const isMe = profile.id === currentUserId;
          const isTop3 = index < 3;
          const c = isTop3 ? RANK_COLORS[index] : null;

          return (
            <div key={profile.id} style={{
              display: "grid", gridTemplateColumns: "48px 1fr auto",
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: isMe ? "rgba(212,175,55,0.05)" : "transparent",
              transition: "background 0.1s",
            }}>
              {/* Rank */}
              <div style={{ display: "flex", alignItems: "center" }}>
                {isTop3
                  ? <span style={{ fontSize: "1.2rem" }}>{c!.medal}</span>
                  : <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>{index + 1}</span>
                }
              </div>

              {/* Player */}
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
                  <div style={{
                    fontWeight: 700, fontSize: "0.875rem",
                    color: isMe ? "#D4AF37" : "rgba(255,255,255,0.85)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {profile.display_name}
                    {isMe && <span style={{ marginLeft: 6, fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>tú</span>}
                  </div>
                </div>
              </div>

              {/* Points */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <span style={{
                  background: isTop3 ? "linear-gradient(135deg, #D4AF37, #b8941e)" : "rgba(255,255,255,0.06)",
                  color: isTop3 ? "#070b1e" : "rgba(255,255,255,0.6)",
                  fontFamily: "var(--font-heading)", fontWeight: 900,
                  fontSize: "0.82rem", padding: "4px 12px", borderRadius: 20,
                }}>
                  {profile.total_points}
                </span>
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
  );
}
