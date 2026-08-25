// Firestore falso: siempre devuelve colecciones vacías, sin red.
const emptySnap = { docs: [], size: 0, empty: true, forEach() {} };

// Datos inyectables para las pruebas que necesitan contenido real.
export const __fixtures = { workouts: [], exercises: [] };

function snapDe(items) {
  const docs = items.map(it => ({ id: it.id, data: () => it }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (f) => docs.forEach(f) };
}
export function getFirestore() { return {}; }
export function collection(_db, nombre) { return { __col: nombre }; }
export function query(col) { return col || {}; }
export function where() { return {}; }
export function orderBy() { return {}; }
export function limit() { return {}; }
export function doc() { return { id: 'mock' }; }
export async function getDocs(q) {
  const col = q && q.__col;
  if (col === 'workouts' && __fixtures.workouts.length) return snapDe(__fixtures.workouts);
  if (col === 'exercises' && __fixtures.exercises.length) return snapDe(__fixtures.exercises);
  return emptySnap;
}
// El panel de admin cuenta las rutinas con el agregado del servidor. Se apoya
// en getDocs para que los fixtures inyectados también valgan aquí.
export async function getCountFromServer(q) {
  const snap = await getDocs(q);
  return { data: () => ({ count: snap.size }) };
}
export async function getDoc() { return { exists: () => false, data: () => ({}), id: 'mock' }; }
export async function addDoc() { return { id: 'new' }; }
export async function setDoc() {}
export async function updateDoc() {}
export async function deleteDoc() {}
export function onSnapshot(q, cb) { setTimeout(() => cb(emptySnap), 0); return () => {}; }

// La app ahora inicializa Firestore con caché persistente; el mock replica
// esas exportaciones para que el bundle de pruebas resuelva igual que la app.
export function initializeFirestore() { return {}; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
