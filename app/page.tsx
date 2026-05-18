import Link from "next/link";

function Section({ children, id, className = "" }: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`w-full flex justify-center px-6 py-20 ${className}`}
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="w-full" style={{ maxWidth: "1100px" }}>
        {children}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      <nav
        className="w-full flex items-center justify-between px-6 py-4 sticky top-0 z-50"
        style={{ background: "rgba(4,7,20,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
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

      {/* Hero */}
      <div
        className="w-full flex justify-center px-6 py-24 sm:py-32 relative"
        style={{ flex: "1 0 auto" }}
      >
        {/* Glow decorations — clipped so they don't cause overflow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full blur-3xl"
            style={{
              width: "500px", height: "500px",
              top: "20%", left: "20%",
              background: "rgba(212,175,55,0.06)",
              transform: "translate(-50%, -50%)",
            }}
          />
          <div
            className="absolute rounded-full blur-3xl"
            style={{
              width: "500px", height: "500px",
              top: "30%", right: "20%",
              background: "rgba(109,40,217,0.06)",
              transform: "translate(50%, -50%)",
            }}
          />
        </div>

        <div className="relative text-center w-full" style={{ maxWidth: "700px" }}>
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs text-white/50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            Abierto para predicciones
          </div>

          {/* Title */}
          <h1
            className="font-[var(--font-heading)] font-black leading-[0.9] tracking-tight mb-6"
            style={{ fontSize: "clamp(4rem, 12vw, 9rem)" }}
          >
            <span className="text-gold-gradient block">MUNDIAL</span>
            <span className="text-white block">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-white/50 mx-auto mb-10 leading-relaxed" style={{ maxWidth: "480px" }}>
            Compite con tus amigos prediciendo los resultados de cada partido.{" "}
            <span className="text-gold-300">104 partidos</span>,{" "}
            <span style={{ color: "var(--color-purple-soft)" }}>48 selecciones</span>,{" "}
            un solo campeón.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link href="/login" className="btn-primary text-base !py-3 !px-8 w-full sm:w-auto">
              🎯 Empezar a Predecir
            </Link>
            <a href="#como-funciona" className="btn-secondary text-base !py-3 !px-8 w-full sm:w-auto">
              ¿Cómo funciona?
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mx-auto" style={{ maxWidth: "380px" }}>
            {[
              { value: "48", label: "Selecciones" },
              { value: "104", label: "Partidos" },
              { value: "5 pts", label: "Máx / partido" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4 text-center">
                <div className="font-[var(--font-heading)] text-2xl font-black text-gold-gradient leading-none">
                  {stat.value}
                </div>
                <div className="text-[10px] text-white/35 mt-1.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <Section id="como-funciona">
        <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold text-center mb-2">
          ¿Cómo <span className="text-gold-gradient">funciona</span>?
        </h2>
        <p className="text-center text-white/35 text-sm mb-10">Cuatro pasos para empezar a competir</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", icon: "📝", title: "Regístrate", desc: "Crea tu cuenta con email y elige tu nombre de jugador." },
            { step: "02", icon: "🏆", title: "Predicción del Torneo", desc: "Elige tu Campeón, Subcampeón y 3er Clasificado antes del inicio." },
            { step: "03", icon: "⚽", title: "Predice los Partidos", desc: "Introduce el marcador exacto que crees para cada encuentro." },
            { step: "04", icon: "📊", title: "Sube en la Tabla", desc: "Gana puntos y compite por la primera posición del ranking." },
          ].map((item) => (
            <div
              key={item.step}
              className="glass rounded-2xl p-5 group transition-all duration-300 hover:glow-gold"
            >
              <div className="text-xs font-mono mb-3" style={{ color: "rgba(212,175,55,0.45)" }}>{item.step}</div>
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-[var(--font-heading)] font-bold text-sm mb-2 group-hover:text-gold-300 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-white/35 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Scoring */}
      <Section>
        <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold text-center mb-2">
          Sistema de <span className="text-gold-gradient">Puntos</span>
        </h2>
        <p className="text-center text-white/35 text-sm mb-10">Cuánto puedes ganar por cada predicción</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Per match */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <span>⚽</span>
              <h3 className="font-[var(--font-heading)] font-bold text-sm" style={{ color: "var(--color-purple-soft)" }}>
                Por partido — máximo 5 puntos
              </h3>
            </div>
            {[
              { pts: "+3", desc: "Acertar el signo (1-X-2)", color: "text-gold-300" },
              { pts: "+1", desc: "Goles del equipo local exactos", color: "text-success" },
              { pts: "+1", desc: "Goles del equipo visitante exactos", color: "text-success" },
              { pts: "= 5", desc: "Pleno: resultado exacto completo", color: "text-gold-400" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-2.5"
                style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <span className={`font-[var(--font-heading)] font-black text-xl w-10 shrink-0 ${row.color}`}>
                  {row.pts}
                </span>
                <span className="text-sm text-white/60">{row.desc}</span>
              </div>
            ))}
          </div>

          {/* Tournament */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <span>🏆</span>
              <h3 className="font-[var(--font-heading)] font-bold text-sm" style={{ color: "var(--color-purple-soft)" }}>
                Predicción del Torneo
              </h3>
            </div>
            {[
              { pts: "+30", desc: "Campeón del Mundial correcto", emoji: "🥇" },
              { pts: "+20", desc: "Subcampeón correcto", emoji: "🥈" },
              { pts: "+15", desc: "Tercer Clasificado correcto", emoji: "🥉" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-2.5"
                style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <span className="font-[var(--font-heading)] font-black text-xl text-gold-300 w-10 shrink-0">
                  {row.pts}
                </span>
                <span className="text-sm text-white/60 flex-1">{row.desc}</span>
                <span className="text-base shrink-0">{row.emoji}</span>
              </div>
            ))}
            <p className="mt-4 pt-4 text-xs text-white/25" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              Las predicciones del torneo se bloquean al inicio del Mundial.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/login" className="btn-primary text-base !py-3 !px-10">
            🎯 Empezar ahora — es gratis
          </Link>
        </div>
      </Section>

      {/* Footer */}
      <footer
        className="w-full text-center text-xs text-white/20 py-6 px-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos
      </footer>
    </div>
  );
}
