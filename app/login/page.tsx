"use client";

import { useState } from "react";
import { login, signup } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = isSignUp ? await signup(formData) : await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // Redirect happened (success)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-glow/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          ← Volver al inicio
        </Link>

        {/* Card */}
        <div className="glass-strong p-8 glow-gold">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">🏆</span>
            <h1 className="font-[var(--font-heading)] text-2xl font-bold text-gold-gradient">
              {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
            </h1>
            <p className="text-sm text-white/40 mt-2">
              {isSignUp
                ? "Únete a la porra del Mundial 2026"
                : "Bienvenido de vuelta"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-white/60 mb-1.5 font-medium">
                  Nombre / Alias
                </label>
                <input
                  type="text"
                  name="displayName"
                  required
                  minLength={2}
                  maxLength={30}
                  placeholder="Tu nombre para la clasificación"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="tu@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-medium">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center !py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Cargando..."
                : isSignUp
                ? "Crear Cuenta"
                : "Entrar"}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm text-white/40">
            {isSignUp ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-gold-400 hover:text-gold-300 font-medium transition-colors"
            >
              {isSignUp ? "Inicia sesión" : "Regístrate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
