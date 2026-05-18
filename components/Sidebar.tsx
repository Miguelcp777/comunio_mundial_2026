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
    { href: "/leaderboard", label: "Clasificación", icon: "🏆" },
    { href: "/profile", label: "Mi Perfil", icon: "👤" },
  ];

  if (profile?.is_admin) {
    navLinks.push({ href: "/admin", label: "Admin", icon: "⚙️" });
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 z-40"
      style={{
        background: "rgba(4, 7, 20, 0.92)",
        backdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-105"
            style={{ background: "rgba(212,175,55,0.12)" }}
          >
            🏆
          </div>
          <div>
            <div className="font-[var(--font-heading)] text-sm font-black text-gold-gradient leading-tight">
              Mundial 2026
            </div>
            <div className="text-[10px] text-white/30 leading-tight mt-0.5">
              Porra de Predicciones
            </div>
          </div>
        </Link>
      </div>

      <div className="mx-4 mb-4 border-t border-white/6" />

      {/* Navigation links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "text-gold-300"
                    : "text-white/45 hover:text-white/80 hover:bg-white/5"
                }`}
              style={isActive ? { background: "rgba(212,175,55,0.10)" } : {}}
            >
              <span className="text-base w-5 text-center shrink-0 leading-none">
                {link.icon}
              </span>
              <span className="flex-1">{link.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 mb-4 border-t border-white/6" />

      {/* User section */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="skeleton h-12 rounded-xl" />
        ) : profile ? (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              👤
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/75 truncate leading-tight">
                {profile.display_name}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: "var(--color-gold-400)" }}>
                {profile.total_points} pts
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-white/25 hover:text-white/60 transition-colors shrink-0 px-1 py-1"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
