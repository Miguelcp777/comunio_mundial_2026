"use client";

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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    <nav className="glass-strong sticky top-0 z-50 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href={profile ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <span className="text-2xl">🏆</span>
          <span className="font-[var(--font-heading)] text-xl font-bold text-gold-gradient hidden sm:block group-hover:opacity-80 transition-opacity">
            Mundial 2026
          </span>
        </Link>

        {/* User section */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="skeleton w-24 h-8" />
          ) : profile ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <span className="points-badge">{profile.total_points} pts</span>
                <span className="text-sm text-white/60">{profile.display_name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-white/40 hover:text-white/80 transition-colors"
              >
                Salir
              </button>
              {/* Mobile hamburger */}
              <button
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menú"
              >
                <span
                  className="block w-5 transition-all duration-300"
                  style={{ fontSize: "1.1rem", lineHeight: 1 }}
                >
                  {menuOpen ? "✕" : "☰"}
                </span>
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm !py-2 !px-4">
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu — animated with max-height */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          menuOpen && profile ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {profile && (
          <div className="pt-3 mt-3 border-t border-white/10 flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    pathname.startsWith(link.href)
                      ? "bg-gold-400/15 text-gold-300"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <div className="px-4 py-2 mt-1 text-xs text-white/30">
              {profile.total_points} puntos · {profile.display_name}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
