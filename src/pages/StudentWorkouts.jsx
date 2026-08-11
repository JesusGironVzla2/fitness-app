import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle, MessageSquare } from 'lucide-react';
import '../styles/global.css';

export default function StudentWorkouts() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generalFeedback, setGeneralFeedback] = useState({});
  const [exerciseFeedback, setExerciseFeedback] = useState({});
  const [completing, setCompleting] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) fetchWorkouts();
  }, [currentUser]);

  const fetchWorkouts = async () => {
    try {
      const q = query(collection(db, "workouts"), where("studentId", "==", currentUser.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      data.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setRoutines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseChange = (workoutId, exIndex, field, value) => {
    setExerciseFeedback(prev => ({
      ...prev,
      [workoutId]: {
        ...(prev[workoutId] || {}),
        [exIndex]: {
          ...((prev[workoutId] || {})[exIndex] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleCompleteWorkout = async (routine) => {
    try {
      setCompleting(true);
      const workoutId = routine.id;
      const workoutRef = doc(db, "workouts", workoutId);
      
      const exData = exerciseFeedback[workoutId] || {};
      
      // Update the workout document
      await updateDoc(workoutRef, {
        completed: true,
        feedback: generalFeedback[workoutId] || '',
        actualData: exData,
        completedAt: new Date().toISOString()
      });
      
      // Refresh routines
      fetchWorkouts();
    } catch (error) {
      console.error("Error completing workout", error);
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00Z');
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="workouts-page">
      <div className="page-header">
        <div>
          <h1>Mis Rutinas</h1>
          <p>Tu plan de entrenamiento semanal asignado por tu entrenador.</p>
        </div>
      </div>

      <div className="grid">
        {loading ? <p>Cargando tu plan...</p> : routines.length === 0 ? (
           <p style={{ color: 'var(--muted-foreground)' }}>Aún no tienes entrenamientos asignados en el calendario.</p>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className="glass active-day" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Calendar size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, color: 'white', textTransform: 'capitalize' }}>{formatDate(routine.date)}</h3>
              </div>
              
              <div>
                <h4 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>{routine.name}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {routine.exercises.map((ex, i) => {
                    const exActualData = (routine.actualData && routine.actualData[i]) || {};
                    const fb = (exerciseFeedback[routine.id] || {})[i] || {};
                    const isCompleted = routine.completed;
                    
                    const reps = fb.reps !== undefined ? fb.reps : (exActualData.reps || '');
                    const weight = fb.weight !== undefined ? fb.weight : (exActualData.weight || '');
                    const note = fb.note !== undefined ? fb.note : (exActualData.note || '');
                    const done = fb.done !== undefined ? fb.done : (exActualData.done || false);
                    
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', fontSize: '0.9rem', opacity: done ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={done}
                            onChange={(e) => handleExerciseChange(routine.id, i, 'done', e.target.checked)}
                            style={{ transform: 'scale(1.3)', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <strong style={{ color: done ? 'var(--muted-foreground)' : 'white', fontSize: '1rem', textDecoration: done ? 'line-through' : 'none' }}>{ex.name}</strong>
                          <span style={{ color: 'var(--primary)', marginLeft: 'auto' }}>Meta: {ex.sets}x{ex.reps}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Reps / Series</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder={`Ej. 4x8`}
                              value={reps}
                              onChange={(e) => handleExerciseChange(routine.id, i, 'reps', e.target.value)}
                              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Peso (kg)</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              placeholder="Ej. 60"
                              value={weight}
                              onChange={(e) => handleExerciseChange(routine.id, i, 'weight', e.target.value)}
                              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Nota / Sensaciones</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              placeholder="Ej. Me costó mucho..."
                              value={note}
                              onChange={(e) => handleExerciseChange(routine.id, i, 'note', e.target.value)}
                              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ padding: '1.5rem 0' }}>
                  {routine.completed && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={20} />
                        Rutina marcada como completada
                      </h4>
                    </div>
                  )}

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--foreground)' }}>Comentario General de la Rutina (opcional)</label>
                    <textarea 
                      className="input-field" 
                      rows="2" 
                      placeholder="Ej. Me sentí súper bien hoy, terminé en 45 min..."
                      value={generalFeedback[routine.id] !== undefined ? generalFeedback[routine.id] : (routine.feedback || '')}
                      onChange={(e) => setGeneralFeedback({...generalFeedback, [routine.id]: e.target.value})}
                      style={{ width: '100%', marginBottom: '1rem', resize: 'vertical' }}
                    />
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                      disabled={completing}
                      onClick={() => handleCompleteWorkout(routine)}
                    >
                      <CheckCircle size={20} style={{ marginRight: '0.5rem' }}/>
                      {completing ? 'Guardando...' : (routine.completed ? 'Actualizar Progreso de Rutina' : 'Marcar Rutina como Completada')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .active-day {
          border: 1px solid rgba(163, 230, 53, 0.3);
        }
      `}</style>
    </div>
  );
}
