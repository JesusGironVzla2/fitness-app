import { initializeApp } from "firebase/app";
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
const db = getFirestore(app);

async function seedStudentRMData() {
  try {
    // 1. Get the standard trainer
    const trainersQuery = query(collection(db, "users"), where("email", "==", "entrenador@fitpro.com"));
    const trainersSnap = await getDocs(trainersQuery);
    if (trainersSnap.empty) {
      console.log("Trainer not found!");
      return;
    }
    const trainerUid = trainersSnap.docs[0].id;
    console.log("Found trainer UID:", trainerUid);

    // 2. Get their students
    const studentsQuery = query(collection(db, "users"), where("role", "==", "student"), where("trainerId", "==", trainerUid));
    const studentsSnap = await getDocs(studentsQuery);
    if (studentsSnap.empty) {
      console.log("No students found for trainer!");
      return;
    }

    const baseDate = new Date();
    
    // Seed records for all students of this trainer
    for (const doc of studentsSnap.docs) {
      const studentId = doc.id;
      const studentName = doc.data().name;
      console.log(`Seeding progress for ${studentName} (${studentId})`);

      const data = [
        { offset: -50, weight: "40", reps: "5" }, 
        { offset: -35, weight: "45", reps: "4" }, 
        { offset: -20, weight: "50", reps: "2" }, 
        { offset: -5,  weight: "55", reps: "1" }  
      ];

      for (let record of data) {
        const d = new Date(baseDate.getTime());
        d.setDate(d.getDate() + record.offset);
        
        await addDoc(collection(db, "progress_logs"), {
          studentId: studentId,
          type: "RM",
          exerciseOrBodyPart: "Sentadilla Libre",
          value: record.weight,
          unit: "kg",
          notes: `Mejorando poco a poco: ${record.weight}kg`,
          createdAt: d.toISOString()
        });
      }
      
      const pData = [
        { offset: -60, weight: "30", reps: "8" }, 
        { offset: -30, weight: "35", reps: "6" }, 
        { offset: -2,  weight: "40", reps: "3" }  
      ];

      for (let record of pData) {
        const d = new Date(baseDate.getTime());
        d.setDate(d.getDate() + record.offset);
        
        await addDoc(collection(db, "progress_logs"), {
          studentId: studentId,
          type: "RM",
          exerciseOrBodyPart: "Press de Banca",
          value: record.weight,
          unit: "kg",
          notes: `RM: ${record.weight}kg x ${record.reps}`,
          createdAt: d.toISOString()
        });
      }
    }

    console.log("Seeded Student RM records successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedStudentRMData();
