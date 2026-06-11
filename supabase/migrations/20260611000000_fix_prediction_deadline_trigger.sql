-- Fix: enforce_match_prediction_deadline bloqueaba escrituras del backend admin.
--
-- Contexto del bug:
--   El trigger BEFORE INSERT OR UPDATE en match_predictions lanzaba
--   "Predictions are locked. The deadline was 15 minutes before kickoff (...)"
--   incluso cuando el admin guardaba un resultado o sincronizaba la API usando
--   SUPABASE_SERVICE_ROLE_KEY.
--
-- Causa raíz:
--   El service_role BYPASEA RLS pero NO bypasea triggers — los triggers se
--   ejecutan SIEMPRE, también para el service_role. Por eso ningún cambio en
--   el código TypeScript (upsert -> update, env vars) lo resolvía.
--
-- Solución:
--   La función salta la comprobación del deadline cuando auth.uid() IS NULL
--   (contexto backend/service_role, sin usuario autenticado), manteniendo el
--   bloqueo de 15 min para los usuarios normales.
--
-- NOTA: este trigger se creó originalmente a mano en Supabase y no estaba
--       versionado. Este archivo lo documenta para no perderlo si se recrea la BD.

CREATE OR REPLACE FUNCTION enforce_match_prediction_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_match_date timestamptz;
BEGIN
  -- El backend (service_role) opera sin auth.uid(): permitir escritura del resultado/puntos
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Usuarios normales: aplicar el bloqueo de 15 min antes del saque
  SELECT match_date INTO v_match_date
  FROM matches
  WHERE id = NEW.match_id;

  IF now() >= v_match_date - interval '15 minutes' THEN
    RAISE EXCEPTION 'Predictions are locked. The deadline was 15 minutes before kickoff (%).',
      v_match_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger ya existe; CREATE OR REPLACE FUNCTION actualiza el cuerpo sin recrearlo.
-- Definición de referencia (por si hay que recrear la BD desde cero):
--
--   CREATE TRIGGER enforce_match_prediction_deadline
--   BEFORE INSERT OR UPDATE ON public.match_predictions
--   FOR EACH ROW EXECUTE FUNCTION enforce_match_prediction_deadline();
