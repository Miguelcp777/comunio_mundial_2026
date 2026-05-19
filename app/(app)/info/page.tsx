export default function InfoPage() {
  return (
    <div style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em", color: "white" }}>
          Cómo funciona
        </h1>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          Todo lo que necesitas saber para jugar a la porra del Mundial 2026
        </p>
      </div>

      {/* Section: Predicciones de partido */}
      <Section title="⚽ Predicciones de partido">
        <p style={textStyle}>
          Para cada partido del torneo puedes introducir el marcador exacto que crees que va a terminar el partido
          (en el tiempo reglamentario, sin contar prórroga ni penaltis).
        </p>
        <p style={{ ...textStyle, marginTop: 10 }}>
          El sistema calcula tus puntos automáticamente cuando el partido termina:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "16px 0" }}>
          {[
            { pts: "+3", label: "Resultado correcto", desc: "Aciertas si gana local, visitante, o empate" },
            { pts: "+1", label: "Goles local exactos", desc: "El marcador del equipo de casa es exacto" },
            { pts: "+1", label: "Goles visitante exactos", desc: "El marcador del equipo visitante es exacto" },
          ].map(item => (
            <div key={item.pts} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "14px 12px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", color: "#D4AF37" }}>{item.pts}</div>
              <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", margin: "6px 0 4px" }}>{item.label}</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <InfoBox color="gold">
          <strong>Máximo 5 puntos por partido.</strong> Si aciertas el marcador exacto (ej. 2–1) consigues los 5 puntos de golpe.
        </InfoBox>

        <p style={{ ...textStyle, marginTop: 14 }}>
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>Ejemplo:</strong> predices 2–1 y el partido acaba 2–0.
          Aciertas el signo (gana el local) → <Pts>+3</Pts>. Aciertas los goles del local (2) → <Pts>+1</Pts>.
          No aciertas los del visitante → 0. Total: <Pts>4 pts</Pts>.
        </p>
      </Section>

      {/* Section: Predicción del torneo */}
      <Section title="🏆 Predicción del torneo">
        <p style={textStyle}>
          Antes de que empiece el Mundial elige quién crees que va a ser el Campeón, el Subcampeón y el Tercer Clasificado.
          Los puntos se suman al final del torneo.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "16px 0" }}>
          {[
            { emoji: "🥇", pos: "Campeón",           pts: "+30" },
            { emoji: "🥈", pos: "Subcampeón",         pts: "+20" },
            { emoji: "🥉", pos: "Tercer Clasificado", pts: "+15" },
          ].map(item => (
            <div key={item.pos} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "14px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", color: "#D4AF37" }}>{item.pts}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{item.pos}</div>
            </div>
          ))}
        </div>

        <InfoBox color="purple">
          Los tres equipos deben ser diferentes. Puedes modificar tu predicción hasta el cierre.
        </InfoBox>
      </Section>

      {/* Section: Fechas límite */}
      <Section title="⏰ Fechas límite y cierre">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <DeadlineRow
            icon="⚽"
            title="Predicciones de partido"
            desc="Cada predicción se cierra automáticamente 15 minutos antes del pitido inicial del partido. Una vez cerrada no se puede modificar."
            color="gold"
          />
          <DeadlineRow
            icon="🏆"
            title="Predicción del torneo"
            desc="Se cierra 15 minutos antes del primer partido del Mundial. Mientras esté abierta puedes cambiarla tantas veces como quieras."
            color="purple"
          />
        </div>

        <InfoBox color="red" style={{ marginTop: 16 }}>
          Si no introduces una predicción antes del cierre, ese partido no puntúa para ti. No hay predicción por defecto.
        </InfoBox>
      </Section>

      {/* Section: Clasificación */}
      <Section title="📊 Clasificación general">
        <p style={textStyle}>
          La clasificación suma todos tus puntos de partido más los puntos de la predicción del torneo.
          Se actualiza en tiempo real cada vez que se registra un resultado.
        </p>
        <p style={{ ...textStyle, marginTop: 10 }}>
          En caso de empate en puntos, el orden en la tabla puede variar según el número de predicciones acertadas.
        </p>
      </Section>

      {/* Section: Consejos */}
      <Section title="💡 Consejos rápidos" last>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Introduce tus predicciones con antelación — los partidos se pueden adelantar o sufrir cambios de horario.",
            "La predicción del torneo vale hasta 65 puntos extra: no te olvides de rellenarla.",
            "Acertar el marcador exacto (5 pts) en varios partidos puede ser decisivo en la clasificación.",
            "Puedes modificar cualquier predicción tantas veces como quieras hasta el cierre.",
          ].map((tip, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: 8,
                background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "0.7rem", color: "#D4AF37",
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, paddingTop: 2 }}>{tip}</span>
            </li>
          ))}
        </ul>
      </Section>

    </div>
  );
}

/* ─── Small helpers ─── */

const textStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "rgba(255,255,255,0.55)",
  lineHeight: 1.6,
};

function Pts({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e",
      fontFamily: "var(--font-heading)", fontWeight: 800,
      padding: "1px 7px", borderRadius: 6, fontSize: "0.8rem",
    }}>
      {children}
    </span>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 28 }}>
      <h2 style={{
        fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem",
        color: "white", marginBottom: 14,
        paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoBox({ children, color, style }: { children: React.ReactNode; color: "gold" | "purple" | "red"; style?: React.CSSProperties }) {
  const colors = {
    gold:   { bg: "rgba(212,175,55,0.07)",  border: "rgba(212,175,55,0.2)",  text: "rgba(212,175,55,0.9)"  },
    purple: { bg: "rgba(168,85,247,0.07)",  border: "rgba(168,85,247,0.2)",  text: "rgba(168,85,247,0.9)"  },
    red:    { bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.2)",   text: "rgba(239,68,68,0.85)"  },
  }[color];
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: colors.bg, border: `1px solid ${colors.border}`,
      fontSize: "0.82rem", color: colors.text, lineHeight: 1.5,
      ...style,
    }}>
      {children}
    </div>
  );
}

function DeadlineRow({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: "gold" | "purple" }) {
  const accent = color === "gold" ? "#D4AF37" : "#a855f7";
  const bg     = color === "gold" ? "rgba(212,175,55,0.06)" : "rgba(168,85,247,0.06)";
  const border = color === "gold" ? "rgba(212,175,55,0.15)" : "rgba(168,85,247,0.15)";
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 14, background: bg, border: `1px solid ${border}` }}>
      <span style={{ fontSize: "1.4rem", flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.88rem", color: accent, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}
