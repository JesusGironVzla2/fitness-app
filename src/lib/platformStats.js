/**
 * Estadísticas de plataforma del panel de administrador.
 *
 * Las cuatro cifras estuvieron escritas a mano en `Dashboard.jsx` (12
 * entrenadores, 148 alumnos, 356 rutinas, +24%), así que la pantalla principal
 * del admin enseñaba lo mismo tuviera la plataforma lo que tuviera.
 *
 * El recuento vive aquí, y no dentro del componente, porque las reglas no son
 * obvias —la etiqueta de rol antigua, las bajas, las altas sin fecha— y así se
 * pueden comprobar sin montar la página entera (ver `scripts/smoke/features.mjs`).
 */
import { ROLES, normalizeRole, BLOCKED_STATUSES } from './roles.js';
import { toTime } from './dates.js';

const DIA = 24 * 60 * 60 * 1000;
const VENTANA = 30 * DIA;

/** 'deleted' es una baja: cuenta como si el usuario no estuviera. */
const dadoDeBaja = (u) => u?.status === 'deleted';

/**
 * @param usuarios documentos de la colección `users`
 * @param rutinas  número de documentos de `workouts`
 * @param ahora    marca de tiempo de referencia (inyectable para las pruebas)
 */
export function resumirPlataforma(usuarios, rutinas, ahora = Date.now()) {
  const lista = Array.isArray(usuarios) ? usuarios.filter(Boolean) : [];

  // normalizeRole traduce la etiqueta antigua 'user' y degrada cualquier valor
  // desconocido a alumno: contar por `role` en crudo dejaría gente fuera.
  const esRol = (u, rol) => normalizeRole(u.role) === rol;

  // "Activos" excluye suspendidos y bajas. Un alumno suspendido, en cambio,
  // sigue siendo alumno de la plataforma: sólo se descuentan las bajas.
  const entrenadores = lista.filter(
    (u) => esRol(u, ROLES.TRAINER) && !BLOCKED_STATUSES.has(u.status)
  ).length;
  const alumnos = lista.filter((u) => esRol(u, ROLES.STUDENT) && !dadoDeBaja(u));

  // Altas de alumnos de los últimos 30 días frente a los 30 anteriores. Los
  // documentos antiguos no tienen `createdAt`; sin nada con que comparar se
  // devuelve null y la tarjeta lo dice, en vez de inventarse un porcentaje.
  const antiguedad = (u) => {
    const t = toTime(u.createdAt, 0);
    return t ? ahora - t : null;
  };
  const enVentana = (u, desde, hasta) => {
    const e = antiguedad(u);
    return e !== null && e > desde && e <= hasta;
  };

  const nuevos = alumnos.filter((u) => enVentana(u, -Infinity, VENTANA)).length;
  const previos = alumnos.filter((u) => enVentana(u, VENTANA, 2 * VENTANA)).length;
  const crecimiento = previos > 0 ? Math.round(((nuevos - previos) / previos) * 100) : null;

  return {
    entrenadores,
    alumnos: alumnos.length,
    rutinas: typeof rutinas === 'number' ? rutinas : 0,
    nuevos,
    previos,
    crecimiento,
  };
}
