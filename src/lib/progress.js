import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase.js';
import { toTime, toNumber } from './dates.js';

/**
 * Acceso unificado a `progress_logs`.
 *
 * La colección quedó con dos formas incompatibles:
 *
 *   - Dashboard / Alumnos / Progreso / Ajustes escriben
 *       { studentId, type: 'Medida' | 'RM' | 'Water', metric, value: string }
 *   - Control Corporal (BodyMetrics) escribía
 *       { userId,    type: 'metric',                  metric, value: number }
 *
 * Resultado: el peso registrado en Control Corporal nunca aparecía en el
 * Dashboard y el registrado desde el Dashboard nunca aparecía en Control
 * Corporal. A partir de ahora se escribe siempre en la forma canónica
 * (`studentId` + 'Medida') y la lectura acepta las dos, para no perder los
 * registros que ya existen en la base de datos.
 */

export const MEASURE_TYPE = 'Medida';

/** Tipos que representan una medida corporal, incluyendo el formato antiguo. */
const MEASURE_TYPES = new Set([MEASURE_TYPE, 'metric', 'Peso']);

/** Normaliza un documento a la forma canónica que consume la UI. */
function normalize(id, data) {
  const type = MEASURE_TYPES.has(data.type) ? MEASURE_TYPE : data.type;
  return {
    ...data,
    id,
    type,
    studentId: data.studentId || data.userId || null,
    // El formato antiguo guardaba `value` como número y el nuevo como string.
    // La UI hace parseFloat en todas partes, así que se expone siempre string
    // y además un `numericValue` ya validado.
    value: data.value === undefined || data.value === null ? '' : String(data.value),
    numericValue: toNumber(data.value, null),
    // "Peso Corporal" se guardaba a veces en `metric` y a veces en
    // `exerciseOrBodyPart`; se unifican para que los filtros funcionen.
    metric: data.metric || (type === MEASURE_TYPE ? data.exerciseOrBodyPart : undefined),
  };
}

/**
 * Devuelve todos los logs de progreso de un usuario, en ambas formas,
 * deduplicados y ordenados de más antiguo a más reciente.
 */
export async function fetchProgressLogs(uid) {
  if (!uid) return [];

  const col = collection(db, 'progress_logs');
  const [byStudent, byUser] = await Promise.all([
    getDocs(query(col, where('studentId', '==', uid))),
    // Los documentos antiguos de Control Corporal no tienen `studentId`.
    getDocs(query(col, where('userId', '==', uid))).catch(() => ({ docs: [] })),
  ]);

  const seen = new Map();
  for (const snap of [byStudent, byUser]) {
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) seen.set(d.id, normalize(d.id, d.data()));
    });
  }

  return [...seen.values()].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
}

/** Construye el documento canónico de una medida corporal. */
export function buildMeasureLog({ studentId, metric, value, unit }) {
  return {
    studentId,
    type: MEASURE_TYPE,
    metric,
    value: String(value),
    unit: unit || '',
    createdAt: new Date().toISOString(),
  };
}
