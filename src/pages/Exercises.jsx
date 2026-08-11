import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Plus, TrendingUp } from 'lucide-react';
import '../styles/global.css';

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', targetMuscle: '', description: '', imageUrl: '' });
  
  // States para filtros y RM
  const [filterMuscle, setFilterMuscle] = useState('Todos');
  const [showRmModal, setShowRmModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [rmValue, setRmValue] = useState('');
  const [repsValue, setRepsValue] = useState('');
  
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const q = query(collection(db, "exercises"));
      const querySnapshot = await getDocs(q);
      const exercisesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExercises(exercisesData);
    } catch (err) {
      console.error("Error fetching exercises:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "exercises"), {
        ...newExercise,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewExercise({ name: '', targetMuscle: '', description: '', imageUrl: '' });
      fetchExercises();
    } catch (err) {
      console.error("Error creating exercise:", err);
    }
  };

  const handleLogRM = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "progress_logs"), {
        studentId: currentUser.uid,
        type: "RM",
        exerciseOrBodyPart: selectedExercise.name,
        value: rmValue,
        unit: "kg",
        notes: `RM: ${rmValue}kg x ${repsValue} reps`,
        createdAt: new Date().toISOString()
      });
      setShowRmModal(false);
      setRmValue('');
      setRepsValue('');
    } catch (err) {
      console.error("Error saving RM:", err);
    }
  };

  const muscleGroups = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen'];
  const filteredExercises = filterMuscle === 'Todos' 
    ? exercises 
    : exercises.filter(ex => ex.targetMuscle.toLowerCase().includes(filterMuscle.toLowerCase()));

  return (
    <div className="exercises-page">
      <div className="page-header">
        <div>
          <h1>Biblioteca de Ejercicios</h1>
          <p>Base de datos global de ejercicios para asignar a los alumnos.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>Nuevo Ejercicio</span>
        </button>
      </div>

      <div className="filters-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {muscleGroups.map(muscle => (
          <button 
            key={muscle}
            onClick={() => setFilterMuscle(muscle)}
            className={`badge ${filterMuscle === muscle ? 'active' : ''}`}
            style={{ 
              cursor: 'pointer', 
              border: 'none', 
              fontSize: '0.9rem', 
              padding: '0.5rem 1rem',
              background: filterMuscle === muscle ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: filterMuscle === muscle ? 'var(--primary-foreground)' : 'var(--muted-foreground)'
            }}
          >
            {muscle}
          </button>
        ))}
      </div>

      <div className="exercises-grid">
        {loading ? (
          <p>Cargando ejercicios...</p>
        ) : exercises.length === 0 ? (
          <div className="empty-state glass" style={{ gridColumn: '1 / -1' }}>
            <Dumbbell size={48} color="var(--muted-foreground)" />
            <h3>No hay ejercicios</h3>
            <p>Agrega ejercicios a la biblioteca para empezar a crear rutinas.</p>
          </div>
        ) : (
          filteredExercises.map(exercise => (
            <div 
              key={exercise.id} 
              className="exercise-card glass" 
              onClick={() => { setSelectedExercise(exercise); setShowRmModal(true); }}
              style={{ cursor: 'pointer' }}
            >
              <div className="exercise-img">
                {exercise.imageUrl ? (
                  <img src={exercise.imageUrl} alt={exercise.name} />
                ) : (
                  <div className="placeholder-img"><Dumbbell size={32} /></div>
                )}
              </div>
              <div className="exercise-info">
                <h3>{exercise.name}</h3>
                <span className="badge">{exercise.targetMuscle}</span>
                <p>{exercise.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Nuevo Ejercicio</h2>
            <form onSubmit={handleCreateExercise} className="modal-form">
              <div className="input-group">
                <label>Nombre del Ejercicio</label>
                <input 
                  type="text" 
                  placeholder="Ej. Press de Banca" 
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Músculo Principal</label>
                <input 
                  type="text" 
                  placeholder="Ej. Pecho" 
                  value={newExercise.targetMuscle}
                  onChange={(e) => setNewExercise({...newExercise, targetMuscle: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label>Descripción / Ejecución</label>
                <textarea 
                  placeholder="Instrucciones de cómo realizar el ejercicio..." 
                  value={newExercise.description}
                  onChange={(e) => setNewExercise({...newExercise, description: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="input-group">
                <label>URL de la Imagen/GIF (Opcional por ahora)</label>
                <input 
                  type="url" 
                  placeholder="https://..." 
                  value={newExercise.imageUrl}
                  onChange={(e) => setNewExercise({...newExercise, imageUrl: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Ejercicio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRmModal && selectedExercise && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Registrar Récord</h2>
            <p className="modal-subtitle">Guarda tu RM para <strong>{selectedExercise.name}</strong></p>
            <form onSubmit={handleLogRM} className="modal-form">
              <div className="input-group">
                <label>Peso Máximo Levantado (kg)</label>
                <input 
                  type="number" 
                  step="0.5"
                  placeholder="Ej. 100" 
                  value={rmValue}
                  onChange={(e) => setRmValue(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Repeticiones Realizadas con ese peso</label>
                <input 
                  type="number" 
                  placeholder="Ej. 1" 
                  value={repsValue}
                  onChange={(e) => setRepsValue(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRmModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">
                  <TrendingUp size={18} style={{marginRight: '0.5rem'}} />
                  Guardar RM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .exercises-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .exercise-card {
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: fade-up 0.3s ease-out;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .exercise-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          border-color: rgba(163, 230, 53, 0.3);
        }

        .exercise-img {
          height: 160px;
          background: rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--border);
        }

        .exercise-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-img {
          color: var(--muted-foreground);
        }

        .exercise-info {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .exercise-info h3 {
          font-size: 1.1rem;
          margin: 0;
        }

        .exercise-info p {
          color: var(--muted-foreground);
          font-size: 0.875rem;
          flex: 1;
        }

        .badge {
          align-self: flex-start;
        }
      `}</style>
    </div>
  );
}
