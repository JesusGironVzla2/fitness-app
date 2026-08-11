import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp4espahpvdMUcRAEYe-r0g4pVidYm534",
  authDomain: "fitpro-61517.firebaseapp.com",
  projectId: "fitpro-61517",
  storageBucket: "fitpro-61517.firebasestorage.app",
  messagingSenderId: "961617372564",
  appId: "1:961617372564:web:4e82ac542159d32b9c5b81",
  measurementId: "G-7XX9YW7696"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const q = query(collection(db, "users"), where("role", "==", "student"));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No hay alumnos.");
    process.exit(1);
  }
  const studentId = snap.docs[0].id;
  
  const now = new Date();
  
  // Seed Weight
  for(let i=0; i<5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (30 - i*7));
    await addDoc(collection(db, "progress_logs"), {
      studentId, type: 'Medida', metric: 'Peso Corporal', value: (85 - i*1.2).toString(), unit: 'kg', createdAt: date.toISOString()
    });
  }
  
  // Seed Fat
  for(let i=0; i<5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (30 - i*7));
    await addDoc(collection(db, "progress_logs"), {
      studentId, type: 'Medida', metric: '% Grasa', value: (22 - i*0.8).toString(), unit: '%', createdAt: date.toISOString()
    });
  }
  
  // Seed RMs
  for(let i=0; i<5; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (30 - i*7));
    await addDoc(collection(db, "progress_logs"), {
      studentId, type: 'RM', exerciseOrBodyPart: 'Sentadilla Libre', value: (60 + i*5).toString(), unit: 'kg', createdAt: date.toISOString()
    });
  }

  console.log("Datos inyectados exitosamente.");
  process.exit(0);
}

seed();
