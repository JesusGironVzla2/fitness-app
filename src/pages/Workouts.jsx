import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, Dumbbell, User } from 'lucide-react';
import '../styles/global.css';

export default function Workouts() {
  const [students, setStudents] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState([]); // [{ exerciseId, sets, reps, weight }]
  
  // Temp state for adding an exercise to the current routine
  const [tempExerciseId, setTempExerciseId] = useState('');
  const [tempSets, setTempSets] = useState(4);
  const [tempReps, setTempReps] = useState(12);

  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      // 1. Fetch Alumnos del Entrenador
      const qStudents = query(collection(db, "users"), where("role", "==", "student"), where("trainerId", "==", currentUser.uid));
      const snapStudents = await getDocs(qStudents);
      const studentList = snapStudents.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Add "self" so trainers/admins can assign routines to themselves
      studentList.unshift({
        id: currentUser.uid,
        name: 'Yo mismo (Entrenamiento Personal)',
        email: currentUser.email
      });

      setStudents(studentList);

      // 2. Fetch Ejercicios de la biblioteca
      const qExercises = query(collection(db, "exercises"));
      const snapExercises = await getDocs(qExercises);
      setExercises(snapExercises.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToRoutine = () => {
    if (!tempExerciseId) return;
    const exInfo = exercises.find(e => e.id === tempExerciseId);
    setRoutineExercises([...routineExercises, {
      exerciseId: tempExerciseId,
      name: exInfo?.name || 'Desconocido',
      sets: tempSets,
      reps: tempReps,
    }]);
    setTempExerciseId('');
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!selectedStudent || routineExercises.length === 0) {
      alert("Selecciona un alumno y añade al menos un ejercicio.");
      return;
    }

    try {
      await addDoc(collection(db, "workouts"), {
        studentId: selectedStudent,
        trainerId: currentUser.uid,
        date: selectedDay,
        name: routineName,
        exercises: routineExercises,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setRoutineExercises([]);
      setRoutineName('');
      alert("Rutina asignada exitosamente.");
    } catch (err) {
      console.error("Error guardando rutina:", err);
    }
  };

  return (
    <div className="workouts-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Rutinas</h1>
          <p>Asigna entrenamientos por día de la semana a tus alumnos.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Calendar size={20} />
          <span>Asignar Rutina</span>
        </button>
      </div>

      <div className="glass" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <Calendar size={48} color="var(--muted-foreground)" style={{margin: '0 auto 1rem'}} />
        <h3>Panel de Rutinas en Construcción</h3>
        <p>Haz clic en "Asignar Rutina" para comenzar a planificar los entrenamientos.</p>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass" style={{maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>Diseñar Rutina</h2>
            <form onSubmit={handleSaveRoutine} className="modal-form">
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Alumno</label>
                  <select 
                    value={selectedStudent} 
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="" disabled>Selecciona un alumno</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>Fecha del Entrenamiento</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={selectedDay} 
                    onChange={(e) => setSelectedDay(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Nombre de la Rutina (Ej. Día de Pecho)</label>
                <input 
                  type="text" 
                  className="input-field"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                  required
                />
              </div>

              <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />
              <h3>Ejercicios</h3>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div className="input-group" style={{ flex: 2 }}>
                  <label>Ejercicio</label>
                  <select 
                    value={tempExerciseId} 
                    onChange={(e) => setTempExerciseId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccionar...</option>
                    {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Series</label>
                  <input className="input-field" type="number" min="1" value={tempSets} onChange={(e) => setTempSets(e.target.value)} style={{ padding: '0.75rem' }} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Reps</label>
                  <input className="input-field" type="number" min="1" value={tempReps} onChange={(e) => setTempReps(e.target.value)} style={{ padding: '0.75rem' }} />
                </div>
                <button type="button" className="btn-secondary" onClick={addExerciseToRoutine} style={{ height: '42px', padding: '0 1rem' }}>
                  <Plus size={16} />
                </button>
              </div>

              {routineExercises.length > 0 && (
                <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                  {routineExercises.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span><Dumbbell size={14} style={{marginRight: '0.5rem', color: 'var(--primary)'}} /> {ex.name}</span>
                      <span style={{ color: 'var(--muted-foreground)' }}>{ex.sets} series x {ex.reps} reps</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Rutina</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
