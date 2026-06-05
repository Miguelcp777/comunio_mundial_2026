"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null); // email address after signup

  // Client-side password confirm state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = !isSignUp || !confirmPassword || password === confirmPassword;
  const confirmError = isSignUp && confirmPassword && password !== confirmPassword
    ? "Las contraseñas no coinciden." : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSignUp && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = isSignUp ? await signup(formData) : await login(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result && "emailSent" in result && result.emailSent) {
        setEmailSent(result.email as string);
      }
    } catch {
      // Redirect happened (login success)
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    if (err) { setError(err.message); }
    else { setResetSent(true); }
    setLoading(false);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setIsResetMode(false);
    setResetSent(false);
    setError(null);
    setEmailSent(null);
    setPassword("");
    setConfirmPassword("");
  };

  /* ── Email sent screen ── */
  if (emailSent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
          <div style={{
            background: "#0d1225",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 20, padding: "40px 32px",
            boxShadow: "0 0 40px rgba(34,197,94,0.06)",
          }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 20 }}>📬</div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", color: "white", marginBottom: 12 }}>
              Revisa tu correo
            </h1>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 8 }}>
              Hemos enviado un enlace de confirmación a:
            </p>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1rem", color: "#D4AF37", marginBottom: 24 }}>
              {emailSent}
            </p>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, marginBottom: 28 }}>
              Haz clic en el enlace del email para activar tu cuenta. Una vez confirmado, podrás iniciar sesión.
            </p>
            <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, marginBottom: 24 }}>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                💡 Si no ves el email, revisa tu carpeta de spam. El enlace caduca en 24 horas.
              </p>
            </div>
            <button
              onClick={switchMode}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-heading)", fontWeight: 700,
                padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem",
              }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Reset password screen ── */
  if (isResetMode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ background: "#0d1225", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "32px 28px", boxShadow: "0 0 40px rgba(212,175,55,0.05)" }}>
            {resetSent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>📬</div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.3rem", color: "white", marginBottom: 10 }}>Revisa tu correo</h1>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 24 }}>
                  Hemos enviado un enlace de recuperación a <strong style={{ color: "#D4AF37" }}>{resetEmail}</strong>. Haz clic en él para establecer una nueva contraseña.
                </p>
                <button onClick={() => { setIsResetMode(false); setResetSent(false); setResetEmail(""); }}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-heading)", fontWeight: 700, padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem" }}>
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>🔑</span>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.3rem", color: "white" }}>Recuperar contraseña</h1>
                  <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Introduce tu email y te enviaremos un enlace de recuperación</p>
                </div>
                {error && <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.82rem", color: "#ef4444" }}>{error}</div>}
                <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Field label="Email">
                    <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
                  </Field>
                  <button type="submit" disabled={loading || !resetEmail}
                    style={{ marginTop: 4, background: "linear-gradient(135deg,#D4AF37,#b8941e)", color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800, padding: "13px 24px", borderRadius: 12, border: "none", cursor: loading || !resetEmail ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: loading || !resetEmail ? 0.5 : 1 }}>
                    {loading ? "Enviando..." : "Enviar enlace"}
                  </button>
                </form>
                <div style={{ marginTop: 20, textAlign: "center" }}>
                  <button type="button" onClick={() => { setIsResetMode(false); setError(null); }}
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", background: "none", border: "none", cursor: "pointer" }}>
                    ← Volver al inicio de sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Login / Signup form ── */
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px", position: "relative" }}>
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 480, height: 480, borderRadius: "50%", top: "30%", left: "25%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", top: "60%", right: "20%", transform: "translate(50%,-50%)", background: "radial-gradient(circle, rgba(109,40,217,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Back link */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: "0.82rem", color: "rgba(255,255,255,0.4)",
          textDecoration: "none", marginBottom: 28, transition: "color 0.15s",
        }}>
          ← Volver al inicio
        </Link>

        {/* Card */}
        <div style={{
          background: "#0d1225",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 20, padding: "32px 28px",
          boxShadow: "0 0 40px rgba(212,175,55,0.05)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: "2.5rem", display: "block", marginBottom: 12 }}>⚽</span>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: "1.4rem", letterSpacing: "-0.02em", background: "linear-gradient(135deg,#ecc64e,#D4AF37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
            </h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
              {isSignUp ? "Únete a la porra del Mundial 2026" : "Bienvenido de vuelta"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "0.82rem", color: "#ef4444", lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isSignUp && (
              <Field label="Nombre / Alias">
                <input type="text" name="displayName" required minLength={2} maxLength={30}
                  placeholder="Tu nombre para la clasificación"
                  style={inputStyle} />
              </Field>
            )}

            <Field label="Email">
              <input type="email" name="email" required
                placeholder="tu@email.com"
                style={inputStyle} />
            </Field>

            <Field label="Contraseña">
              <input type="password" name="password" required minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle} />
              {!isSignUp && (
                <button type="button" onClick={() => { setIsResetMode(true); setError(null); }}
                  style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", padding: 0, display: "block" }}>
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </Field>

            {isSignUp && (
              <Field label="Confirmar contraseña" error={confirmError}>
                <input type="password" name="confirmPassword" required minLength={6}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: confirmError ? "rgba(239,68,68,0.5)" : confirmPassword && passwordsMatch ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)",
                  }} />
                {confirmPassword && passwordsMatch && !confirmError && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#22c55e", fontSize: "0.85rem" }}>✓</span>
                )}
              </Field>
            )}

            {isSignUp && (
              <div style={{ padding: "12px 14px", background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 10 }}>
                <p style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  📧 Recibirás un email de confirmación. Debes hacer clic en el enlace para activar tu cuenta.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading || (isSignUp && !!confirmError)}
              style={{
                marginTop: 4,
                background: "linear-gradient(135deg, #D4AF37, #b8941e)",
                color: "#070b1e", fontFamily: "var(--font-heading)", fontWeight: 800,
                padding: "13px 24px", borderRadius: 12, border: "none",
                cursor: loading || (isSignUp && !!confirmError) ? "not-allowed" : "pointer",
                fontSize: "0.95rem", opacity: loading || (isSignUp && !!confirmError) ? 0.5 : 1,
                transition: "opacity 0.15s",
              }}>
              {loading ? "Cargando..." : isSignUp ? "Crear cuenta" : "Entrar"}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
            {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button type="button" onClick={switchMode}
              style={{ color: "#D4AF37", fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem" }}>
              {isSignUp ? "Inicia sesión" : "Regístrate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "var(--font-body)",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string | null }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>{children}</div>
      {error && <p style={{ fontSize: "0.73rem", color: "#ef4444", marginTop: 5 }}>{error}</p>}
    </div>
  );
}
