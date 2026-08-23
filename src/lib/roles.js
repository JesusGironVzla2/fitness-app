/**
 * Normalización de roles.
 *
 * La base de datos tiene dos etiquetas para lo mismo: los alumnos creados desde
 * "Mis Alumnos" se guardan como 'student', pero varias pantallas (y el menú
 * lateral) comprobaban 'user'. Eso hacía, por ejemplo, que el Dashboard nunca
 * mostrase los paneles de alumno a quien tuviera el rol antiguo y que el chat
 * no cargase la conversación con el entrenador.
 *
 * Toda la app consume ahora el rol ya normalizado por AuthContext.
 */

export const ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  STUDENT: 'student',
};

/** Convierte cualquier variante almacenada al rol canónico. */
export function normalizeRole(role) {
  if (role === ROLES.ADMIN) return ROLES.ADMIN;
  if (role === ROLES.TRAINER) return ROLES.TRAINER;
  // 'user' es la etiqueta antigua para alumno; cualquier valor desconocido
  // se degrada al rol con menos permisos, nunca a admin.
  return ROLES.STUDENT;
}

/** Etiqueta legible en español. */
export function roleLabel(role) {
  switch (normalizeRole(role)) {
    case ROLES.ADMIN:
      return 'Administrador';
    case ROLES.TRAINER:
      return 'Entrenador';
    default:
      return 'Alumno';
  }
}

/** Estados de cuenta que impiden el acceso a la plataforma. */
export const BLOCKED_STATUSES = new Set(['suspended', 'deleted']);
