import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

async function seedAdminData() {
  try {
    // 1. Get the admin UID (Assuming admin@fitpro.com is the admin)
    const adminEmail = "admin@fitpro.com";
    const adminPassword = "password123";
    
    // We don't login here because we can just find the admin in firestore if we want, or just create a user and assign trainerId as the admin's UID.
    // Let's sign in to get the UID, then sign out.
    const userCred = await createUserWithEmailAndPassword(auth, "alumnodemo@fitpro.com", "password123").catch(async (e) => {
      // If exists, just return it or login
      return null;
    });

    // Let's just create the student doc in Firestore.
    // Wait, we need the Admin's UID. Let's query users for role == admin.
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnap = await getDocs(adminsQuery);
    if (adminsSnap.empty) {
      console.log("Admin not found!");
      return;
    }
    const adminUid = adminsSnap.docs[0].id;
    console.log("Found admin UID:", adminUid);

    // Create Demo Student
    let studentUid = "student_demo_123";
    if (userCred) {
        studentUid = userCred.user.uid;
    }
    
    await setDoc(doc(db, "users", studentUid), {
      email: "alumnodemo@fitpro.com",
      name: "Demo Admin",
      role: "student",
      trainerId: adminUid,
      trainingType: "remoto",
      createdAt: new Date().toISOString()
    });
    console.log("Created demo student for Admin");

    // Create a workout for this student
    const workoutRef = await addDoc(collection(db, "workouts"), {
      studentId: studentUid,
      trainerId: adminUid,
      name: "Día 1 - Pierna Pesada",
      date: new Date().toISOString().split('T')[0],
      completed: true,
      feedback: "Me costó la última serie de sentadillas, creo que podemos bajarle 5kg la próxima semana para mejorar la técnica.",
      completedAt: new Date().toISOString(),
      exercises: [
        { name: "Sentadilla Libre", sets: 4, reps: 8 },
        { name: "Prensa", sets: 3, reps: 12 }
      ]
    });
    console.log("Created completed workout for student");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedAdminData();
