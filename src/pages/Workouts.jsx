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
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', targetMuscle: 'Pecho', description: '', imageUrl: '' });
  
  // Form State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState([]); // [{ exerciseId, sets, reps, weight }]
  
  // Temp state for adding an exercise to the current routine
  const [selectedMuscles, setSelectedMuscles] = useState([]);

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

  const handleToggleExercise = (ex) => {
    const isSelected = routineExercises.some(r => r.exerciseId === ex.id);
    if (isSelected) {
      setRoutineExercises(routineExercises.filter(r => r.exerciseId !== ex.id));
    } else {
      setRoutineExercises([...routineExercises, {
        exerciseId: ex.id,
        name: ex.name,
        sets: 4,
        reps: 12,
      }]);
    }
  };

  const handleUpdateRoutineExercise = (index, field, value) => {
    const updated = [...routineExercises];
    updated[index][field] = value;
    setRoutineExercises(updated);
  };

  const muscleGroups = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen'];
  
  const toggleMuscleFilter = (muscle) => {
    if (muscle === 'Todos') {
      setSelectedMuscles([]);
      return;
    }
    if (selectedMuscles.includes(muscle)) {
      setSelectedMuscles(selectedMuscles.filter(m => m !== muscle));
    } else {
      setSelectedMuscles([...selectedMuscles, muscle]);
    }
  };

  const filteredExercises = selectedMuscles.length === 0 
    ? exercises 
    : exercises.filter(ex => selectedMuscles.some(m => ex.targetMuscle?.toLowerCase().includes(m.toLowerCase())));

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

  const handleCreateExerciseInline = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "exercises"), {
        ...newExercise,
        createdAt: new Date().toISOString()
      });
      const createdEx = { id: docRef.id, ...newExercise };
      setExercises([...exercises, createdEx]);
      
      setRoutineExercises([...routineExercises, {
        exerciseId: createdEx.id,
        name: createdEx.name,
        sets: 4,
        reps: 12,
      }]);
      
      setShowCreateExerciseModal(false);
      setNewExercise({ name: '', targetMuscle: 'Pecho', description: '', imageUrl: '' });
    } catch (err) {
      console.error("Error creating exercise inline:", err);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Añadir Ejercicios</h3>
                <button 
                  type="button" 
                  onClick={() => setShowCreateExerciseModal(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                >
                  <Plus size={16} /> Crear Ejercicio
                </button>
              </div>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Filtra por músculo y marca los ejercicios que deseas incluir en esta rutina.
              </p>

              <div className="filters-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {muscleGroups.map(muscle => {
                  const isActive = muscle === 'Todos' ? selectedMuscles.length === 0 : selectedMuscles.includes(muscle);
                  return (
                    <button 
                      key={muscle}
                      type="button"
                      onClick={() => toggleMuscleFilter(muscle)}
                      className={`badge ${isActive ? 'active' : ''}`}
                      style={{ 
                        cursor: 'pointer', 
                        border: 'none', 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 0.8rem',
                        background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: isActive ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {muscle}
                    </button>
                  );
                })}
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {filteredExercises.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', margin: 0 }}>No hay ejercicios para este músculo.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {filteredExercises.map(ex => {
                      const isSelected = routineExercises.some(r => r.exerciseId === ex.id);
                      return (
                        <label key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', background: isSelected ? 'rgba(163, 230, 53, 0.1)' : 'transparent', borderRadius: '4px' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleToggleExercise(ex)}
                            style={{ accentColor: 'var(--primary)', width: '1.2rem', height: '1.2rem' }}
                          />
                          <span style={{ fontWeight: isSelected ? '600' : 'normal', color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                            {ex.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {routineExercises.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Ejercicios Seleccionados</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {routineExercises.map((ex, i) => (
                      <div key={i} className="glass" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius)', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 100%', minWidth: '150px' }}>
                          <Dumbbell size={16} style={{marginRight: '0.5rem', color: 'var(--primary)'}} /> 
                          <span style={{ fontWeight: '500' }}>{ex.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 auto', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Series:</label>
                            <input 
                              type="number" 
                              min="1" 
                              className="input-field" 
                              style={{ width: '60px', padding: '0.25rem 0.5rem' }} 
                              value={ex.sets}
                              onChange={(e) => handleUpdateRoutineExercise(i, 'sets', e.target.value)}
                            />
                          </div>
                          <span style={{ color: 'var(--muted-foreground)' }}>x</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Reps:</label>
                            <input 
                              type="number" 
                              min="1" 
                              className="input-field" 
                              style={{ width: '60px', padding: '0.25rem 0.5rem' }} 
                              value={ex.reps}
                              onChange={(e) => handleUpdateRoutineExercise(i, 'reps', e.target.value)}
                            />
                          </div>
                          <button 
                            type="button" 
                            style={{ background: 'transparent', border: 'none', color: 'var(--destructive)', marginLeft: 'auto', padding: '0.25rem' }}
                            onClick={() => handleToggleExercise({ id: ex.exerciseId })}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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

      {showCreateExerciseModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal glass">
            <h2>Nuevo Ejercicio</h2>
            <form onSubmit={handleCreateExerciseInline} className="modal-form">
              <div className="input-group">
                <label>Nombre del Ejercicio</label>
                <input 
                  type="text" 
                  placeholder="Ej. Press de Banca" 
                  className="input-field"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Músculo Principal</label>
                <select 
                  className="input-field"
                  value={newExercise.targetMuscle}
                  onChange={(e) => setNewExercise({...newExercise, targetMuscle: e.target.value})}
                  required
                >
                  {muscleGroups.filter(m => m !== 'Todos').map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Descripción / Ejecución (Opcional)</label>
                <textarea 
                  className="input-field"
                  placeholder="Instrucciones..." 
                  value={newExercise.description}
                  onChange={(e) => setNewExercise({...newExercise, description: e.target.value})}
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateExerciseModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Ejercicio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
