"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types/database";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }
    getProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard", label: "Partidos", icon: "⚽" },
    { href: "/torneo", label: "Predicción Torneo", icon: "🏆" },
    { href: "/leaderboard", label: "Clasificación", icon: "📊" },
    { href: "/profile", label: "Mi Perfil", icon: "👤" },
  ];

  if (profile?.is_admin) {
    navLinks.push({ href: "/admin", label: "Admin", icon: "⚙️" });
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 z-40"
      style={{ background: "#0a0e22", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Logo */}
      <div style={{ padding: "28px 20px 20px" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "rgba(212,175,55,0.12)",
            border: "1px solid rgba(212,175,55,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem",
          }}>
            ⚽
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.8rem", color: "#D4AF37", lineHeight: 1.2 }}>
              La penya Penua
            </div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              Mundial 2026
            </div>
          </div>
        </Link>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 16px 16px" }} />

      {/* Navigation links */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 12,
              textDecoration: "none",
              fontSize: "0.875rem", fontWeight: 700,
              fontFamily: "var(--font-heading)",
              transition: "all 0.15s",
              background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
              color: isActive ? "#D4AF37" : "rgba(255,255,255,0.45)",
              outline: isActive ? "1px solid rgba(212,175,55,0.2)" : "none",
            }}>
              <span style={{ fontSize: "1rem", width: 20, textAlign: "center", flexShrink: 0 }}>{link.icon}</span>
              <span style={{ flex: 1 }}>{link.label}</span>
              {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", flexShrink: 0 }} />}
            </Link>
          );
        })}
      </nav>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 16px 0" }} />

      {/* User section */}
      <div style={{ padding: "16px 16px 24px" }}>
        {loading ? (
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
        ) : profile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.9rem", color: "#D4AF37",
            }}>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.display_name}
              </div>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#D4AF37", marginTop: 1 }}>
                {profile.total_points} pts
              </div>
            </div>
            <button onClick={handleSignOut}
              style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}>
              Salir
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
