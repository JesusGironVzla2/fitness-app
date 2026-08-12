import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';

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

const newExercises = [
  { name: 'Dominadas', targetMuscle: 'Espalda', description: 'Eleva tu cuerpo colgado de una barra hasta que tu barbilla la pase.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif' },
  { name: 'Remo con mancuerna', targetMuscle: 'Espalda', description: 'Apoyado en un banco, tira de la mancuerna hacia tu cadera.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif' },
  { name: 'Press Militar con Barra', targetMuscle: 'Hombro', description: 'Empuja la barra por encima de tu cabeza hasta extender los brazos.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif' },
  { name: 'Elevaciones Laterales', targetMuscle: 'Hombro', description: 'Eleva las mancuernas hacia los lados hasta la altura de los hombros.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
  { name: 'Pájaros (Flys posteriores)', targetMuscle: 'Hombro', description: 'Inclinado hacia adelante, eleva las mancuernas hacia los lados.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Rear-Lateral-Raise.gif' },
  { name: 'Curl Martillo', targetMuscle: 'Bíceps', description: 'Curl de bíceps con agarre neutro (palmas enfrentadas).', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif' },
  { name: 'Curl Scott (Predicador)', targetMuscle: 'Bíceps', description: 'Curl apoyando los brazos en el banco Scott.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Preacher-Curl.gif' },
  { name: 'Fondos en Paralelas', targetMuscle: 'Tríceps', description: 'Baja tu cuerpo flexionando los codos en las barras paralelas.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Triceps-Dips.gif' },
  { name: 'Press Francés', targetMuscle: 'Tríceps', description: 'Tumbado, flexiona los codos llevando la barra hacia tu frente.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Skull-Crusher.gif' },
  { name: 'Prensa de Piernas', targetMuscle: 'Piernas', description: 'Empuja la plataforma con las piernas en la máquina.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Press.gif' },
  { name: 'Extensiones de Cuádriceps', targetMuscle: 'Piernas', description: 'Extiende las piernas en la máquina sentada.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Extension.gif' },
  { name: 'Curl de Isquiotibiales', targetMuscle: 'Piernas', description: 'Flexiona las piernas hacia tus glúteos en la máquina.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Curl.gif' },
  { name: 'Zancadas (Lunges)', targetMuscle: 'Piernas', description: 'Da un paso adelante y baja la cadera hasta que ambas rodillas formen 90 grados.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif' },
  { name: 'Peso Muerto Rumano', targetMuscle: 'Piernas', description: 'Baja la barra manteniendo las piernas semirrectas para sentir los isquiotibiales.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Romanian-Deadlift.gif' },
  { name: 'Elevación de Talones (Gemelos)', targetMuscle: 'Piernas', description: 'Eleva los talones contrayendo las pantorrillas.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif' },
  { name: 'Hip Thrust (Empuje de cadera)', targetMuscle: 'Piernas', description: 'Empuja la barra con la cadera contrayendo los glúteos.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif' },
  { name: 'Crunch Abdominal', targetMuscle: 'Abdomen', description: 'Contrae el abdomen elevando ligeramente el torso del suelo.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Crunch.gif' },
  { name: 'Elevación de Piernas', targetMuscle: 'Abdomen', description: 'Eleva las piernas rectas apoyado en el banco o suelo.', imageUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif' }
];

async function run() {
  console.log("Cargando nuevos ejercicios a la base de datos...");
  const q = collection(db, 'exercises');
  const snap = await getDocs(q);
  const existingNames = snap.docs.map(d => d.data().name.toLowerCase().trim());
  
  let added = 0;
  for (const ex of newExercises) {
    if (!existingNames.includes(ex.name.toLowerCase().trim())) {
      console.log(`Añadiendo: ${ex.name}`);
      await addDoc(collection(db, "exercises"), { ...ex, createdAt: new Date().toISOString() });
      added++;
    } else {
      console.log(`Ya existe: ${ex.name}`);
    }
  }
  
  console.log(`¡${added} ejercicios nuevos añadidos con éxito!`);
  process.exit(0);
}

run();
