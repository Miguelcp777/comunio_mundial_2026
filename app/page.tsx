import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative w-full overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-glow/5 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05),transparent_50%)]" />
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-4 py-20 sm:py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 mb-8 text-sm text-white/60">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Abierto para predicciones
          </div>

          {/* Title */}
          <h1 className="font-[var(--font-heading)] text-5xl sm:text-7xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tight">
            <span className="text-gold-gradient">MUNDIAL</span>
            <br />
            <span className="text-white">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Compite con tus amigos prediciendo los resultados de cada partido.
            <span className="text-gold-300"> 104 partidos</span>,{" "}
            <span className="text-purple-soft">48 selecciones</span>,{" "}
            un solo campeón.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn-primary text-lg !py-3.5 !px-8">
              🎯 Empezar a Predecir
            </Link>
            <a href="#como-funciona" className="btn-secondary text-lg !py-3.5 !px-8">
              ¿Cómo funciona?
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "48", label: "Selecciones" },
              { value: "104", label: "Partidos" },
              { value: "5", label: "Pts máx/partido" },
            ].map((stat) => (
              <div key={stat.label} className="glass p-4">
                <div className="font-[var(--font-heading)] text-3xl font-black text-gold-gradient">
                  {stat.value}
                </div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="como-funciona" className="relative w-full py-20 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold text-center mb-12">
            ¿Cómo <span className="text-gold-gradient">funciona</span>?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: "📝",
                title: "Regístrate",
                desc: "Crea tu cuenta con email y elige tu nombre.",
              },
              {
                step: "02",
                icon: "🏆",
                title: "Predicción del Torneo",
                desc: "Elige tu Campeón, Subcampeón y Tercer Clasificado antes del inicio.",
              },
              {
                step: "03",
                icon: "⚽",
                title: "Predice cada Partido",
                desc: "Introduce el marcador exacto que crees para cada encuentro.",
              },
              {
                step: "04",
                icon: "📊",
                title: "Sube en la Tabla",
                desc: "Gana puntos y compite por la primera posición.",
              },
            ].map((item) => (
              <div key={item.step} className="glass p-6 group hover:glow-gold transition-all duration-500">
                <div className="text-xs font-mono text-gold-400/50 mb-3">{item.step}</div>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-[var(--font-heading)] font-bold text-lg mb-2 group-hover:text-gold-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section className="relative w-full py-20 px-4">
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-bold text-center mb-12">
            Sistema de <span className="text-gold-gradient">Puntos</span>
          </h2>

          <div className="glass-strong p-8 space-y-6">
            <h3 className="font-[var(--font-heading)] font-bold text-lg text-purple-soft mb-4">
              Por partido (máximo 5 puntos)
            </h3>
            {[
              { points: "+3", desc: "Acertar el signo (1-X-2)", color: "text-gold-300" },
              { points: "+1", desc: "Acertar los goles del equipo local", color: "text-success" },
              { points: "+1", desc: "Acertar los goles del equipo visitante", color: "text-success" },
              { points: "=5", desc: "Pleno: resultado exacto", color: "text-gold-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                <span className={`font-[var(--font-heading)] font-black text-xl w-12 ${item.color}`}>
                  {item.points}
                </span>
                <span className="text-white/70">{item.desc}</span>
              </div>
            ))}

            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="font-[var(--font-heading)] font-bold text-lg text-purple-soft mb-4">
                Predicción del Torneo
              </h3>
              {[
                { points: "+30", desc: "Campeón correcto" },
                { points: "+20", desc: "Subcampeón correcto" },
                { points: "+15", desc: "Tercer Clasificado correcto" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                  <span className="font-[var(--font-heading)] font-black text-xl w-12 text-gold-300">
                    {item.points}
                  </span>
                  <span className="text-white/70">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative w-full mt-auto py-8 px-4 border-t border-white/5">
        <div className="w-full max-w-6xl mx-auto text-center text-sm text-white/30">
          <p>Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos</p>
        </div>
      </footer>
    </div>
  );
}
