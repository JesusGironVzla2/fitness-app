export function getAuth() { return { currentUser: null, signOut: async () => {} }; }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb(null), 0); return () => {}; }
export async function signInWithEmailAndPassword() { return { user: { uid: 'u1' } }; }
export async function createUserWithEmailAndPassword() { return { user: { uid: 'u2' } }; }
export async function signOut() {}
