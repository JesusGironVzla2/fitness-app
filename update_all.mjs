import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

const exerciseGifMap = {
  "peso muerto": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif",
  "apertura plano": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Fly.gif",
  "press inclinado": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif",
  "press de banca": "https://media.tenor.com/E8e9mE7N9h8AAAAC/bench-press.gif",
  "apertura inclinado": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Fly.gif",
  "triángulo en polea": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Triceps-Pushdown.gif",
  "patada en polea": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Triceps-Kickback.gif",
  "mecate": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Rope-Tricep-Pushdown.gif",
  "sentadilla libre": "https://media.tenor.com/QhT83Dk0mBIAAAAC/squats-workout.gif",
  "mecate unilateral": "https://fitnessprogramer.com/wp-content/uploads/2021/06/Single-Arm-Cable-Tricep-Extension.gif",
  "jalón al pecho": "https://media.tenor.com/7H-v500c2A8AAAAC/lat-pulldown-exercise.gif",
  "remo con barra": "https://media.tenor.com/O61G9v9b2eAAAAAC/bent-over-row.gif",
  "curl de bíceps": "https://media.tenor.com/a9c1B-Y6uDkAAAAC/biceps-curl.gif"
};

async function run() {
  console.log("Updating exercises...");
  const q = collection(db, 'exercises');
  const snap = await getDocs(q);
  
  let updatedCount = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const name = data.name.toLowerCase().trim();
    if (exerciseGifMap[name] && !data.imageUrl) {
      console.log(`Updating ${data.name}...`);
      await updateDoc(doc(db, 'exercises', d.id), {
        imageUrl: exerciseGifMap[name]
      });
      updatedCount++;
    }
  }
  console.log(`Successfully updated ${updatedCount} exercises!`);
  process.exit(0);
}
run();
