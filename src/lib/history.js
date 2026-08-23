import { workoutDate, toNumber } from './dates.js';

/**
 * Última sesión registrada de cada ejercicio.
 *
 * Los datos ya se guardaban en `workouts.actualData` desde el principio, pero
 * nunca se mostraban: al abrir una rutina, el alumno no tenía forma de saber
 * con qué peso entrenó la vez anterior y acababa adivinando.
 *
 * Devuelve un Map de `exerciseId` → última serie efectiva registrada.
 *
 * @param {Array} workouts todas las rutinas del alumno
 * @param {string} [excluirWorkoutId] rutina a ignorar (normalmente, la que se está viendo)
 */
export function construirHistorialPorEjercicio(workouts, excluirWorkoutId) {
  const historial = new Map();
  if (!Array.isArray(workouts)) return historial;

  // De más reciente a más antigua, para quedarnos con la primera coincidencia.
  const completadas = workouts
    .filter((w) => w && w.completed && Array.isArray(w.exercises))
    .map((w) => ({ w, fecha: workoutDate(w) }))
    .filter((x) => x.fecha)
    .sort((a, b) => b.fecha - a.fecha);

  for (const { w, fecha } of completadas) {
    if (excluirWorkoutId && w.id === excluirWorkoutId) continue;

    w.exercises.forEach((ex, idx) => {
      const id = ex && ex.exerciseId;
      if (!id || historial.has(id)) return;

      const real = (w.actualData && w.actualData[idx]) || null;
      if (!real || !real.done) return;

      // `reps` se guarda como "seriesxreps" (por ejemplo "4x10").
      const [seriesStr, repsStr] = String(real.reps ?? '').split('x');
      const series = parseInt(seriesStr, 10);
      const reps = parseInt(repsStr, 10);
      const peso = toNumber(real.weight, null);

      // Sin peso ni series no hay nada útil que mostrar.
      if (peso === null && !Number.isFinite(series)) return;

      historial.set(id, {
        fecha,
        series: Number.isFinite(series) ? series : null,
        reps: Number.isFinite(reps) ? reps : null,
        peso,
        rir: real.rir ?? null,
        nombre: ex.name || null,
      });
    });
  }

  return historial;
}

/**
 * "hoy", "ayer", "hace 3 días", "hace 2 semanas"…
 * Pensado para acompañar al dato de la última sesión.
 */
export function hace(fecha, referencia = new Date()) {
  if (!fecha) return '';

  const a = new Date(fecha);
  a.setHours(0, 0, 0, 0);
  const b = new Date(referencia);
  b.setHours(0, 0, 0, 0);

  const dias = Math.round((b - a) / (1000 * 60 * 60 * 24));

  if (dias < 0) return 'programado';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;

  const semanas = Math.floor(dias / 7);
  if (semanas === 1) return 'hace 1 semana';
  if (semanas < 5) return `hace ${semanas} semanas`;

  const meses = Math.floor(dias / 30);
  return meses <= 1 ? 'hace 1 mes' : `hace ${meses} meses`;
}

/** Resumen legible: "4x10 · 60 kg · RIR 2". */
export function resumirSesion(dato) {
  if (!dato) return '';
  const partes = [];
  if (dato.series && dato.reps) partes.push(`${dato.series}x${dato.reps}`);
  else if (dato.series) partes.push(`${dato.series} series`);
  if (dato.peso !== null && dato.peso > 0) partes.push(`${dato.peso} kg`);
  if (dato.rir !== null && dato.rir !== undefined && dato.rir !== '') partes.push(`RIR ${dato.rir}`);
  return partes.join(' · ');
}
