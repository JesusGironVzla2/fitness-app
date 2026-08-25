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
import { resumirPlataforma } from '../../src/lib/platformStats.js';

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

// ------------------------------------------------- 5. Navegación sin enlaces rotos
{
  // Un destino del menú sin ruta en App.jsx no da error en ninguna parte: el
  // usuario pulsa, no encaja ninguna ruta y se queda mirando una página vacía.
  // Aquí se comprueba que cada enlace del menú tenga su ruta y al revés.
  const nav = leer('src/lib/navigation.js');
  const app = leer('src/App.jsx');

  const destinos = [...nav.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
  const rutas = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);

  assert.ok(destinos.length >= 15, `se esperaban al menos 15 destinos, hay ${destinos.length}`);
  const sinRuta = destinos.filter((d) => !rutas.includes(d));
  assert.deepEqual(sinRuta, [], `destinos del menú sin ruta en App.jsx: ${sinRuta.join(', ')}`);
  ok('Navegación — todos los enlaces del menú tienen ruta declarada');

  const huerfanas = rutas.filter((r) => !destinos.includes(r) && !['/login', '/'].includes(r));
  assert.deepEqual(huerfanas, [], `rutas a las que no lleva ningún enlace: ${huerfanas.join(', ')}`);
  ok('Navegación — no hay páginas inalcanzables desde el menú');

  // El banco de pruebas responsive registra su propia tabla de rutas. Si sólo
  // monta la página de `?page=`, pulsar cualquier enlace desmonta la app entera
  // y parece un fallo del producto cuando es del banco.
  const banco = leer('scripts/responsive/main.jsx');
  assert.match(
    banco,
    /Object\.entries\(PAGES\)[\s\S]{0,200}<Route/,
    'scripts/responsive/main.jsx debe registrar todas las páginas, no sólo la de ?page='
  );
  ok('Navegación — el banco de pruebas registra todas las páginas');
}

// ------------------------------------------- 6. Estadísticas de la plataforma
{
  const DIA = 24 * 60 * 60 * 1000;
  const AHORA = new Date('2026-08-25T12:00:00Z').getTime();
  const haceDias = (dias) => new Date(AHORA - dias * DIA).toISOString();

  const usuarios = [
    { role: 'admin', status: 'active' },
    { role: 'trainer', status: 'active' },
    { role: 'trainer', status: 'active' },
    { role: 'trainer', status: 'suspended' },   // no es un entrenador *activo*
    { role: 'trainer', status: 'deleted' },     // baja
    { role: 'student', status: 'active', createdAt: haceDias(5) },
    { role: 'student', status: 'active', createdAt: haceDias(20) },
    { role: 'user', status: 'active', createdAt: haceDias(40) },   // etiqueta antigua
    { role: 'student', status: 'suspended', createdAt: haceDias(50) },
    { role: 'student', status: 'deleted', createdAt: haceDias(3) }, // baja
    { role: undefined, status: 'active' },      // sin rol: se degrada a alumno
    null,
  ];

  const r = resumirPlataforma(usuarios, 356, AHORA);
  assert.equal(r.entrenadores, 2, 'los entrenadores suspendidos y de baja no son activos');
  // 5 = dos 'student' activos + el rol antiguo 'user' + el suspendido + el que
  // no tiene rol, que normalizeRole degrada a alumno. Fuera queda la baja.
  assert.equal(r.alumnos, 5, "cuenta el rol antiguo 'user', el suspendido y el que no tiene rol");
  assert.equal(r.rutinas, 356);
  assert.equal(r.nuevos, 2, 'altas de alumnos en los últimos 30 días');
  assert.equal(r.previos, 2, 'altas de alumnos en los 30 días anteriores');
  assert.equal(r.crecimiento, 0, '2 frente a 2 es 0%, no un +24% inventado');
  ok('Plataforma — cuenta roles, bajas y suspendidos según sus reglas');

  const sinFechas = resumirPlataforma(
    [{ role: 'student', status: 'active' }, { role: 'student', status: 'active' }], 0, AHORA
  );
  assert.equal(sinFechas.alumnos, 2);
  assert.equal(sinFechas.crecimiento, null, 'sin altas con las que comparar no se inventa un porcentaje');
  ok('Plataforma — sin datos de alta el crecimiento es null, no 0%');

  const creciendo = resumirPlataforma(
    [
      { role: 'student', status: 'active', createdAt: haceDias(1) },
      { role: 'student', status: 'active', createdAt: haceDias(2) },
      { role: 'student', status: 'active', createdAt: haceDias(3) },
      { role: 'student', status: 'active', createdAt: haceDias(45) },
    ], 0, AHORA
  );
  assert.equal(creciendo.crecimiento, 200, '3 altas frente a 1 es un +200%');
  ok('Plataforma — el crecimiento compara 30 días contra los 30 anteriores');

  assert.deepEqual(
    resumirPlataforma(null, undefined, AHORA),
    { entrenadores: 0, alumnos: 0, rutinas: 0, nuevos: 0, previos: 0, crecimiento: null },
    'sin datos no debe reventar'
  );
  ok('Plataforma — tolera una lista de usuarios vacía o nula');

  // La razón de existir de todo esto: que no vuelvan a ser constantes.
  const dash = leer('src/pages/Dashboard.jsx');
  const bloque = dash.slice(dash.indexOf('const adminStats'), dash.indexOf('const trainerStats'));
  for (const inventado of ["'12'", "'148'", "'356'", "'+24%'"]) {
    assert.ok(!bloque.includes(inventado), `las tarjetas de admin vuelven a tener ${inventado} a mano`);
  }
  assert.ok(bloque.includes('adminMetrics'), 'las tarjetas de admin deben leer los datos cargados');
  ok('Plataforma — las tarjetas de admin no llevan cifras escritas a mano');
}

console.log(`\n  ${n} comprobaciones OK`);
