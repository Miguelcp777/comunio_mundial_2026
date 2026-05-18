import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav
        className="w-full flex items-center justify-between px-8 py-4 sticky top-0 z-50 shrink-0"
        style={{
          background: "rgba(4,7,20,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏆</span>
          <span className="font-[var(--font-heading)] text-base font-black text-gold-gradient">
            Mundial 2026
          </span>
        </div>
        <Link href="/login" className="btn-primary text-sm !py-2 !px-5">
          Entrar
        </Link>
      </nav>

      {/* ── Hero — full viewport height ─────────────────────────── */}
      <section
        className="relative w-full flex flex-col items-center justify-center text-center px-8 shrink-0"
        style={{ minHeight: "calc(100vh - 56px)", paddingTop: "4rem", paddingBottom: "4rem" }}
      >
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute rounded-full blur-3xl"
            style={{ width: 600, height: 600, top: "30%", left: "25%", transform: "translate(-50%,-50%)", background: "rgba(212,175,55,0.07)" }} />
          <div className="absolute rounded-full blur-3xl"
            style={{ width: 600, height: 600, top: "30%", right: "25%", transform: "translate(50%,-50%)", background: "rgba(109,40,217,0.07)" }} />
        </div>

        <div className="relative w-full" style={{ maxWidth: 860 }}>
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs text-white/50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            Abierto para predicciones
          </div>

          {/* Title — clamp capped at 6rem so MUNDIAL always fits */}
          <h1
            className="font-[var(--font-heading)] font-black leading-[0.88] tracking-tight mb-8"
            style={{ fontSize: "clamp(2.8rem, 8vw, 6rem)" }}
          >
            <span className="text-gold-gradient block">MUNDIAL</span>
            <span className="text-white block">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-white/50 mb-10 leading-relaxed mx-auto" style={{ maxWidth: 520 }}>
            Compite con tus amigos prediciendo los resultados de cada partido.{" "}
            <span className="text-gold-300">104 partidos</span>,{" "}
            <span style={{ color: "var(--color-purple-soft)" }}>48 selecciones</span>,{" "}
            un solo campeón.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/login" className="btn-primary text-base !py-3.5 !px-10 w-full sm:w-auto">
              🎯 Empezar a Predecir
            </Link>
            <a href="#como-funciona" className="btn-secondary text-base !py-3.5 !px-10 w-full sm:w-auto">
              ¿Cómo funciona?
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mx-auto" style={{ maxWidth: 440 }}>
            {[
              { value: "48", label: "Selecciones" },
              { value: "104", label: "Partidos" },
              { value: "5 pts", label: "Máx / partido" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl py-5 px-3 text-center">
                <div className="font-[var(--font-heading)] text-2xl font-black text-gold-gradient leading-none mb-1.5">
                  {s.value}
                </div>
                <div className="text-[10px] text-white/35 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="w-full flex justify-center px-8"
        style={{ paddingTop: "4.5rem", paddingBottom: "4.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-full" style={{ maxWidth: 1100 }}>
          <div className="text-center mb-8">
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold mb-3">
              ¿Cómo <span className="text-gold-gradient">funciona</span>?
            </h2>
            <p className="text-white/35 text-sm">Cuatro pasos para empezar a competir</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { step: "01", icon: "📝", title: "Regístrate", desc: "Crea tu cuenta con email y elige tu nombre de jugador." },
              { step: "02", icon: "🏆", title: "Predicción del Torneo", desc: "Elige tu Campeón, Subcampeón y 3er Clasificado antes del inicio." },
              { step: "03", icon: "⚽", title: "Predice los Partidos", desc: "Introduce el marcador exacto que crees para cada encuentro." },
              { step: "04", icon: "📊", title: "Sube en la Tabla", desc: "Gana puntos y compite por la primera posición del ranking." },
            ].map((item) => (
              <div
                key={item.step}
                className="glass rounded-2xl p-7 group transition-all duration-300 hover:glow-gold"
              >
                <div className="text-xs font-mono mb-4" style={{ color: "rgba(212,175,55,0.45)" }}>{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-[var(--font-heading)] font-bold text-base mb-2.5 group-hover:text-gold-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-white/35 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scoring ─────────────────────────────────────────────── */}
      <section
        className="w-full flex justify-center px-8"
        style={{ paddingTop: "4.5rem", paddingBottom: "4.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-full" style={{ maxWidth: 1100 }}>
          <div className="text-center mb-8">
            <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold mb-3">
              Sistema de <span className="text-gold-gradient">Puntos</span>
            </h2>
            <p className="text-white/35 text-sm">Cuánto puedes ganar por cada predicción</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass-strong rounded-2xl p-8">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="text-xl">⚽</span>
                <h3 className="font-[var(--font-heading)] font-bold" style={{ color: "var(--color-purple-soft)" }}>
                  Por partido — máximo 5 puntos
                </h3>
              </div>
              {[
                { pts: "+3", desc: "Acertar el signo (1-X-2)", color: "text-gold-300" },
                { pts: "+1", desc: "Goles del equipo local exactos", color: "text-success" },
                { pts: "+1", desc: "Goles del equipo visitante exactos", color: "text-success" },
                { pts: "= 5", desc: "Pleno: resultado exacto completo", color: "text-gold-400" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-5 py-3.5"
                  style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span className={`font-[var(--font-heading)] font-black text-2xl w-12 shrink-0 ${row.color}`}>{row.pts}</span>
                  <span className="text-white/65">{row.desc}</span>
                </div>
              ))}
            </div>

            <div className="glass-strong rounded-2xl p-8">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="text-xl">🏆</span>
                <h3 className="font-[var(--font-heading)] font-bold" style={{ color: "var(--color-purple-soft)" }}>
                  Predicción del Torneo
                </h3>
              </div>
              {[
                { pts: "+30", desc: "Campeón del Mundial correcto", emoji: "🥇" },
                { pts: "+20", desc: "Subcampeón correcto", emoji: "🥈" },
                { pts: "+15", desc: "Tercer Clasificado correcto", emoji: "🥉" },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-5 py-3.5"
                  style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span className="font-[var(--font-heading)] font-black text-2xl text-gold-300 w-12 shrink-0">{row.pts}</span>
                  <span className="text-white/65 flex-1">{row.desc}</span>
                  <span className="text-xl shrink-0">{row.emoji}</span>
                </div>
              ))}
              <p className="mt-5 pt-4 text-xs text-white/25" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                Las predicciones del torneo se bloquean al inicio del Mundial.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/login" className="btn-primary text-base !py-4 !px-12">
              🎯 Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer
        className="w-full text-center text-xs text-white/20 py-8 px-8 mt-auto"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos
      </footer>
    </div>
  );
}
