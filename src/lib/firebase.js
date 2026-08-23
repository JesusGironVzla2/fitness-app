import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAp4espahpvdMUcRAEYe-r0g4pVidYm534",
  authDomain: "fitpro-61517.firebaseapp.com",
  projectId: "fitpro-61517",
  storageBucket: "fitpro-61517.firebasestorage.app",
  messagingSenderId: "961617372564",
  appId: "1:961617372564:web:4e82ac542159d32b9c5b81",
  measurementId: "G-7XX9YW7696"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);

/**
 * Firestore con caché persistente en disco (IndexedDB).
 *
 * Sin esto, cualquier corte de conexión dejaba la app en blanco: las consultas
 * fallaban, los `catch` escribían en consola y las pantallas se quedaban vacías
 * sin explicación. Con la caché activada:
 *
 *   - Lo ya visto se sigue leyendo sin red.
 *   - Las escrituras (completar una rutina, registrar una medida) se encolan en
 *     local y se sincronizan solas al recuperar señal.
 *
 * `persistentMultipleTabManager` permite tener la app abierta en varias
 * pestañas; con el gestor por defecto, la segunda pestaña se queda sin caché.
 */
function crearFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    // IndexedDB puede no estar disponible (navegación privada, navegadores
    // antiguos, entornos de prueba). En ese caso se cae a Firestore en memoria
    // en lugar de tumbar el arranque de la app.
    console.warn("Sin caché offline, se usa Firestore en memoria:", error?.message || error);
    return getFirestore(app);
  }
}

export const db = crearFirestore();
export const storage = getStorage(app);

// Secondary app for creating users without signing out current user
export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
