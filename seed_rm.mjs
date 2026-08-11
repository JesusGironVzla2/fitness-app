import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";

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

async function seedRMData() {
  try {
    const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const adminsSnap = await getDocs(adminsQuery);
    if (adminsSnap.empty) {
      console.log("Admin not found!");
      return;
    }
    const adminUid = adminsSnap.docs[0].id;
    console.log("Found admin UID:", adminUid);

    // Create 5 RM records over time for Press de Banca
    const baseDate = new Date();
    const data = [
      { offset: -60, weight: "80", reps: "3" }, // 60 days ago
      { offset: -45, weight: "85", reps: "2" }, // 45 days ago
      { offset: -30, weight: "90", reps: "1" }, // 30 days ago
      { offset: -15, weight: "95", reps: "1" }, // 15 days ago
      { offset: -2,  weight: "100", reps: "1" }  // 2 days ago
    ];

    for (let record of data) {
      const d = new Date(baseDate.getTime());
      d.setDate(d.getDate() + record.offset);
      
      await addDoc(collection(db, "progress_logs"), {
        studentId: adminUid,
        type: "RM",
        exerciseOrBodyPart: "Press de Banca",
        value: record.weight,
        unit: "kg",
        notes: `RM: ${record.weight}kg x ${record.reps} reps`,
        createdAt: d.toISOString()
      });
      console.log(`Created RM record: ${record.weight}kg at ${d.toISOString()}`);
    }

    // A couple more for Sentadilla Libre
    await addDoc(collection(db, "progress_logs"), {
      studentId: adminUid,
      type: "RM",
      exerciseOrBodyPart: "Sentadilla Libre",
      value: "120",
      unit: "kg",
      notes: "RM: 120kg x 1 reps",
      createdAt: new Date(baseDate.getTime() - 1000 * 60 * 60 * 24 * 10).toISOString() // 10 days ago
    });
    
    await addDoc(collection(db, "progress_logs"), {
      studentId: adminUid,
      type: "RM",
      exerciseOrBodyPart: "Sentadilla Libre",
      value: "125",
      unit: "kg",
      notes: "RM: 125kg x 1 reps",
      createdAt: new Date().toISOString() // today
    });

    console.log("Seeded RM records successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedRMData();
