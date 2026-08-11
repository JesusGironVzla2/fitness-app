import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Key, Activity, TrendingUp, ClipboardList, UserSquare2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    trainingType: 'remoto',
    age: '',
    gender: 'masculino',
    phone: '',
    address: '',
    weight: '',
    height: ''
  });
  const [actionError, setActionError] = useState('');
  
  // States for viewing progress
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState([]);
  const [selectedStudentWorkouts, setSelectedStudentWorkouts] = useState([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [showWorkoutsModal, setShowWorkoutsModal] = useState(false);
  
  // States for measures
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metricData, setMetricData] = useState({ weight: '', fat: '' });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // States for student profile
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  
  const { currentUser, userRole, impersonate } = useAuth();

  const handleSaveMetrics = async (e) => {
    e.preventDefault();
    try {
      if (metricData.weight) {
        await addDoc(collection(db, "progress_logs"), {
          studentId: selectedStudentId,
          type: 'Medida',
          metric: 'Peso Corporal',
          value: metricData.weight,
          unit: 'kg',
          createdAt: new Date().toISOString()
        });
      }
      if (metricData.fat) {
        await addDoc(collection(db, "progress_logs"), {
          studentId: selectedStudentId,
          type: 'Medida',
          metric: '% Grasa',
          value: metricData.fat,
          unit: '%',
          createdAt: new Date().toISOString()
        });
      }
      setShowMetricsModal(false);
      setMetricData({ weight: '', fat: '' });
    } catch (err) {
      console.error("Error saving metrics:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStudents();
    }
  }, [currentUser]);

  const fetchStudents = async () => {
    try {
      const q = query(
        collection(db, "users"), 
        where("role", "==", "student"),
        where("trainerId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => s.status !== 'deleted');
      setStudents(studentsData);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudent.email, newStudent.password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newStudent.email,
        name: newStudent.name,
        role: 'student',
        status: 'active',
        trainerId: currentUser.uid,
        trainingType: newStudent.trainingType,
        age: newStudent.age,
        gender: newStudent.gender,
        phone: newStudent.phone,
        address: newStudent.address,
        weight: newStudent.weight,
        height: newStudent.height,
        createdAt: new Date().toISOString()
      });

      if (newStudent.weight) {
        await addDoc(collection(db, "progress_logs"), {
          studentId: userCredential.user.uid,
          type: 'Medida',
          metric: 'Peso Corporal',
          value: newStudent.weight,
          unit: 'kg',
          createdAt: new Date().toISOString()
        });
      }

      await secondaryAuth.signOut();

      setShowModal(false);
      setNewStudent({ 
        email: '', password: '', name: '', trainingType: 'remoto', 
        age: '', gender: 'masculino', phone: '', address: '', weight: '', height: '' 
      });
      fetchStudents();

    } catch (err) {
      console.error("Error creating student:", err);
      setActionError(err.message);
    }
  };

  const handleUpdateStatus = async (studentId, newStatus) => {
    if (newStatus === 'deleted' && !window.confirm("¿Seguro que deseas eliminar a este alumno?")) return;
    
    try {
      await updateDoc(doc(db, "users", studentId), { status: newStatus });
      fetchStudents();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", editStudent.id), {
        name: editStudent.name,
        phone: editStudent.phone || '',
        address: editStudent.address || '',
        age: editStudent.age || '',
        gender: editStudent.gender || 'masculino',
        weight: editStudent.weight || '',
        height: editStudent.height || '',
        trainingType: editStudent.trainingType || 'remoto'
      });
      setShowProfileModal(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error updating student:", err);
    }
  };

  const handleDeleteStudent = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${editStudent.name}? Esto no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, "users", editStudent.id));
      setShowProfileModal(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error deleting student:", err);
    }
  };

  const handleViewProgress = async (student) => {
    setSelectedStudentName(student.name);
    setShowProgressModal(true);
    setLoadingProgress(true);
    setSelectedStudentProgress([]);
    
    try {
      const q = query(
        collection(db, "progress_logs"),
        where("studentId", "==", student.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setSelectedStudentProgress(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleViewWorkouts = async (student) => {
    setSelectedStudentName(student.name);
    setShowWorkoutsModal(true);
    setLoadingProgress(true);
    setSelectedStudentWorkouts([]);
    
    try {
      const q = query(
        collection(db, "workouts"),
        where("studentId", "==", student.id),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      setSelectedStudentWorkouts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching workouts:", err);
    } finally {
      setLoadingProgress(false);
    }
  };

  return (
    <div className="trainers-page">
      <div className="page-header">
        <div>
          <h1>Mis Alumnos</h1>
          <p>Gestiona a tus alumnos, revisa su progreso y asígnales rutinas.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={20} />
          <span>Registrar Alumno</span>
        </button>
      </div>

      <div className="trainers-list">
        {loading ? (
          <p>Cargando alumnos...</p>
        ) : students.length === 0 ? (
          <div className="empty-state glass">
            <Activity size={48} color="var(--muted-foreground)" />
            <h3>Aún no tienes alumnos</h3>
            <p>Registra a tu primer alumno para comenzar a entrenarlo.</p>
          </div>
        ) : (
          <div className="grid">
            {students.map(student => (
              <div key={student.id} className="trainer-card glass">
                <div className="trainer-header">
                  <div className="avatar" style={{backgroundColor: '#3b82f6'}}>{student.name ? student.name.charAt(0).toUpperCase() : 'A'}</div>
                  <div>
                    <h3>{student.name || 'Sin Nombre'}</h3>
                    <p>{student.email}</p>
                  </div>
                </div>
                <div className="trainer-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="badge" style={{color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)'}}>Alumno</span>
                  <span className={`badge ${student.status === 'suspended' ? 'suspended' : ''}`}>
                    {student.status === 'suspended' ? 'Suspendido' : 'Activo'}
                  </span>
                  <span className="date">Registrado el {new Date(student.createdAt).toLocaleDateString()}</span>
                  
                  <div className="student-actions">
                    <button className="btn-secondary" onClick={() => { setEditStudent(student); setShowProfileModal(true); }}>
                      <UserPlus size={16} style={{marginRight: '0.5rem'}} />
                      Perfil
                    </button>
                    <button className="btn-secondary" onClick={() => handleViewProgress(student)}>
                      <TrendingUp size={16} style={{marginRight: '0.5rem'}} />
                      Progreso
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/rutinas?student=${student.id}`)}>
                      <ClipboardList size={16} style={{marginRight: '0.5rem'}} />
                      Rutinas
                    </button>
                    <button className="btn-secondary" onClick={() => { setSelectedStudentId(student.id); setSelectedStudentName(student.name); setShowMetricsModal(true); }}>
                      <Activity size={16} style={{marginRight: '0.5rem'}} />
                      Medidas
                    </button>
                    
                    {userRole === 'admin' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                        <button className="btn-secondary" onClick={() => { impersonate(student); navigate('/'); }}>Entrar</button>
                        <button 
                          className="btn-secondary" 
                          style={{ color: student.status === 'suspended' ? 'var(--primary)' : 'var(--destructive)', borderColor: student.status === 'suspended' ? 'var(--primary)' : 'var(--destructive)' }}
                          onClick={() => handleUpdateStatus(student.id, student.status === 'suspended' ? 'active' : 'suspended')}
                        >
                          {student.status === 'suspended' ? 'Activar' : 'Suspender'}
                        </button>
                        <button className="text-btn" style={{ gridColumn: 'span 2', color: 'var(--muted-foreground)', padding: '0.5rem' }} onClick={() => handleUpdateStatus(student.id, 'deleted')}>Eliminar</button>
                      </div>
                    )}

                    {userRole === 'trainer' && (
                      <button className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => { impersonate(student); navigate('/'); }}>
                        Ver Panel del Alumno
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Nuevo Alumno</h2>
            <p className="modal-subtitle">Crea una cuenta para que tu alumno pueda acceder a la app.</p>
            
            {actionError && <div className="error-message">{actionError}</div>}

            <form onSubmit={handleCreateStudent} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nombre Completo</label>
                  <div className="input-with-icon">
                    <input type="text" placeholder="Ej. Juan Pérez" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} required/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Correo Electrónico</label>
                  <div className="input-with-icon">
                    <Mail size={18} />
                    <input type="email" placeholder="juan@ejemplo.com" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} required/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Contraseña Inicial</label>
                  <div className="input-with-icon">
                    <Key size={18} />
                    <input type="password" placeholder="Mínimo 6 caracteres" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} required minLength="6"/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Teléfono</label>
                  <div className="input-with-icon">
                    <input type="text" placeholder="Ej. +34 600 000 000" value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Dirección</label>
                  <div className="input-with-icon">
                    <input type="text" placeholder="Ej. Calle Principal 123, Ciudad" value={newStudent.address} onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Edad</label>
                  <div className="input-with-icon">
                    <input type="number" placeholder="Ej. 25" value={newStudent.age} onChange={(e) => setNewStudent({...newStudent, age: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Sexo</label>
                  <select value={newStudent.gender} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', width: '100%' }}>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Estatura (cm)</label>
                  <div className="input-with-icon">
                    <input type="number" placeholder="Ej. 175" value={newStudent.height} onChange={(e) => setNewStudent({...newStudent, height: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Peso Actual (kg)</label>
                  <div className="input-with-icon">
                    <input type="number" step="0.1" placeholder="Ej. 75.5" value={newStudent.weight} onChange={(e) => setNewStudent({...newStudent, weight: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Modalidad de Entrenamiento</label>
                  <select value={newStudent.trainingType} onChange={(e) => setNewStudent({...newStudent, trainingType: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', width: '100%' }}>
                    <option value="remoto">Remoto</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Alumno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && editStudent && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Perfil del Alumno</h2>
            <p className="modal-subtitle">Revisa o actualiza los datos de {editStudent.name}.</p>
            
            <form onSubmit={handleUpdateStudent} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nombre Completo</label>
                  <div className="input-with-icon">
                    <input type="text" value={editStudent.name} onChange={(e) => setEditStudent({...editStudent, name: e.target.value})} required/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Teléfono</label>
                  <div className="input-with-icon">
                    <input type="text" value={editStudent.phone || ''} onChange={(e) => setEditStudent({...editStudent, phone: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Dirección</label>
                  <div className="input-with-icon">
                    <input type="text" value={editStudent.address || ''} onChange={(e) => setEditStudent({...editStudent, address: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Edad</label>
                  <div className="input-with-icon">
                    <input type="number" value={editStudent.age || ''} onChange={(e) => setEditStudent({...editStudent, age: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Sexo</label>
                  <select value={editStudent.gender || 'masculino'} onChange={(e) => setEditStudent({...editStudent, gender: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', width: '100%' }}>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Estatura (cm)</label>
                  <div className="input-with-icon">
                    <input type="number" value={editStudent.height || ''} onChange={(e) => setEditStudent({...editStudent, height: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group">
                  <label>Peso Actual (kg)</label>
                  <div className="input-with-icon">
                    <input type="number" step="0.1" value={editStudent.weight || ''} onChange={(e) => setEditStudent({...editStudent, weight: e.target.value})}/>
                  </div>
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Modalidad</label>
                  <select value={editStudent.trainingType || 'remoto'} onChange={(e) => setEditStudent({...editStudent, trainingType: e.target.value})} style={{ padding: '0.75rem', borderRadius: 'var(--radius)', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', width: '100%' }}>
                    <option value="remoto">Remoto</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn-secondary" style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }} onClick={handleDeleteStudent}>
                  Eliminar Alumno
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => { setShowProfileModal(false); setEditStudent(null); }}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Cambios</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMetricsModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Registrar Medidas</h2>
            <p className="modal-subtitle">Actualiza las medidas corporales de {selectedStudentName}.</p>
            
            <form onSubmit={handleSaveMetrics} className="modal-form">
              <div className="input-group">
                <label>Peso Corporal (kg)</label>
                <div className="input-with-icon">
                  <input type="number" step="0.1" placeholder="Ej. 75.5" value={metricData.weight} onChange={(e) => setMetricData({...metricData, weight: e.target.value})}/>
                </div>
              </div>

              <div className="input-group">
                <label>Porcentaje de Grasa (%)</label>
                <div className="input-with-icon">
                  <input type="number" step="0.1" placeholder="Ej. 15.2" value={metricData.fat} onChange={(e) => setMetricData({...metricData, fat: e.target.value})}/>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowMetricsModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Medidas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProgressModal && (
        <div className="modal-overlay">
          <div className="modal glass" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Progreso de {selectedStudentName}</h2>
            <p className="modal-subtitle">Historial de registros, medidas y RMs.</p>
            
            <div className="progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {loadingProgress ? (
                <p>Cargando registros...</p>
              ) : selectedStudentProgress.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted-foreground)' }}>
                  <Activity size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Este alumno aún no ha registrado progreso.</p>
                </div>
              ) : (
                selectedStudentProgress.map(log => (
                  <div key={log.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="badge" style={{ background: log.type === 'RM' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: log.type === 'RM' ? '#ef4444' : '#3b82f6' }}>
                        {log.type}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'white' }}>{log.exerciseOrBodyPart}</h4>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {log.value} {log.unit}
                    </div>
                    {log.notes && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>"{log.notes}"</p>}
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowProgressModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showWorkoutsModal && (
        <div className="modal-overlay">
          <div className="modal glass" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Rutinas de {selectedStudentName}</h2>
            <p className="modal-subtitle">Historial de rutinas y notas de feedback.</p>
            
            <div className="progress-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {loadingProgress ? (
                <p>Cargando rutinas...</p>
              ) : selectedStudentWorkouts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted-foreground)' }}>
                  <Activity size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Este alumno no tiene rutinas asignadas.</p>
                </div>
              ) : (
                selectedStudentWorkouts.map(workout => (
                  <div key={workout.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, color: 'white' }}>{workout.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                        {workout.date}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <span className="badge" style={{ background: workout.completed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: workout.completed ? '#10b981' : '#f59e0b' }}>
                        {workout.completed ? 'Completada' : 'Pendiente'}
                      </span>
                    </div>

                    {workout.exercises && workout.exercises.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Ejercicios:</strong>
                        {workout.exercises.map((ex, i) => {
                          const exData = (workout.actualData && workout.actualData[i]) || {};
                          const hasExData = exData.reps || exData.weight || exData.note;
                          
                          return (
                            <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', borderLeft: '2px solid var(--primary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: '500' }}>{ex.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Meta: {ex.sets}x{ex.reps}</span>
                              </div>
                              {hasExData && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
                                  {(exData.reps || exData.weight) && (
                                    <div style={{ marginBottom: '0.25rem' }}>
                                      <span style={{ color: '#10b981' }}>Logró:</span> {exData.reps || '-'} {exData.weight ? ` | ${exData.weight}kg` : ''}
                                    </div>
                                  )}
                                  {exData.note && (
                                    <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                                      "{exData.note}"
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {workout.feedback && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground)' }}>
                          <strong>Nota General:</strong><br/>
                          "{workout.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowWorkoutsModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .date {
          font-size: 0.8rem;
          color: var(--muted-foreground);
        }

        .badge.suspended {
          background: rgba(239, 68, 68, 0.1);
          color: var(--destructive);
        }

        .text-btn {
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .text-btn:hover {
          color: var(--destructive) !important;
        }

        .btn-text {
          background: transparent;
          border: none;
          color: var(--foreground);
          font-weight: 500;
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius);
          transition: background 0.2s;
        }
        .btn-text:hover {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}
