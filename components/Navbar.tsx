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
          <span
            className="font-[var(--font-heading)] text-xl font-bold text-gold-gradient hidden sm:block
            group-hover:opacity-80 transition-opacity"
          >
            Mundial 2026
          </span>
        </Link>

        {/* Desktop nav */}
        {profile && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                  ${
                    pathname.startsWith(link.href)
                      ? "bg-gold-400/15 text-gold-300 shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}

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
              {/* Mobile menu toggle */}
              <button
                className="md:hidden text-white/60 hover:text-white p-1"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? "✕" : "☰"}
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm !py-2 !px-4">
              Entrar
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && profile && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${
                  pathname.startsWith(link.href)
                    ? "bg-gold-400/15 text-gold-300"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              <span className="mr-2">{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <div className="px-4 py-2 text-sm text-white/40">
            {profile.total_points} puntos · {profile.display_name}
          </div>
        </div>
      )}
    </nav>
  );
}
