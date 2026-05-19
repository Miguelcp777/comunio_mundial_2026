"use client";
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types/database";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { href: "/dashboard",   label: "Partidos",           icon: "⚽" },
    { href: "/torneo",      label: "Predicción Torneo",  icon: "🏆" },
    { href: "/leaderboard", label: "Clasificación",      icon: "📊" },
    { href: "/info",        label: "Cómo funciona",      icon: "ℹ️" },
    { href: "/profile",     label: "Mi Perfil",          icon: "👤" },
  ];

  if (profile?.is_admin) {
    navLinks.push({ href: "/admin", label: "Admin", icon: "⚙️" });
  }

  return (
    <nav
      className="lg:hidden sticky top-0 z-50"
      style={{
        background: "rgba(10,14,34,0.97)",
        backdropFilter: "blur(16px)",
        borderBottom: menuOpen ? "none" : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 58 }}>

        {/* Logo */}
        <Link href={profile ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.82rem", color: "#D4AF37", lineHeight: 1.1 }}>
              La penya Penua
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>
              Mundial 2026
            </div>
          </div>
        </Link>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {loading ? (
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          ) : profile ? (
            <>
              {/* Points badge */}
              <div style={{
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 8, padding: "4px 10px",
                fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.8rem", color: "#D4AF37",
              }}>
                {profile.total_points} pts
              </div>

              {/* Hamburger — avatar initial + lines */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menú"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: 12,
                  background: menuOpen ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${menuOpen ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.1)"}`,
                  cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
                }}
              >
                {menuOpen ? (
                  <span style={{ fontSize: "1rem", color: "#D4AF37", lineHeight: 1 }}>✕</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                    <span style={{ display: "block", width: 18, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.7)" }} />
                    <span style={{ display: "block", width: 14, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.5)" }} />
                    <span style={{ display: "block", width: 18, height: 2, borderRadius: 2, background: "rgba(255,255,255,0.7)" }} />
                  </div>
                )}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm !py-2 !px-4">
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* Dropdown panel */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: menuOpen && profile ? 500 : 0,
          opacity: menuOpen && profile ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.2s ease",
          borderTop: menuOpen ? "1px solid rgba(255,255,255,0.07)" : "none",
          borderBottom: menuOpen ? "1px solid rgba(255,255,255,0.07)" : "none",
        }}
      >
        {profile && (
          <div style={{ padding: "12px 12px 16px" }}>

            {/* User info row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px 14px 12px",
              marginBottom: 4,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1rem", color: "#D4AF37",
              }}>
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.87rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile.display_name}
                </div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  {profile.total_points} puntos acumulados
                </div>
              </div>
            </div>

            {/* Nav links */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 14px", borderRadius: 12, textDecoration: "none",
                      background: isActive ? "rgba(212,175,55,0.1)" : "transparent",
                      border: isActive ? "1px solid rgba(212,175,55,0.18)" : "1px solid transparent",
                      color: isActive ? "#D4AF37" : "rgba(255,255,255,0.55)",
                      fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.9rem",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", width: 22, textAlign: "center", flexShrink: 0 }}>{link.icon}</span>
                    <span style={{ flex: 1 }}>{link.label}</span>
                    {isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />}
                  </Link>
                );
              })}
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 12, border: "none",
                background: "rgba(239,68,68,0.06)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 14,
                color: "rgba(239,68,68,0.7)", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.9rem",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.1rem", width: 22, textAlign: "center" }}>🚪</span>
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
