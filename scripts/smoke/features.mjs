/**
 * Comprobaciones del paquete de usabilidad:
 *   1. Restablecimiento de contraseña
 *   2. "Última vez levantaste…"
 *   3. Persistencia offline de Firestore
 *   4. Búsqueda y filtro de alumnos
 *
 * Las que son lógica pura se prueban directamente; las de UI se comprueban
 * inspeccionando el código para no depender de un DOM completo.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construirHistorialPorEjercicio, hace, resumirSesion } from '../../src/lib/history.js';

let n = 0;
const ok = (m) => { n++; console.log('  ✓', m); };
const leer = (p) => fs.readFileSync(p, 'utf8');

// ---------------------------------------------------------------- 2. Historial
{
  const workouts = [
    {
      id: 'w1', completed: true, date: '2026-08-10',
      exercises: [{ exerciseId: 'press', name: 'Press de banca' }],
      actualData: { 0: { done: true, reps: '4x10', weight: 55, rir: '2' } },
    },
    {
      id: 'w2', completed: true, date: '2026-08-17',
      exercises: [{ exerciseId: 'press', name: 'Press de banca' }],
      actualData: { 0: { done: true, reps: '4x10', weight: 60, rir: '1' } },
    },
    // Rutina de hoy, todavía sin completar: no debe contar
    {
      id: 'w3', completed: false, date: '2026-08-21',
      exercises: [{ exerciseId: 'press', name: 'Press de banca' }],
    },
  ];

  const h = construirHistorialPorEjercicio(workouts, 'w3');
  const press = h.get('press');
  assert.equal(press.peso, 60, 'debe quedarse con la sesión MÁS RECIENTE');
  assert.equal(press.series, 4);
  assert.equal(press.reps, 10);
  assert.equal(press.rir, '1');
  ok('Historial — devuelve la última sesión completada, no la primera');

  assert.equal(resumirSesion(press), '4x10 · 60 kg · RIR 1');
  ok('Historial — resumen legible "4x10 · 60 kg · RIR 1"');

  // Excluir la rutina que se está viendo
  const h2 = construirHistorialPorEjercicio(workouts, 'w2');
  assert.equal(h2.get('press').peso, 55, 'al ver w2, la "última vez" debe ser w1');
  ok('Historial — excluye la rutina que se está viendo');

  // Series no marcadas como hechas se ignoran
  const sinHacer = construirHistorialPorEjercicio([{
    id: 'x', completed: true, date: '2026-08-01',
    exercises: [{ exerciseId: 'sentadilla' }],
    actualData: { 0: { done: false, reps: '4x10', weight: 80 } },
  }]);
  assert.equal(sinHacer.get('sentadilla'), undefined);
  ok('Historial — ignora los ejercicios no marcados como completados');

  // Datos corruptos no rompen nada
  assert.equal(construirHistorialPorEjercicio(null).size, 0);
  assert.equal(construirHistorialPorEjercicio([{ completed: true }]).size, 0);
  assert.equal(construirHistorialPorEjercicio([
    { id: 'a', completed: true, exercises: [{ exerciseId: 'z' }] }, // sin fecha
  ]).size, 0);
  ok('Historial — tolera rutinas sin fecha, sin ejercicios o nulas');

  // Etiquetas temporales
  const hoy = new Date(2026, 7, 21);
  assert.equal(hace(new Date(2026, 7, 21), hoy), 'hoy');
  assert.equal(hace(new Date(2026, 7, 20), hoy), 'ayer');
  assert.equal(hace(new Date(2026, 7, 18), hoy), 'hace 3 días');
  assert.equal(hace(new Date(2026, 7, 14), hoy), 'hace 1 semana');
  assert.equal(hace(new Date(2026, 6, 21), hoy), 'hace 4 semanas'); // 31 días
  assert.equal(hace(new Date(2026, 6, 10), hoy), 'hace 1 mes');     // 42 días
  assert.equal(hace(null, hoy), '');
  ok('Historial — etiquetas "hoy / ayer / hace 3 días / hace 4 semanas / hace 1 mes"');
}

// ------------------------------------------------- 3. Persistencia offline
{
  const fb = leer('src/lib/firebase.js');
  assert.ok(fb.includes('persistentLocalCache'), 'falta persistentLocalCache');
  assert.ok(fb.includes('persistentMultipleTabManager'), 'falta el gestor multipestaña');
  assert.ok(fb.includes('initializeFirestore'), 'debe usar initializeFirestore');
  assert.ok(/catch\s*\(/.test(fb), 'debe haber respaldo si IndexedDB no está disponible');
  ok('Offline — Firestore configurado con caché persistente y respaldo');

  const layout = leer('src/components/Layout.jsx');
  assert.ok(layout.includes("addEventListener('offline'"), 'falta el listener offline');
  assert.ok(layout.includes("addEventListener('online'"), 'falta el listener online');
  assert.ok(layout.includes('offline-banner'), 'falta el aviso visual');
  assert.ok(leer('src/styles/global.css').includes('.offline-banner'), 'falta el estilo del aviso');
  ok('Offline — aviso de conexión perdida conectado a los eventos del navegador');
}

// --------------------------------------------- 1. Restablecer contraseña
{
  const ctx = leer('src/context/AuthContext.jsx');
  assert.ok(ctx.includes('sendPasswordResetEmail'), 'falta sendPasswordResetEmail');
  assert.ok(/resetPassword,/.test(ctx), 'resetPassword debe exponerse en el contexto');
  ok('Reset — resetPassword disponible en el contexto de autenticación');

  const login = leer('src/pages/Login.jsx');
  assert.ok(login.includes('¿Olvidaste tu contraseña?'), 'falta el enlace en el login');
  assert.ok(login.includes('handleReset'), 'falta el manejador');
  // No debe confirmar si la cuenta existe (evita enumeración de correos)
  assert.ok(/Si \$\{cleanEmail\} tiene una cuenta/.test(login),
    'el mensaje no debe revelar si el correo está registrado');
  ok('Reset — el login no revela qué correos están registrados');

  const students = leer('src/pages/Students.jsx');
  assert.ok(students.includes('handleEnviarAcceso'), 'falta el envío desde la ficha del alumno');
  assert.ok(students.includes('Enviar acceso'), 'falta el botón');
  ok('Reset — el entrenador puede enviar el enlace de acceso a un alumno');
}

// ------------------------------------------------ 4. Búsqueda de alumnos
{
  const src = leer('src/pages/Students.jsx');
  assert.ok(src.includes('alumnosFiltrados'), 'falta la lista filtrada');
  assert.ok(src.includes('filtroEstado'), 'falta el filtro por estado');
  assert.ok(src.includes('students-search'), 'falta la barra de búsqueda');
  assert.ok(src.includes('alumnosFiltrados.map'), 'la rejilla debe pintar la lista filtrada');
  assert.ok(!/\{students\.map\(student/.test(src), 'no debe quedar el map sin filtrar');
  ok('Búsqueda — la rejilla pinta la lista filtrada, no la completa');

  // Reproducción de la lógica de filtrado tal como está en el componente
  const alumnos = [
    { name: 'Ana Pérez', email: 'ana@test.com', phone: '600111222', status: 'active' },
    { name: 'Luis Gómez', email: 'luis@test.com', phone: '600333444', status: 'suspended' },
    { name: null, email: 'sinnombre@test.com', phone: null, status: 'active' },
  ];
  const filtrar = (termino, estado) => alumnos.filter((st) => {
    if (estado === 'activos' && st.status === 'suspended') return false;
    if (estado === 'suspendidos' && st.status !== 'suspended') return false;
    if (!termino) return true;
    return [st.name, st.email, st.phone]
      .some((c) => String(c || '').toLowerCase().includes(termino));
  });

  assert.equal(filtrar('', 'todos').length, 3);
  assert.equal(filtrar('ana', 'todos').length, 1);
  assert.equal(filtrar('ANA', 'todos').length, 0, 'la búsqueda se normaliza a minúsculas antes');
  assert.equal(filtrar('600333', 'todos')[0].name, 'Luis Gómez', 'busca también por teléfono');
  assert.equal(filtrar('test.com', 'todos').length, 3, 'busca por correo');
  assert.equal(filtrar('', 'activos').length, 2);
  assert.equal(filtrar('', 'suspendidos').length, 1);
  assert.equal(filtrar('luis', 'activos').length, 0, 'combina búsqueda y filtro');
  // Un alumno sin nombre ni teléfono no debe reventar el filtro
  assert.equal(filtrar('sinnombre', 'todos').length, 1);
  ok('Búsqueda — filtra por nombre, correo y teléfono, y combina con el estado');
}

console.log(`\n  ${n} comprobaciones OK`);
