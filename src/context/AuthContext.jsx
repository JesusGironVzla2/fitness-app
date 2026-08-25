import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { normalizeRole, ROLES, BLOCKED_STATUSES } from '../lib/roles';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Iniciar sesión
  async function login(email, password) {
    setAuthError('');
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Comprobar el estado de la cuenta ANTES de dejar entrar.
    // "Suspender" y "Eliminar" sólo escribían un campo en Firestore: el usuario
    // seguía pudiendo iniciar sesión y usar la app con normalidad.
    try {
      const snap = await getDoc(doc(db, 'users', credential.user.uid));
      if (snap.exists() && BLOCKED_STATUSES.has(snap.data().status)) {
        await signOut(auth);
        const err = new Error(
          snap.data().status === 'suspended'
            ? 'Tu cuenta está suspendida. Contacta con tu entrenador.'
            : 'Esta cuenta ya no está activa.'
        );
        err.code = 'auth/account-disabled';
        throw err;
      }
    } catch (err) {
      if (err.code === 'auth/account-disabled') throw err;
      // Un fallo de permisos leyendo el perfil no debe impedir el login.
      console.error('No se pudo verificar el estado de la cuenta:', err);
    }

    return credential;
  }

  /**
   * Registra un usuario.
   *
   * El botón "¿Primer uso? Crea el Administrador" llamaba aquí con rol 'admin'
   * sin comprobar nada: cualquier visitante podía crearse una cuenta con
   * permisos totales, y el rol admin puede suplantar a otras cuentas. Mientras
   * el despliegue estuvo cerrado tras el login de Vercel no se notaba; al
   * abrirlo al público pasó a ser una puerta abierta.
   *
   * El alta de administrador sólo funciona ahora si todavía no existe ninguno,
   * que es justo lo que el botón dice hacer. El rol por defecto pasa a ser el
   * de menos permisos: que un descuido al llamar a signup() reparta permisos
   * totales es lo que causó el problema.
   *
   * Esto cierra la puerta evidente, pero es una comprobación de cliente y no
   * es la cerradura: quien sepa hablar con Firebase directamente la rodea. La
   * defensa real son las reglas de `firestore.rules`.
   */
  async function signup(email, password, role = ROLES.STUDENT) {
    if (role === ROLES.ADMIN) {
      const yaHayAdmin = await getDocs(
        query(collection(db, 'users'), where('role', '==', ROLES.ADMIN), limit(1))
      );
      if (!yaHayAdmin.empty) {
        const err = new Error(
          'Ya existe un administrador. Pide que te creen la cuenta desde dentro de la plataforma.'
        );
        err.code = 'auth/admin-already-exists';
        throw err;
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      role: role,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    return userCredential;
  }

  /**
   * Envía al correo indicado un enlace para restablecer la contraseña.
   *
   * Antes no había ninguna forma de recuperar el acceso: si un alumno olvidaba
   * su contraseña, el entrenador tenía que crearle una cuenta nueva.
   *
   * Firebase no revela si el correo existe o no (protección contra enumeración
   * de cuentas), así que la UI debe dar siempre el mismo mensaje.
   */
  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, String(email || '').trim());
  }

  // Cerrar sesión
  function logout() {
    setImpersonatedUser(null);
    return signOut(auth);
  }

  const impersonate = (user) => setImpersonatedUser(user);
  const stopImpersonating = () => setImpersonatedUser(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Cuenta suspendida o eliminada: cerrar la sesión restaurada.
            if (BLOCKED_STATUSES.has(data.status)) {
              setAuthError(
                data.status === 'suspended'
                  ? 'Tu cuenta está suspendida. Contacta con tu entrenador.'
                  : 'Esta cuenta ya no está activa.'
              );
              setUserRole(null);
              setImpersonatedUser(null);
              await signOut(auth);
              setLoading(false);
              return;
            }

            setUserRole(normalizeRole(data.role));
          } else {
            // Antes, cualquier usuario autenticado sin documento de perfil se
            // convertía automáticamente en ADMIN (y se le escribía ese rol).
            // Bastaba con borrar el perfil de un alumno para que ganase acceso
            // total. Ahora se cae al rol con menos permisos.
            setUserRole(ROLES.STUDENT);
            await setDoc(docRef, {
              email: user.email,
              role: ROLES.STUDENT,
              status: 'active',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error obteniendo rol:", error);
          setUserRole(ROLES.STUDENT);
        }
      } else {
        setUserRole(null);
        setImpersonatedUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Memoizado a propósito: al suplantar a un alumno, `currentUser` se
  // reconstruye con spread, así que sin useMemo cambiaría de identidad en cada
  // render y cualquier `useEffect([currentUser])` volvería a lanzar su consulta.
  const value = useMemo(() => ({
    currentUser: impersonatedUser
      ? { ...currentUser, uid: impersonatedUser.id, email: impersonatedUser.email, displayName: impersonatedUser.name }
      : currentUser,
    originalUser: currentUser,
    userRole: impersonatedUser ? normalizeRole(impersonatedUser.role) : userRole,
    isImpersonating: !!impersonatedUser,
    authError,
    clearAuthError: () => setAuthError(''),
    impersonate,
    stopImpersonating,
    login,
    signup,
    resetPassword,
    logout
  }), [currentUser, impersonatedUser, userRole, authError]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthLoading /> : children}
    </AuthContext.Provider>
  );
}

/**
 * Pantalla de carga mientras Firebase restaura la sesión.
 * Antes se renderizaba `null`, lo que dejaba la pantalla completamente en
 * blanco durante la comprobación inicial y parecía que la app no cargaba.
 */
function AuthLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        color: 'var(--muted-foreground)',
        background: 'var(--background)'
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(163, 230, 53, 0.25)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      Cargando…
    </div>
  );
}
