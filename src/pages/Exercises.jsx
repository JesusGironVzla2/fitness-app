import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Plus, TrendingUp, Sparkles, Pencil, Trash2, Settings } from 'lucide-react';
import '../styles/global.css';

export default function Exercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', targetMuscle: '', description: '', imageUrl: '' });
  const [editExerciseId, setEditExerciseId] = useState(null);
  
  // States para filtros y RM
  const [filterMuscle, setFilterMuscle] = useState('Todos');
  const [showRmModal, setShowRmModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [rmValue, setRmValue] = useState('');
  const [repsValue, setRepsValue] = useState('');
  
  // Muscle Manager State
  const [savedMuscles, setSavedMuscles] = useState(['Pecho', 'Espalda', 'Piernas', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen']);
  const [showMuscleManager, setShowMuscleManager] = useState(false);
  const [newMuscleName, setNewMuscleName] = useState('');
  
  const { currentUser } = useAuth();

  const fetchExercises = async () => {
    try {
      const q = query(collection(db, "exercises"));
      const snap = await getDocs(q);
      setExercises(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMuscles = async () => {
    try {
      const docRef = doc(db, "settings", "muscles");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().list) {
        setSavedMuscles(docSnap.data().list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExercises();
    fetchMuscles();
  }, []);



  const handleSaveExercise = async (e) => {
    e.preventDefault();
    try {
      if (editExerciseId) {
        await updateDoc(doc(db, "exercises", editExerciseId), {
          ...newExercise,
        });
      } else {
        await addDoc(collection(db, "exercises"), {
          ...newExercise,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setNewExercise({ name: '', targetMuscle: '', description: '', imageUrl: '' });
      setEditExerciseId(null);
      fetchExercises();
    } catch (err) {
      console.error("Error saving exercise:", err);
    }
  };

  const handleEditExercise = (e, exercise) => {
    e.stopPropagation();
    setNewExercise({
      name: exercise.name || '',
      targetMuscle: exercise.targetMuscle || '',
      description: exercise.description || '',
      imageUrl: exercise.imageUrl || ''
    });
    setEditExerciseId(exercise.id);
    setShowModal(true);
  };

  const handleDeleteExercise = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este ejercicio?')) {
      try {
        await deleteDoc(doc(db, "exercises", id));
        fetchExercises();
      } catch (err) {
        console.error("Error deleting exercise:", err);
      }
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

  const handleSeedDatabase = async () => {
    const defaultExercises = [
      { name: 'Jalón al pecho', targetMuscle: 'Espalda', description: 'Tira de la barra hacia tu pecho superior, manteniendo la espalda recta.', imageUrl: 'https://media.tenor.com/7H-v500c2A8AAAAC/lat-pulldown-exercise.gif' },
      { name: 'Remo con barra', targetMuscle: 'Espalda', description: 'Inclinado hacia adelante, tira de la barra hacia tu abdomen.', imageUrl: 'https://media.tenor.com/O61G9v9b2eAAAAAC/bent-over-row.gif' },
      { name: 'Press de Banca', targetMuscle: 'Pecho', description: 'Baja la barra hasta el pecho y empuja hacia arriba.', imageUrl: 'https://media.tenor.com/E8e9mE7N9h8AAAAC/bench-press.gif' },
      { name: 'Sentadilla con barra', targetMuscle: 'Piernas', description: 'Baja como si fueras a sentarte en una silla, manteniendo la espalda recta.', imageUrl: 'https://media.tenor.com/QhT83Dk0mBIAAAAC/squats-workout.gif' },
      { name: 'Curl de Bíceps', targetMuscle: 'Bíceps', description: 'Flexiona los codos llevando la barra o mancuernas hacia los hombros.', imageUrl: 'https://media.tenor.com/a9c1B-Y6uDkAAAAC/biceps-curl.gif' }
    ];

    setLoading(true);
    for (const ex of defaultExercises) {
      const exists = exercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase());
      if (!exists) {
        await addDoc(collection(db, "exercises"), { ...ex, createdAt: new Date().toISOString() });
      }
    }
    await fetchExercises();
    alert("¡Ejercicios de prueba cargados con éxito!");
  };

  const dynamicMuscles = Array.from(new Set(exercises.map(ex => ex.targetMuscle)))
    .filter(m => m && !savedMuscles.includes(m));
  const muscleGroups = ['Todos', ...savedMuscles, ...dynamicMuscles];
  
  const handleSaveMuscle = async (e) => {
    e.preventDefault();
    if (!newMuscleName.trim()) return;
    const updatedList = [...savedMuscles, newMuscleName.trim()];
    try {
      await setDoc(doc(db, "settings", "muscles"), { list: updatedList });
      setSavedMuscles(updatedList);
      setNewMuscleName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMuscle = async (m) => {
    const updatedList = savedMuscles.filter(x => x !== m);
    try {
      await setDoc(doc(db, "settings", "muscles"), { list: updatedList });
      setSavedMuscles(updatedList);
    } catch (err) {
      console.error(err);
    }
  };

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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-secondary" 
            style={{ border: '1px solid #ec4899', color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}
            onClick={handleSeedDatabase}
          >
            <Sparkles size={20} />
            <span>Cargar GIFs de Prueba</span>
          </button>
          <button className="btn-primary" onClick={() => {
            setEditExerciseId(null);
            setNewExercise({ name: '', targetMuscle: '', description: '', imageUrl: '' });
            setShowModal(true);
          }}>
            <Plus size={20} />
            <span>Nuevo Ejercicio</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <select 
            value={filterMuscle} 
            onChange={(e) => setFilterMuscle(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              padding: '0.5rem',
              borderRadius: 'var(--radius)',
              outline: 'none',
              minWidth: '150px'
            }}
          >
            {muscleGroups.map(m => (
              <option key={m} value={m} style={{ background: 'var(--background)' }}>{m}</option>
            ))}
          </select>
          <button 
            className="icon-btn" 
            onClick={() => setShowMuscleManager(true)}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', color: 'var(--foreground)' }}
            title="Gestionar Músculos"
          >
            <Settings size={20} />
          </button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{exercise.name}</h3>
                  <div className="exercise-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="icon-btn" 
                      onClick={(e) => handleEditExercise(e, exercise)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.25rem' }}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      className="icon-btn" 
                      onClick={(e) => handleDeleteExercise(e, exercise.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
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
            <h2>{editExerciseId ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h2>
            <form onSubmit={handleSaveExercise} className="modal-form">
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
                  list="muscles-list"
                  type="text" 
                  placeholder="Ej. Pecho" 
                  value={newExercise.targetMuscle}
                  onChange={(e) => setNewExercise({...newExercise, targetMuscle: e.target.value})}
                  required
                />
                <datalist id="muscles-list">
                  {savedMuscles.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
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
                <label>URL de la Imagen/GIF</label>
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

      {showMuscleManager && (
        <div className="modal-overlay">
          <div className="modal glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Gestionar Músculos</h2>
              <button className="icon-btn" onClick={() => setShowMuscleManager(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveMuscle} className="modal-form" style={{ marginBottom: '1rem' }}>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Nuevo grupo muscular..." 
                  value={newMuscleName}
                  onChange={(e) => setNewMuscleName(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Agregar</button>
              </div>
            </form>
            <div className="muscle-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {savedMuscles.map(m => (
                <div key={m} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {m}
                  <button onClick={() => handleDeleteMuscle(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'red' }}><X size={14}/></button>
                </div>
              ))}
            </div>
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
