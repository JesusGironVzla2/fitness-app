import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Iniciar sesión
  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Registrar un usuario
  async function signup(email, password, role = 'admin') {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: email,
      role: role,
      createdAt: new Date().toISOString()
    });
    return userCredential;
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
            setUserRole(docSnap.data().role);
          } else {
            setUserRole('admin'); 
            await setDoc(docRef, { email: user.email, role: 'admin' });
          }
        } catch (error) {
          console.error("Error obteniendo rol:", error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
        setImpersonatedUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser: impersonatedUser ? { ...currentUser, uid: impersonatedUser.id, email: impersonatedUser.email, displayName: impersonatedUser.name } : currentUser,
    originalUser: currentUser,
    userRole: impersonatedUser ? (impersonatedUser.role || 'trainer') : userRole,
    isImpersonating: !!impersonatedUser,
    impersonate,
    stopImpersonating,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
