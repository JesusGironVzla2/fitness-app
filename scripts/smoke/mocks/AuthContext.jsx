import React, { createContext, useContext } from 'react';

// Sustituye al AuthContext real para poder montar cada página con un rol fijo
// sin depender de Firebase Auth.
const MockAuthContext = createContext(null);

export const currentRole = { value: 'student' };

export function useAuth() {
  const ctx = useContext(MockAuthContext);
  return ctx || fallback();
}

// Un objeto estable por rol: si se devolviera uno nuevo en cada render,
// `useEffect([currentUser])` se dispararía sin parar (falso positivo de
// "Maximum update depth exceeded" que no ocurre en la app real).
const cache = new Map();

function fallback() {
  const role = currentRole.value;
  if (!cache.has(role)) cache.set(role, buildAuth(role));
  return cache.get(role);
}

function buildAuth(role) {
  return {
    currentUser: { uid: 'user-1', email: 'alumno@test.com', displayName: 'Alumno Test' },
    originalUser: { uid: 'user-1', email: 'alumno@test.com' },
    userRole: role,
    isImpersonating: false,
    authError: '',
    clearAuthError: () => {},
    impersonate: () => {},
    stopImpersonating: () => {},
    login: async () => {},
    signup: async () => {},
    logout: async () => {},
  };
}

export function AuthProvider({ children }) {
  return <MockAuthContext.Provider value={fallback()}>{children}</MockAuthContext.Provider>;
}
