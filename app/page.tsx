import Link from "next/link";

const steps = [
  { n: "01", icon: "📝", title: "Regístrate",           desc: "Crea tu cuenta con email y elige tu nombre de jugador." },
  { n: "02", icon: "🏆", title: "Predice el Torneo",    desc: "Elige Campeón, Subcampeón y 3er Clasificado antes de que empiece." },
  { n: "03", icon: "⚽", title: "Predice Partidos",     desc: "Introduce el marcador exacto de cada encuentro antes del pitido." },
  { n: "04", icon: "📊", title: "Escala la Tabla",      desc: "Acumula puntos con cada acierto y compite por el primer puesto." },
];

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#070b1e" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 58,
        background: "rgba(7,11,30,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(16px, 4vw, 48px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 14, color: "#D4AF37", letterSpacing: "-0.01em" }}>
            Comunio Mundial 2026
          </span>
        </div>
        <Link href="/login" style={{
          background: "linear-gradient(135deg, #D4AF37, #b8941e)",
          color: "#070b1e", fontWeight: 800,
          padding: "8px 22px", borderRadius: 10,
          fontSize: 13, textDecoration: "none",
          fontFamily: "var(--font-heading)", letterSpacing: "0.01em",
        }}>
          Entrar
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "calc(100vh - 58px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px clamp(16px, 4vw, 48px)",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(109,40,217,0.1) 0%, transparent 50%)",
        textAlign: "center",
      }}>
        <div style={{ width: "100%", maxWidth: 640 }}>

          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 100, padding: "6px 16px", marginBottom: 32,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 8px rgba(34,197,94,0.8)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Predicciones abiertas · FIFA World Cup 2026
            </span>
          </div>

          {/* Main title */}
          <h1 style={{
            fontFamily: "var(--font-heading)", fontWeight: 900,
            lineHeight: 0.88, letterSpacing: "-0.04em",
            marginBottom: 28,
            fontSize: "clamp(4rem, 12vw, 8rem)",
          }}>
            <span style={{
              background: "linear-gradient(160deg, #f4dc8a 0%, #D4AF37 45%, #ecc64e 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              display: "block",
            }}>MUNDIAL</span>
            <span style={{ color: "white", display: "block" }}>2026</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 40,
            fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
          }}>
            Predice los resultados de los{" "}
            <strong style={{ color: "#D4AF37", fontWeight: 700 }}>104 partidos</strong>,
            compite con tus amigos y demuestra que eres el mejor pronosticador del Mundial.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <Link href="/login" style={{
              background: "linear-gradient(135deg, #D4AF37, #b8941e)",
              color: "#070b1e", fontWeight: 800,
              padding: "15px 36px", borderRadius: 12,
              fontSize: 15, textDecoration: "none",
              fontFamily: "var(--font-heading)", letterSpacing: "0.01em",
            }}>
              🎯 Empezar gratis
            </Link>
            <a href="#como-funciona" style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)", fontWeight: 700,
              padding: "15px 36px", borderRadius: 12,
              fontSize: 15, textDecoration: "none",
              fontFamily: "var(--font-heading)",
            }}>
              ¿Cómo funciona?
            </a>
          </div>

          {/* Stats strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {[
              { value: "48",      label: "Selecciones", icon: "🏴" },
              { value: "104",     label: "Partidos",    icon: "⚽" },
              { value: "5 pts",   label: "Máx/partido", icon: "🎯" },
              { value: "65 pts",  label: "Torneo",      icon: "🏆" },
            ].map((s, i) => (
              <div key={s.label} style={{
                padding: "18px 12px", textAlign: "center",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div style={{ fontSize: "1.1rem", marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.35rem", color: "#D4AF37", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{
        padding: "80px clamp(16px, 4vw, 48px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.015)",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.7rem", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              GUÍA RÁPIDA
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "clamp(1.7rem, 4vw, 2.4rem)", letterSpacing: "-0.02em", color: "white" }}>
              ¿Cómo funciona?
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {steps.map((s) => (
              <div key={s.n} style={{
                background: "#0d1225",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 18, padding: "28px 24px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -8, right: 14,
                  fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "4.5rem",
                  color: "rgba(212,175,55,0.07)", lineHeight: 1,
                  userSelect: "none", pointerEvents: "none",
                }}>{s.n}</div>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "rgba(212,175,55,0.1)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem", marginBottom: 16,
                  }}>{s.icon}</div>
                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", marginBottom: 8, color: "white" }}>{s.title}</h3>
                  <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING ── */}
      <section style={{
        padding: "80px clamp(16px, 4vw, 48px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.7rem", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              PUNTUACIÓN
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "clamp(1.7rem, 4vw, 2.4rem)", letterSpacing: "-0.02em", color: "white" }}>
              Cuánto puedes ganar
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {/* Match points */}
            <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", background: "rgba(168,85,247,0.08)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.4rem" }}>⚽</span>
                  <div>
                    <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "white" }}>Por Partido</p>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Máximo 5 puntos por encuentro</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 24px 20px" }}>
                {[
                  { pts: "+3", label: "Acertar resultado (1 / X / 2)",  color: "#D4AF37" },
                  { pts: "+1", label: "Goles exactos equipo local",      color: "#22c55e" },
                  { pts: "+1", label: "Goles exactos equipo visitante",  color: "#22c55e" },
                  { pts: "= 5", label: "Pleno: marcador exacto",         color: "#D4AF37", bold: true },
                ].map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "13px 0",
                    borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", color: r.color, minWidth: 32 }}>{r.pts}</span>
                    <span style={{ fontSize: "0.83rem", color: r.bold ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)", fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tournament points */}
            <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", background: "rgba(212,175,55,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.4rem" }}>🏆</span>
                  <div>
                    <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "white" }}>Predicción del Torneo</p>
                    <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Se bloquea al inicio del torneo</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 24px 20px" }}>
                {[
                  { pts: "+30", label: "Campeón del Mundial",  emoji: "🥇" },
                  { pts: "+20", label: "Subcampeón",           emoji: "🥈" },
                  { pts: "+15", label: "Tercer Clasificado",   emoji: "🥉" },
                ].map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "13px 0",
                    borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.2rem", color: "#D4AF37", minWidth: 32 }}>{r.pts}</span>
                    <span style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.5)", flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: "1.1rem" }}>{r.emoji}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10 }}>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                    🔒 La predicción del torneo se cierra automáticamente 15 minutos antes del primer partido.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/login" style={{
              background: "linear-gradient(135deg, #D4AF37, #b8941e)",
              color: "#070b1e", fontWeight: 800,
              padding: "16px 52px", borderRadius: 14,
              fontSize: 16, textDecoration: "none",
              fontFamily: "var(--font-heading)", letterSpacing: "0.01em",
              display: "inline-block",
            }}>
              🎯 Empezar ahora — es gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px clamp(16px, 4vw, 48px)",
        textAlign: "center",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.2)",
        marginTop: "auto",
      }}>
        Comunio Mundial 2026 · Hecho con ❤️ para jugar con amigos
      </footer>
    </div>
  );
}
