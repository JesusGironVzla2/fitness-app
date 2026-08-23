/**
 * Utilidades de fecha tolerantes a datos incompletos.
 *
 * Los documentos de Firestore de esta app guardan fechas de tres formas
 * distintas según quién las creó: string ISO ("2025-08-21T10:00:00.000Z"),
 * string de día ("2025-08-21") y, en algunos casos antiguos, Timestamp de
 * Firestore. Además hay documentos sin fecha. Llamar a `new Date(undefined)`
 * y luego `.toISOString()` lanza un RangeError que rompía la pantalla entera,
 * así que todo el acceso a fechas pasa por aquí.
 */

/** Convierte cualquier valor a Date, o devuelve null si no es una fecha válida. */
export function toDate(value) {
  if (!value) return null;
  // Timestamp de Firestore
  if (typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  // "2025-08-21" se interpreta como UTC medianoche, lo que desplaza el día
  // hacia atrás en zonas horarias negativas. Lo anclamos al mediodía local.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Milisegundos de la fecha, o `fallback` si no es válida (útil para ordenar). */
export function toTime(value, fallback = 0) {
  const d = toDate(value);
  return d ? d.getTime() : fallback;
}

/**
 * Clave de día en horario LOCAL ("YYYY-MM-DD").
 * `toISOString().split('T')[0]` devuelve el día en UTC, lo que hacía que las
 * rachas y el contador de agua cambiaran de día a horas incorrectas.
 */
export function dayKey(value = new Date()) {
  const d = toDate(value);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Día local de hoy en formato "YYYY-MM-DD". */
export function todayKey() {
  return dayKey(new Date());
}

/** Fecha corta localizada, o `fallback` si el dato no es una fecha. */
export function formatDate(value, fallback = '—', locale = 'es-ES') {
  const d = toDate(value);
  return d ? d.toLocaleDateString(locale) : fallback;
}

/** Hora corta localizada, o cadena vacía si el dato no es una fecha. */
export function formatTimeOfDay(value, locale = undefined) {
  const d = toDate(value);
  return d ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
}

/** Etiqueta corta para ejes de gráficas ("21 ago"). */
export function formatShort(value, fallback = '—') {
  const d = toDate(value);
  return d ? d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : fallback;
}

/** Fecha de una rutina: prioriza el día planificado y cae a la fecha de cierre. */
export function workoutDate(workout) {
  if (!workout) return null;
  return toDate(workout.date) || toDate(workout.completedAt) || toDate(workout.createdAt);
}

/** Número tolerante: devuelve `fallback` en lugar de NaN. */
export function toNumber(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
