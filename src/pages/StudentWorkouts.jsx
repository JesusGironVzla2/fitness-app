import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle, MessageSquare, Plus, Dumbbell, ChevronLeft, ChevronRight, Timer, X, Sparkles } from 'lucide-react';
import { getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import '../styles/global.css';

export default function StudentWorkouts() {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generalFeedback, setGeneralFeedback] = useState({});
  const [exerciseFeedback, setExerciseFeedback] = useState({});
  const [completing, setCompleting] = useState(false);
  const { currentUser } = useAuth();

  // Live Workout State
  const [showModal, setShowModal] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState([]);
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', targetMuscle: 'Pecho', description: '', imageUrl: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // AI Generator State
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Timer state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTimer, setSessionTimer] = useState(0);

  // Rest Timer State
  const [restTimer, setRestTimer] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  
  // Plate Calculator State
  const [showPlateCalc, setShowPlateCalc] = useState(null);
  
  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (currentUser) fetchWorkouts();
  }, [currentUser]);

  useEffect(() => {
    let interval;
    if (activeSession) {
      interval = setInterval(() => {
        setSessionTimer(Math.floor((Date.now() - activeSession.startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    let interval;
    if (restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => prev - 1);
      }, 1000);
    } else if (restTimer === 0 && showRestTimer) {
      setShowRestTimer(false);
    }
    return () => clearInterval(interval);
  }, [restTimer, showRestTimer]);

  const startRestTimer = (seconds = 90) => {
    setRestTimer(seconds);
    setShowRestTimer(true);
  };

  const calculatePlates = (totalWeight) => {
    let remaining = (totalWeight - 20) / 2;
    if (remaining <= 0) return [];
    const plates = [20, 10, 5, 2.5, 1.25];
    const result = [];
    for (let p of plates) {
      let count = Math.floor(remaining / p);
      if (count > 0) {
        result.push({ weight: p, count });
        remaining -= count * p;
      }
    }
    return result;
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

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

  const fetchExercises = async () => {
    try {
      const q = query(collection(db, "exercises"));
      const snap = await getDocs(q);
      setExercises(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
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

  const handleCreateLiveWorkout = async (e) => {
    e.preventDefault();
    if (routineExercises.length === 0) {
      alert("Añade al menos un ejercicio.");
      return;
    }

    try {
      // Determinar si es alumno y obtener trainerId
      let finalTrainerId = currentUser.uid;
      let studentName = currentUser.displayName || currentUser.email || "Alumno";
      
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'student' || data.role === 'user') {
          finalTrainerId = data.trainerId || currentUser.uid;
          studentName = data.name || studentName;
        }
      }

      await addDoc(collection(db, "workouts"), {
        studentId: currentUser.uid,
        trainerId: finalTrainerId,
        date: selectedDate,
        name: routineName || `Entrenamiento Libre - ${new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('es-ES')}`,
        exercises: routineExercises,
        createdAt: new Date().toISOString()
      });

      // Enviar notificación al entrenador si fue creado por un alumno
      if (finalTrainerId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          title: "Entrenamiento Libre Registrado",
          message: `${studentName} registró un entrenamiento libre para el ${new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('es-ES')}.`,
          senderId: currentUser.uid,
          senderName: studentName,
          senderRole: 'student',
          targetRole: 'trainer',
          targetUserId: finalTrainerId,
          createdAt: new Date().toISOString()
        });
      }

      setShowModal(false);
      setRoutineExercises([]);
      setRoutineName('');
      fetchWorkouts();
    } catch (err) {
      console.error("Error creating live workout:", err);
    }
  };

  const handleGenerateAILiveWorkout = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        alert("API Key de Gemini no encontrada. Configúrala en .env");
        setIsGenerating(false);
        return;
      }
      
      // Fetch exercises if not loaded
      let currentExercises = exercises;
      if (currentExercises.length === 0) {
        const q = query(collection(db, "exercises"));
        const snap = await getDocs(q);
        currentExercises = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExercises(currentExercises);
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      const responseAPI = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await responseAPI.json();
      const availableModels = data.models ? data.models.map(m => m.name) : [];
      let modelName = "gemini-1.5-flash";
      if (availableModels.length > 0) {
        const flashModel = availableModels.find(m => m.includes("gemini-1.5-flash"));
        const proModel = availableModels.find(m => m.includes("gemini-1.5-pro") || m.includes("gemini-pro"));
        const fallback = availableModels.find(m => m.includes("gemini"));
        const selected = flashModel || proModel || fallback || "models/gemini-1.5-flash";
        modelName = selected.replace("models/", "");
      }
      const model = genAI.getGenerativeModel({ model: modelName });

      const exercisesList = currentExercises.map(ex => `${ex.id}: ${ex.name} (${ex.targetMuscle})`).join('\n');
      
      const prompt = `Eres un experto entrenador personal. El usuario pide: "${aiPrompt}".
Basado en los siguientes ejercicios disponibles:
${exercisesList}

Crea una rutina óptima. Devuelve SOLO un objeto JSON con este formato exacto (sin markdown, sin explicaciones):
{
  "name": "Nombre de la rutina sugerida",
  "exercises": [
    {
      "exerciseId": "ID_DEL_EJERCICIO",
      "name": "Nombre del Ejercicio",
      "sets": 4,
      "reps": 12
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const aiRoutine = JSON.parse(text);

      let finalTrainerId = currentUser.uid;
      let studentName = currentUser.displayName || currentUser.email || "Alumno";
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === 'student' || data.role === 'user') {
          finalTrainerId = data.trainerId || currentUser.uid;
          studentName = data.name || studentName;
        }
      }

      await addDoc(collection(db, "workouts"), {
        studentId: currentUser.uid,
        trainerId: finalTrainerId,
        date: selectedDate,
        name: aiRoutine.name || `Rutina AI - ${new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('es-ES')}`,
        exercises: aiRoutine.exercises,
        createdAt: new Date().toISOString(),
        aiGenerated: true
      });

      setShowAIGeneratorModal(false);
      setAiPrompt("");
      fetchWorkouts();
    } catch (err) {
      console.error("Error generating AI workout:", err);
      alert("Hubo un error generando la rutina. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
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

  const muscleGroups = ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen'];
  const filteredExercises = selectedMuscles.length === 0 
    ? exercises 
    : exercises.filter(ex => selectedMuscles.some(m => ex.targetMuscle?.toLowerCase().includes(m.toLowerCase())));

  const handleCompleteWorkout = async (routine) => {
    try {
      setCompleting(true);
      const workoutId = routine.id;
      const workoutRef = doc(db, "workouts", workoutId);
      
      const exData = exerciseFeedback[workoutId] || {};
      
      let finalDuration = routine.duration || 0;
      if (activeSession && activeSession.workoutId === workoutId) {
        finalDuration += sessionTimer;
        setActiveSession(null);
      }
      
      // Update the workout document
      await updateDoc(workoutRef, {
        completed: true,
        feedback: generalFeedback[workoutId] || '',
        actualData: exData,
        duration: finalDuration,
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

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarMonth);
  
  const calendarGrid = [];
  let dayCounter = 1;
  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDay) {
        week.push(null);
      } else if (dayCounter <= daysInMonth) {
        week.push(dayCounter);
        dayCounter++;
      } else {
        week.push(null);
      }
    }
    calendarGrid.push(week);
    if (dayCounter > daysInMonth) break;
  }
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="workouts-page" style={{ position: 'relative' }}>
      
      {/* Floating Rest Timer */}
      {showRestTimer && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--primary)', color: 'black', padding: '1rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 50 }}>
          <Timer size={24} />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{formatTime(restTimer)}</span>
          <button onClick={() => { setShowRestTimer(false); setRestTimer(0); }} style={{ background: 'transparent', border: 'none', color: 'black', cursor: 'pointer', marginLeft: '0.5rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Mis Rutinas</h1>
          <p>Tu plan de entrenamiento semanal asignado por tu entrenador.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => { fetchExercises(); setShowAIGeneratorModal(true); }} style={{ borderColor: '#a855f7', color: '#a855f7' }}>
            <Sparkles size={20} />
            <span>Generar con AI</span>
          </button>
          <button className="btn-primary" onClick={() => { fetchExercises(); setShowModal(true); }}>
            <Plus size={20} />
            <span>Entrenamiento Libre</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando tu plan...</p>
      ) : (
        <>
          <div className="calendar-container glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button className="btn-secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
              <h3 style={{ margin: 0, color: 'white', textTransform: 'capitalize' }}>{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h3>
              <button className="btn-secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', fontWeight: 'bold' }}>{day}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {calendarGrid.map((week, i) => (
                <React.Fragment key={i}>
                  {week.map((day, j) => {
                    if (!day) return <div key={j} />;
                    
                    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasRoutine = routines.some(r => r.date === dateStr);
                    const isSelected = calendarSelectedDate === dateStr;
                    
                    return (
                      <div 
                        key={j} 
                        onClick={() => setCalendarSelectedDate(dateStr)}
                        style={{ 
                          aspectRatio: '1', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: isSelected ? 'var(--primary)' : (hasRoutine ? 'rgba(163, 230, 53, 0.1)' : 'rgba(255,255,255,0.02)'),
                          color: isSelected ? 'var(--primary-foreground)' : (hasRoutine ? 'var(--primary)' : 'white'),
                          border: hasRoutine && !isSelected ? '1px solid rgba(163, 230, 53, 0.3)' : '1px solid transparent',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          position: 'relative',
                          fontWeight: isSelected || hasRoutine ? 'bold' : 'normal'
                        }}
                      >
                        {day}
                        {hasRoutine && <div style={{ position: 'absolute', bottom: '4px', width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? 'var(--primary-foreground)' : 'var(--primary)' }} />}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="selected-date-routines">
            <h3 style={{ marginBottom: '1.5rem', color: 'white', textTransform: 'capitalize' }}>
              Entrenamientos del {formatDate(calendarSelectedDate)}
            </h3>
            <div className="grid">
              {routines.filter(r => r.date === calendarSelectedDate).length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }}>No hay entrenamientos asignados para este día.</p>
              ) : (
                routines.filter(r => r.date === calendarSelectedDate).map((routine) => (
                  <div key={routine.id} className="glass active-day" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="var(--primary)" />
                        <h4 style={{ margin: 0, color: 'white', textTransform: 'capitalize' }}>{routine.name}</h4>
                      </div>
                      
                      {!routine.completed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {activeSession && activeSession.workoutId === routine.id ? (
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem', padding: '0.25rem 0.5rem', background: 'rgba(163, 230, 53, 0.1)', borderRadius: '4px' }}>
                              ⏱ {formatTime(sessionTimer)}
                            </span>
                          ) : (
                            <button 
                              type="button"
                              className="badge" 
                              style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                              onClick={() => setActiveSession({ workoutId: routine.id, startTime: Date.now() })}
                            >
                              ▶ Iniciar Sesión
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {routine.exercises.map((ex, i) => {
                          const exActualData = (routine.actualData && routine.actualData[i]) || {};
                          const fb = (exerciseFeedback[routine.id] || {})[i] || {};
                          const isCompleted = routine.completed;
                          
                          const repsRaw = fb.reps !== undefined ? fb.reps : (exActualData.reps || `${ex.sets}x${ex.reps}`);
                          const [sStr, rStr] = String(repsRaw).split('x');
                          const currentSeries = parseInt(sStr) || ex.sets || 0;
                          const currentReps = parseInt(rStr) || ex.reps || 0;
                          const currentWeight = parseFloat(fb.weight !== undefined ? fb.weight : (exActualData.weight || 0));
                          
                          const note = fb.note !== undefined ? fb.note : (exActualData.note || '');
                          const done = fb.done !== undefined ? fb.done : (exActualData.done || false);
                          
                          const handleSeriesChange = (val) => {
                            const newVal = Math.max(0, currentSeries + val);
                            handleExerciseChange(routine.id, i, 'reps', `${newVal}x${currentReps}`);
                          };
                          const handleRepsChange = (val) => {
                            const newVal = Math.max(0, currentReps + val);
                            handleExerciseChange(routine.id, i, 'reps', `${currentSeries}x${newVal}`);
                          };
                          const handleWeightChange = (val) => {
                            const newVal = Math.max(0, currentWeight + val);
                            handleExerciseChange(routine.id, i, 'weight', newVal);
                          };
                          
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
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1.25rem' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                  <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.5rem' }}>Series</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <button type="button" onClick={() => handleSeriesChange(-1)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                                      <span style={{ padding: '0.5rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{currentSeries}</span>
                                      <button type="button" onClick={() => { handleSeriesChange(1); startRestTimer(90); }} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.5rem' }}>Reps</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <button type="button" onClick={() => handleRepsChange(-1)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                                      <span style={{ padding: '0.5rem', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{currentReps}</span>
                                      <button type="button" onClick={() => handleRepsChange(1)} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.5rem' }}>RIR</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <select 
                                        value={fb.rir !== undefined ? fb.rir : (exActualData.rir || '2')}
                                        onChange={(e) => handleExerciseChange(routine.id, i, 'rir', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', color: 'white', border: 'none', textAlign: 'center', fontWeight: 'bold', appearance: 'none', cursor: 'pointer' }}
                                      >
                                        <option value="0" style={{color: 'black'}}>0</option>
                                        <option value="1" style={{color: 'black'}}>1</option>
                                        <option value="2" style={{color: 'black'}}>2</option>
                                        <option value="3" style={{color: 'black'}}>3</option>
                                        <option value="4" style={{color: 'black'}}>4</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span>Peso (kg)</span>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const valKg = Math.round((currentWeight / 2.20462) * 10) / 10;
                                          handleExerciseChange(routine.id, i, 'weight', valKg);
                                        }} 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0, fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                                        title="Convertir el valor actual de Libras a Kilos"
                                      >
                                        LBS → KG
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => setShowPlateCalc(showPlateCalc === `${routine.id}-${i}` ? null : `${routine.id}-${i}`)} 
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                      >
                                        <Dumbbell size={14}/> Discos
                                      </button>
                                    </div>
                                  </label>
                                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button type="button" onClick={() => handleWeightChange(-5)} style={{ flex: 1, padding: '0.6rem 0.25rem', background: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontWeight: 'bold', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.05)' }}>-5</button>
                                    <button type="button" onClick={() => handleWeightChange(-1)} style={{ flex: 1, padding: '0.6rem 0.25rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>-1</button>
                                    <input 
                                      type="number"
                                      value={currentWeight || ''}
                                      onChange={(e) => handleExerciseChange(routine.id, i, 'weight', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                      style={{ padding: '0.5rem', fontWeight: 'bold', width: '60px', textAlign: 'center', fontSize: '1.1rem', background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                                    />
                                    <button type="button" onClick={() => handleWeightChange(1)} style={{ flex: 1, padding: '0.6rem 0.25rem', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>+1</button>
                                    <button type="button" onClick={() => handleWeightChange(5)} style={{ flex: 1, padding: '0.6rem 0.25rem', background: 'transparent', border: 'none', color: 'var(--muted-foreground)', fontWeight: 'bold', cursor: 'pointer', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>+5</button>
                                  </div>
                                  
                                  {showPlateCalc === `${routine.id}-${i}` && (
                                    <div style={{ marginTop: '0.75rem', background: 'rgba(163, 230, 53, 0.1)', border: '1px solid rgba(163, 230, 53, 0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontWeight: 'bold' }}>Armar barra de 20kg ({currentWeight}kg total):</p>
                                      {currentWeight <= 20 ? (
                                        <span style={{ color: 'var(--muted-foreground)' }}>Solo la barra.</span>
                                      ) : calculatePlates(currentWeight).length === 0 ? (
                                        <span style={{ color: 'var(--muted-foreground)' }}>Peso inválido para discos estandar.</span>
                                      ) : (
                                        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'white' }}>
                                          {calculatePlates(currentWeight).map((p, idx) => (
                                            <li key={idx}><strong>{p.count}</strong> disco(s) de <strong>{p.weight}kg</strong> por lado</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div>
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
                            {completing ? 'Guardando...' : (routine.completed ? 'Actualizar Progreso de Rutina' : (activeSession && activeSession.workoutId === routine.id ? '⏹ Finalizar Entrenamiento' : 'Marcar Rutina como Completada'))}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .active-day {
          border: 1px solid rgba(163, 230, 53, 0.3);
        }
      `}</style>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass" style={{maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'}}>
            <h2>Entrenamiento Libre</h2>
            <p className="modal-subtitle">Crea una rutina rápida para entrenar ahora mismo o registrar un día pasado.</p>
            <form onSubmit={handleCreateLiveWorkout} className="modal-form">
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Fecha</label>
                  <input 
                    type="date" 
                    className="input-field"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Nombre (Opcional)</label>
                  <input 
                    type="text" 
                    className="input-field"
                    placeholder={`Libre`}
                    value={routineName}
                    onChange={(e) => setRoutineName(e.target.value)}
                  />
                </div>
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
                Filtra por músculo y marca los ejercicios que vas a hacer.
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
                        cursor: 'pointer', border: 'none', fontSize: '0.8rem', padding: '0.4rem 0.8rem',
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
                              type="number" min="1" className="input-field" 
                              style={{ width: '60px', padding: '0.25rem 0.5rem' }} 
                              value={ex.sets} onChange={(e) => handleUpdateRoutineExercise(i, 'sets', e.target.value)}
                            />
                          </div>
                          <span style={{ color: 'var(--muted-foreground)' }}>x</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Reps:</label>
                            <input 
                              type="number" min="1" className="input-field" 
                              style={{ width: '60px', padding: '0.25rem 0.5rem' }} 
                              value={ex.reps} onChange={(e) => handleUpdateRoutineExercise(i, 'reps', e.target.value)}
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
                <button type="submit" className="btn-primary">Comenzar Entrenamiento</button>
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

      {showAIGeneratorModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal glass" style={{ border: '1px solid rgba(168, 85, 247, 0.5)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7' }}>
              <Sparkles size={24} />
              Entrenador AI
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Dile a la inteligencia artificial qué tipo de rutina necesitas hoy y te la generará en segundos, basada en los ejercicios de tu gimnasio.
            </p>
            <form onSubmit={handleGenerateAILiveWorkout} className="modal-form">
              <div className="input-group">
                <label>¿Qué necesitas?</label>
                <textarea 
                  className="input-field"
                  placeholder="Ej: Tengo 30 minutos, quiero hacer pecho y tríceps enfocado en volumen. No quiero usar mancuernas hoy." 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows="4"
                  required
                  disabled={isGenerating}
                />
              </div>
              <div className="input-group">
                <label>Fecha de la Rutina</label>
                <input 
                  type="date" 
                  className="input-field"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  disabled={isGenerating}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAIGeneratorModal(false)} disabled={isGenerating}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#a855f7', color: 'white' }} disabled={isGenerating}>
                  {isGenerating ? 'Creando Magia...' : 'Generar Rutina ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
