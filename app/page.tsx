import Link from "next/link";

/* ─── constants ───────────────────────────────────────────── */
const NAV_H = 56; // px — keep in sync with nav height

const steps = [
  { n: "01", icon: "📝", title: "Regístrate",            desc: "Crea tu cuenta con email y elige tu nombre." },
  { n: "02", icon: "🏆", title: "Predice el Torneo",     desc: "Elige Campeón, Subcampeón y 3er Clasificado." },
  { n: "03", icon: "⚽", title: "Predice los Partidos",  desc: "Introduce el marcador exacto de cada encuentro." },
  { n: "04", icon: "📊", title: "Sube en la Tabla",      desc: "Gana puntos y compite por el primer puesto." },
];

const matchRows = [
  { pts: "+3",  label: "Acertar el signo (1 · X · 2)",       color: "#D4AF37" },
  { pts: "+1",  label: "Goles del equipo local exactos",      color: "#22c55e" },
  { pts: "+1",  label: "Goles del equipo visitante exactos",  color: "#22c55e" },
  { pts: "= 5", label: "Pleno: resultado exacto completo",    color: "#D4AF37" },
];

const tournRows = [
  { pts: "+30", label: "Campeón del Mundial",    emoji: "🥇" },
  { pts: "+20", label: "Subcampeón",             emoji: "🥈" },
  { pts: "+15", label: "Tercer Clasificado",     emoji: "🥉" },
];

/* ─── page ────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* NAV */}
      <nav
        className="sticky top-0 z-50 w-full flex items-center justify-between px-6 sm:px-10"
        style={{ height: NAV_H, background: "rgba(4,7,20,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">🏆</span>
          <span className="font-[var(--font-heading)] text-sm font-black text-gold-gradient">Mundial 2026</span>
        </div>
        <Link href="/login" className="btn-primary text-sm !py-1.5 !px-5">Entrar</Link>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center text-center px-6"
        style={{ minHeight: `calc(100vh - ${NAV_H}px)` }}
      >
        {/* soft glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div style={{ position: "absolute", width: 560, height: 560, borderRadius: "50%", top: "40%", left: "30%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(212,175,55,0.09) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", top: "35%", right: "25%", transform: "translate(50%,-50%)", background: "radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>

        <div className="relative w-full" style={{ maxWidth: 680 }}>
          {/* pill badge */}
          <div className="inline-flex items-center gap-2 text-xs text-white/50 px-3 py-1 rounded-full mb-8"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Abierto para predicciones
          </div>

          {/* title */}
          <h1
            className="font-[var(--font-heading)] font-black tracking-tight leading-none mb-6"
            style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
          >
            <span className="text-gold-gradient block">MUNDIAL</span>
            <span className="text-white block">2026</span>
          </h1>

          {/* subtitle */}
          <p className="text-base sm:text-lg text-white/50 leading-relaxed mb-8 mx-auto" style={{ maxWidth: 460 }}>
            Compite con tus amigos prediciendo los resultados de cada partido.{" "}
            <span className="text-gold-300">104 partidos</span>,{" "}
            <span style={{ color: "var(--color-purple-soft)" }}>48 selecciones</span>, un campeón.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link href="/login" className="btn-primary !py-3 !px-9 text-base w-full sm:w-auto">
              🎯 Empezar a Predecir
            </Link>
            <a href="#como-funciona" className="btn-secondary !py-3 !px-9 text-base w-full sm:w-auto">
              ¿Cómo funciona?
            </a>
          </div>

          {/* stats chips */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { v: "48",   l: "selecciones" },
              { v: "104",  l: "partidos" },
              { v: "5 pts",l: "máx / partido" },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="font-[var(--font-heading)] font-black text-gold-300 text-base leading-none">{s.v}</span>
                <span className="text-xs text-white/35">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="w-full py-20 px-6 sm:px-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 1100 }}>
          {/* heading */}
          <div className="text-center mb-10">
            <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold mb-2">
              ¿Cómo <span className="text-gold-gradient">funciona</span>?
            </h2>
            <p className="text-sm text-white/35">Cuatro pasos para empezar a competir</p>
          </div>

          {/* steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map(s => (
              <div key={s.n}
                className="rounded-2xl p-6 group transition-all duration-300 hover:glow-gold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="font-[var(--font-heading)] font-black text-3xl text-gold-gradient leading-none block mb-3">{s.n}</span>
                <span className="text-3xl block mb-3">{s.icon}</span>
                <h3 className="font-[var(--font-heading)] font-bold text-sm mb-2 group-hover:text-gold-300 transition-colors">{s.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING ───────────────────────────────────────────── */}
      <section
        className="w-full py-20 px-6 sm:px-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 900 }}>
          {/* heading */}
          <div className="text-center mb-10">
            <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl font-bold mb-2">
              Sistema de <span className="text-gold-gradient">Puntos</span>
            </h2>
            <p className="text-sm text-white/35">Cuánto puedes ganar por cada predicción</p>
          </div>

          {/* single unified card, two columns */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* left: per match */}
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-widest mb-5"
                  style={{ color: "var(--color-purple-soft)" }}>
                  ⚽ Por partido — máx. 5 pts
                </p>
                {matchRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 py-3"
                    style={{ borderBottom: i < matchRows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="font-[var(--font-heading)] font-black text-xl w-10 shrink-0" style={{ color: r.color }}>{r.pts}</span>
                    <span className="text-sm text-white/60">{r.label}</span>
                  </div>
                ))}
              </div>

              {/* divider (vertical on md+, horizontal on mobile) */}
              <div className="hidden md:block w-px self-stretch" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="block md:hidden h-px mx-6" style={{ background: "rgba(255,255,255,0.06)" }} />

              {/* right: tournament */}
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-widest mb-5"
                  style={{ color: "var(--color-purple-soft)" }}>
                  🏆 Predicción del Torneo
                </p>
                {tournRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-4 py-3"
                    style={{ borderBottom: i < tournRows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span className="font-[var(--font-heading)] font-black text-xl text-gold-300 w-10 shrink-0">{r.pts}</span>
                    <span className="text-sm text-white/60 flex-1">{r.label}</span>
                    <span className="text-base shrink-0">{r.emoji}</span>
                  </div>
                ))}
                <p className="text-xs text-white/25 mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  Se bloquea al inicio del Mundial.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link href="/login" className="btn-primary text-base !py-3.5 !px-12">
              🎯 Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full text-center text-xs text-white/20 py-6 mt-auto"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos
      </footer>
    </div>
  );
}
