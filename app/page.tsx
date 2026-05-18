import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">

      {/* Top nav bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏆</span>
          <span className="font-[var(--font-heading)] text-base font-black text-gold-gradient">
            Mundial 2026
          </span>
        </div>
        <Link href="/login" className="btn-primary text-sm !py-2 !px-5">
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-6 py-20 sm:py-28 text-center">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: "rgba(212,175,55,0.06)" }} />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: "rgba(109,40,217,0.06)" }} />
        </div>

        <div className="relative w-full max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs text-white/50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            Abierto para predicciones
          </div>

          {/* Title */}
          <h1 className="font-[var(--font-heading)] font-black leading-none tracking-tight mb-6"
            style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}>
            <span className="text-gold-gradient block">MUNDIAL</span>
            <span className="text-white block">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-white/50 max-w-md mx-auto mb-10 leading-relaxed">
            Compite con tus amigos prediciendo los resultados de cada partido.{" "}
            <span className="text-gold-300">104 partidos</span>,{" "}
            <span style={{ color: "var(--color-purple-soft)" }}>48 selecciones</span>,{" "}
            un solo campeón.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="btn-primary text-base !py-3 !px-8 w-full sm:w-auto">
              🎯 Empezar a Predecir
            </Link>
            <a href="#como-funciona" className="btn-secondary text-base !py-3 !px-8 w-full sm:w-auto">
              ¿Cómo funciona?
            </a>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {[
              { value: "48", label: "Selecciones" },
              { value: "104", label: "Partidos" },
              { value: "5 pts", label: "Máx / partido" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4 text-center">
                <div className="font-[var(--font-heading)] text-2xl sm:text-3xl font-black text-gold-gradient leading-none">
                  {stat.value}
                </div>
                <div className="text-[10px] text-white/35 mt-1.5 leading-tight">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="w-full px-6 py-20"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold text-center mb-3">
            ¿Cómo <span className="text-gold-gradient">funciona</span>?
          </h2>
          <p className="text-center text-white/35 text-sm mb-10">Cuatro pasos para empezar a competir</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: "01",
                icon: "📝",
                title: "Regístrate",
                desc: "Crea tu cuenta con email y elige tu nombre de jugador.",
              },
              {
                step: "02",
                icon: "🏆",
                title: "Predicción del Torneo",
                desc: "Elige tu Campeón, Subcampeón y 3er Clasificado antes del inicio.",
              },
              {
                step: "03",
                icon: "⚽",
                title: "Predice los Partidos",
                desc: "Introduce el marcador exacto que crees para cada encuentro.",
              },
              {
                step: "04",
                icon: "📊",
                title: "Sube en la Tabla",
                desc: "Gana puntos y compite por la primera posición del ranking.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass rounded-2xl p-5 group transition-all duration-300 hover:glow-gold"
              >
                <div className="text-xs font-mono mb-3" style={{ color: "rgba(212,175,55,0.4)" }}>
                  {item.step}
                </div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-[var(--font-heading)] font-bold text-sm mb-2 group-hover:text-gold-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring system */}
      <section className="w-full px-6 py-20"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold text-center mb-3">
            Sistema de <span className="text-gold-gradient">Puntos</span>
          </h2>
          <p className="text-center text-white/35 text-sm mb-10">Cuánto puedes ganar por cada predicción</p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Per match */}
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">⚽</span>
                <h3 className="font-[var(--font-heading)] font-bold text-sm" style={{ color: "var(--color-purple-soft)" }}>
                  Por partido — máximo 5 puntos
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { pts: "+3", desc: "Acertar el signo (1-X-2)", color: "text-gold-300" },
                  { pts: "+1", desc: "Goles del equipo local exactos", color: "text-success" },
                  { pts: "+1", desc: "Goles del equipo visitante exactos", color: "text-success" },
                  { pts: "= 5", desc: "Pleno: resultado exacto completo", color: "text-gold-400" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 py-2"
                    style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className={`font-[var(--font-heading)] font-black text-lg w-10 shrink-0 ${row.color}`}>
                      {row.pts}
                    </span>
                    <span className="text-sm text-white/60">{row.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tournament */}
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">🏆</span>
                <h3 className="font-[var(--font-heading)] font-bold text-sm" style={{ color: "var(--color-purple-soft)" }}>
                  Predicción del Torneo
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  { pts: "+30", desc: "Campeón del Mundial correcto", emoji: "🥇" },
                  { pts: "+20", desc: "Subcampeón correcto", emoji: "🥈" },
                  { pts: "+15", desc: "Tercer Clasificado correcto", emoji: "🥉" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 py-2"
                    style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="font-[var(--font-heading)] font-black text-lg text-gold-300 w-10 shrink-0">
                      {row.pts}
                    </span>
                    <span className="text-sm text-white/60 flex-1">{row.desc}</span>
                    <span className="text-base shrink-0">{row.emoji}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 text-xs text-white/25 leading-relaxed"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                Las predicciones del torneo se bloquean al inicio del Mundial.
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-10 text-center">
            <Link href="/login" className="btn-primary text-base !py-3 !px-10">
              🎯 Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 py-6 text-center text-xs text-white/20"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos
      </footer>
    </div>
  );
}
