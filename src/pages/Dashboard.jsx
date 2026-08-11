import React, { useState, useEffect } from 'react';
import { Users, Activity, TrendingUp, Dumbbell, ClipboardList, CheckCircle, Scale, Droplets } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  const { userRole, currentUser } = useAuth();
  const [studentCount, setStudentCount] = useState(0);
  
  // Data for charts
  const [rmLogs, setRmLogs] = useState([]);
  const [metricLogs, setMetricLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [exercisesLib, setExercisesLib] = useState({});
  const [studentStats, setStudentStats] = useState({ weight: '-', fat: '-', rms: 0 });

  // UI state
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartMode, setChartMode] = useState('rm'); // 'rm', 'weight', 'fat'

  useEffect(() => {
    if (userRole === 'trainer' && currentUser) {
      const fetchStats = async () => {
        try {
          const q = query(collection(db, "users"), where("role", "==", "student"), where("trainerId", "==", currentUser.uid));
          const snap = await getDocs(q);
          setStudentCount(snap.size);
        } catch (error) {
          console.error(error);
        }
      };
      fetchStats();
    }
    
    if (currentUser) {
      const fetchLogs = async () => {
        try {
          const q = query(collection(db, "progress_logs"), where("studentId", "==", currentUser.uid));
          const snap = await getDocs(q);
          const logs = snap.docs.map(doc => doc.data()).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
          
          const rms = logs.filter(l => l.type === 'RM');
          setRmLogs(rms);
          
          const metrics = logs.filter(l => l.type === 'Medida');
          setMetricLogs(metrics);

          if (userRole === 'student') {
            const qW = query(collection(db, "workouts"), where("studentId", "==", currentUser.uid));
            const snapW = await getDocs(qW);
            setWorkouts(snapW.docs.map(d => d.data()));

            const qE = query(collection(db, "exercises"));
            const snapE = await getDocs(qE);
            const exMap = {};
            snapE.docs.forEach(doc => {
              exMap[doc.id] = doc.data().muscle;
            });
            setExercisesLib(exMap);
            
            const lastWeight = metrics.filter(m => m.metric === 'Peso Corporal').pop();
            const lastFat = metrics.filter(m => m.metric === '% Grasa').pop();
            
            setStudentStats({
              weight: lastWeight ? `${lastWeight.value} kg` : '-',
              fat: lastFat ? `${lastFat.value} %` : '-',
              rms: rms.length
            });
          }
          
          if (rms.length > 0) {
            const uniqueExercises = [...new Set(rms.map(l => l.exerciseOrBodyPart))];
            setSelectedExercise(uniqueExercises[0]);
          }
        } catch(e) {}
      };
      fetchLogs();
    }
  }, [userRole, currentUser]);

  const uniqueExercises = [...new Set(rmLogs.map(l => l.exerciseOrBodyPart))];

  const renderChart = (dataset, labelSuffix) => {
    if (!dataset || dataset.length === 0) {
      return <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'var(--muted-foreground)'}}>No hay datos registrados aún.</div>;
    }
    
    const maxVal = Math.max(...dataset.map(l => parseFloat(l.value))) || 100;
    const minVal = Math.min(...dataset.map(l => parseFloat(l.value))) || 0;
    
    const points = dataset.map((log, index) => {
      const x = (index / (dataset.length === 1 ? 1 : dataset.length - 1)) * 100;
      const range = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal);
      const y = 100 - (((parseFloat(log.value) - minVal) / range) * 80 + 10);
      return `${x},${y}`;
    }).join(" ");

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', padding: '1rem 0' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <polyline 
            fill="none" 
            stroke="var(--primary)" 
            strokeWidth="3" 
            points={points} 
            strokeLinejoin="round" 
            strokeLinecap="round"
          />
          {dataset.map((log, index) => {
             const x = (index / (dataset.length === 1 ? 1 : dataset.length - 1)) * 100;
             const range = (maxVal - minVal) === 0 ? 1 : (maxVal - minVal);
             const y = 100 - (((parseFloat(log.value) - minVal) / range) * 80 + 10);
             return (
               <g key={index}>
                 <circle cx={x} cy={y} r="4" fill="var(--background)" stroke="var(--primary)" strokeWidth="2" />
                 <text x={x} y={y - 8} fill="var(--foreground)" fontSize="5" textAnchor="middle" fontWeight="bold">
                   {log.value}{labelSuffix}
                 </text>
               </g>
             )
          })}
        </svg>
      </div>
    );
  };

  const renderMuscleBreakdown = () => {
    const muscleCounts = {};
    workouts.filter(w => w.completed).forEach(w => {
      if (w.exercises) {
        w.exercises.forEach(ex => {
          const muscle = exercisesLib[ex.exerciseId] || 'Otros';
          muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
        });
      }
    });

    const entries = Object.entries(muscleCounts).sort((a,b) => b[1] - a[1]);

    if (entries.length === 0) {
      return <div style={{color:'var(--muted-foreground)', marginTop: '1rem'}}>Completa rutinas para ver tus estadísticas musculares.</div>;
    }

    const maxCount = Math.max(...entries.map(e => e[1]));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        {entries.map(([muscle, count]) => (
          <div key={muscle} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '80px', fontSize: '0.85rem', fontWeight: '500' }}>{muscle}</span>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(count / maxCount) * 100}%`, background: 'var(--primary)', height: '100%', borderRadius: '4px' }}></div>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', width: '30px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
          </div>
        ))}
      </div>
    );
  };

  const adminStats = [
    { title: 'Entrenadores Activos', value: '12', icon: Users, color: 'var(--primary)' },
    { title: 'Alumnos Totales', value: '148', icon: Activity, color: '#3b82f6' },
    { title: 'Rutinas Creadas', value: '356', icon: Dumbbell, color: '#a855f7' },
    { title: 'Crecimiento', value: '+24%', icon: TrendingUp, color: '#10b981' },
  ];

  const trainerStats = [
    { title: 'Mis Alumnos', value: studentCount.toString(), icon: Users, color: 'var(--primary)' },
    { title: 'Rutinas Asignadas', value: '24', icon: ClipboardList, color: '#3b82f6' },
    { title: 'Sesiones Completadas', value: '156', icon: CheckCircle, color: '#10b981' },
    { title: 'Retención', value: '92%', icon: TrendingUp, color: '#a855f7' },
  ];

  const studentStatsArray = [
    { title: 'Peso Corporal', value: studentStats.weight, icon: Scale, color: 'var(--primary)' },
    { title: '% Grasa', value: studentStats.fat, icon: Droplets, color: '#3b82f6' },
    { title: 'RMs Registrados', value: studentStats.rms.toString(), icon: Dumbbell, color: '#a855f7' },
  ];

  const displayStats = userRole === 'student' ? studentStatsArray : (userRole === 'trainer' ? trainerStats : adminStats);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{userRole === 'trainer' ? 'Resumen de Entrenamientos' : userRole === 'student' ? 'Mi Progreso Físico' : 'Resumen General'}</h1>
        <p>{userRole === 'trainer' ? 'Métricas de tus alumnos y rendimiento.' : userRole === 'student' ? 'Revisa tu evolución de fuerza y medidas corporales.' : 'Estadísticas y actividad reciente de la plataforma.'}</p>
      </div>

      <div className="stats-grid">
        {displayStats.map((stat, i) => (
          <div key={i} className="stat-card glass" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {userRole === 'admin' && (
        <button 
          className="btn-secondary"
          style={{ width: 'fit-content', margin: '0 auto' }}
          onClick={async () => {
            if (!window.confirm("¿Inyectar datos de prueba en el primer alumno?")) return;
            const { addDoc } = await import('firebase/firestore');
            const q = query(collection(db, "users"), where("role", "==", "student"));
            const snap = await getDocs(q);
            if (snap.empty) return alert("No hay alumnos.");
            const studentId = snap.docs[0].id;
            
            const now = new Date();
            
            // Seed Weight
            for(let i=0; i<5; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - (30 - i*7));
              await addDoc(collection(db, "progress_logs"), {
                studentId, type: 'Medida', metric: 'Peso Corporal', value: (85 - i*1.2).toString(), unit: 'kg', createdAt: date.toISOString()
              });
            }
            
            // Seed Fat
            for(let i=0; i<5; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - (30 - i*7));
              await addDoc(collection(db, "progress_logs"), {
                studentId, type: 'Medida', metric: '% Grasa', value: (22 - i*0.8).toString(), unit: '%', createdAt: date.toISOString()
              });
            }
            
            // Seed RMs
            for(let i=0; i<5; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - (30 - i*7));
              await addDoc(collection(db, "progress_logs"), {
                studentId, type: 'RM', exerciseOrBodyPart: 'Sentadilla Libre', value: (60 + i*5).toString(), unit: 'kg', createdAt: date.toISOString()
              });
            }

            alert("Datos inyectados exitosamente.");
          }}
        >
          Seed Demo Data
        </button>
      )}

      <div className="dashboard-content" style={{ gridTemplateColumns: userRole === 'student' ? '2fr 1fr' : '2fr 1fr' }}>
        <div className="panel glass chart-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {userRole === 'student' ? (
              <select 
                value={chartMode} 
                onChange={(e) => setChartMode(e.target.value)}
                style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
              >
                <option value="rm" style={{background: 'var(--background)'}}>Evolución de Fuerza (RM)</option>
                <option value="weight" style={{background: 'var(--background)'}}>Evolución de Peso Corporal</option>
                <option value="fat" style={{background: 'var(--background)'}}>Evolución de % Grasa</option>
              </select>
            ) : (
              <h3>Evolución de Fuerza (RM)</h3>
            )}
            
            {chartMode === 'rm' && uniqueExercises.length > 0 && (
              <select 
                value={selectedExercise} 
                onChange={(e) => setSelectedExercise(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius)',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              >
                {uniqueExercises.map(ex => (
                  <option key={ex} value={ex} style={{ background: 'var(--background)' }}>{ex}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="chart-container" style={{ height: '350px', marginTop: '1rem' }}>
            {chartMode === 'rm' && renderChart(rmLogs.filter(l => l.exerciseOrBodyPart === selectedExercise), 'kg')}
            {chartMode === 'weight' && renderChart(metricLogs.filter(l => l.metric === 'Peso Corporal'), 'kg')}
            {chartMode === 'fat' && renderChart(metricLogs.filter(l => l.metric === '% Grasa'), '%')}
          </div>
        </div>

        {userRole === 'student' ? (
          <div className="panel glass">
            <h3>Trabajo por Músculos</h3>
            <p style={{fontSize: '0.85rem', color: 'var(--muted-foreground)'}}>Frecuencia de entrenamiento por grupo muscular.</p>
            {renderMuscleBreakdown()}
          </div>
        ) : (
          <div className="panel glass">
            <h3>{userRole === 'trainer' ? 'Alumnos Destacados' : 'Últimos Entrenadores'}</h3>
            <ul className="recent-list">
              {[1, 2, 3, 4].map((item) => (
                <li key={item} className="recent-item">
                  <div className="recent-avatar" style={{ backgroundColor: userRole === 'trainer' ? '#3b82f622' : 'var(--secondary)', color: userRole === 'trainer' ? '#3b82f6' : 'var(--muted-foreground)' }}>
                    {userRole === 'trainer' ? 'A' : 'E'}{item}
                  </div>
                  <div className="recent-info">
                    <h4>{userRole === 'trainer' ? `Alumno ${item}` : `Entrenador ${item}`}</h4>
                    <p>{userRole === 'trainer' ? 'Progreso excelente' : `entrenador${item}@fitpro.com`}</p>
                  </div>
                  <span className="badge" style={{ color: userRole === 'trainer' ? '#3b82f6' : '#10b981', background: userRole === 'trainer' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                    {userRole === 'trainer' ? 'Activo' : 'Activo'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .dashboard-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .dashboard-header p {
          color: var(--muted-foreground);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          padding: 1.5rem;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          gap: 1.25rem;
          animation: fade-up 0.5s ease-out backwards;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info h3 {
          font-size: 1.75rem;
          margin-bottom: 0.25rem;
        }

        .stat-info p {
          color: var(--muted-foreground);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          padding: 1.5rem;
          border-radius: var(--radius);
        }

        .panel h3 {
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
        }

        /* List */
        .recent-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .recent-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .recent-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: var(--muted-foreground);
        }

        .recent-info {
          flex: 1;
        }

        .recent-info h4 {
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
        }

        .recent-info p {
          font-size: 0.8rem;
          color: var(--muted-foreground);
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
