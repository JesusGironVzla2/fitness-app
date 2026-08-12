import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, TrendingUp, Dumbbell, ClipboardList, CheckCircle, Scale, Droplets, Sparkles, TrendingDown, Minus, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function Dashboard() {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [studentCount, setStudentCount] = useState(0);
  
  // Data for charts
  const [rmLogs, setRmLogs] = useState([]);
  const [metricLogs, setMetricLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [exercisesLib, setExercisesLib] = useState({});
  const [studentStats, setStudentStats] = useState({ weight: '-', fat: '-', rms: 0 });
  const [insights, setInsights] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);

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

          const todayStr = new Date().toISOString().split('T')[0];
          const waterLogsToday = logs.filter(l => l.type === 'Water' && l.createdAt.startsWith(todayStr));
          setWaterGlasses(waterLogsToday.reduce((sum, l) => sum + parseInt(l.value), 0));

          // We want to fetch personal workout data for everyone, not just students.
          const qW = query(collection(db, "workouts"), where("studentId", "==", currentUser.uid));
          const snapW = await getDocs(qW);
          setWorkouts(snapW.docs.map(d => d.data()));

          const qE = query(collection(db, "exercises"));
          const snapE = await getDocs(qE);
          const exMap = {};
          snapE.docs.forEach(doc => {
            exMap[doc.id] = doc.data().targetMuscle;
          });
          setExercisesLib(exMap);
          
          const lastWeight = metrics.filter(m => m.metric === 'Peso Corporal').pop();
          const lastFat = metrics.filter(m => m.metric === '% Grasa').pop();
          
          setStudentStats({
            weight: lastWeight ? `${lastWeight.value} kg` : '-',
            fat: lastFat ? `${lastFat.value} %` : '-',
            rms: rms.length
          });

          // --- Generate Insights ---
          setLoadingAI(true);
          const newInsights = await generateInsights(rms, metrics);
          setInsights(newInsights);
          setLoadingAI(false);
          
          if (rms.length > 0) {
            const uniqueExercises = [...new Set(rms.map(l => l.exerciseOrBodyPart))];
            setSelectedExercise(uniqueExercises[0]);
          }
        } catch(e) {}
      };
      fetchLogs();
    }
  }, [userRole, currentUser]);

  const generateInsights = async (rms, metrics) => {
    const weights = metrics.filter(m => m.metric === 'Peso Corporal');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey && apiKey.length > 10) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
        
        // Compact the data to save tokens
        const summaryRMs = rms.map(r => ({ e: r.exerciseOrBodyPart, v: r.value, d: new Date(r.createdAt).toLocaleDateString() })).slice(-20);
        const summaryWeights = weights.map(w => ({ v: w.value, d: new Date(w.createdAt).toLocaleDateString() })).slice(-10);

        const prompt = `
          Actúa como un entrenador personal analítico. Evalúa los siguientes datos de entrenamiento.
          Identifica logros o áreas de mejora de forma concisa, directa y motivadora (máx 1 oración por punto).
          Devuelve un JSON exacto con un array de 3 objetos: [{"type": "positive" | "negative" | "neutral", "text": "string"}].
          RMs: ${JSON.stringify(summaryRMs)}
          Peso Corporal: ${JSON.stringify(summaryWeights)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText);
      } catch (error) {
        console.error("Gemini Error:", error);
      }
    }

    // Fallback: Heurística manual (IA Simulada)
    const newInsights = [];
    if (weights.length >= 2) {
      const diff = (parseFloat(weights[weights.length - 1].value) - parseFloat(weights[weights.length - 2].value)).toFixed(1);
      if (diff < 0) newInsights.push({ type: 'positive', text: `Has bajado ${Math.abs(diff)}kg de peso corporal. ¡Excelente trabajo!` });
      else if (diff > 0) newInsights.push({ type: 'neutral', text: `Tu peso aumentó ${diff}kg desde la última vez.` });
    }
    if (rms.length >= 2) {
      newInsights.push({ type: 'positive', text: `Continúas registrando tu fuerza. Tienes un total de ${rms.length} mediciones históricas.` });
    }
    if (newInsights.length === 0) {
      newInsights.push({ type: 'neutral', text: `Registra más datos para desbloquear el análisis inteligente.` });
    }
    return newInsights.reverse().slice(0, 3);
  };

  const uniqueExercises = [...new Set(rmLogs.map(l => l.exerciseOrBodyPart))];

  const handleAddWater = async () => {
    setWaterGlasses(prev => prev + 1);
    await addDoc(collection(db, "progress_logs"), {
      studentId: currentUser.uid, type: 'Water', value: '1', unit: 'vasos', createdAt: new Date().toISOString()
    });
  };

  const volumeData = workouts.reduce((acc, w) => {
    const date = new Date(w.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    let vol = 0;
    if (w.actualData) {
      Object.values(w.actualData).forEach(ex => {
        if (ex.done) {
          const s = parseInt(ex.reps?.split('x')[0]) || 0;
          const r = parseInt(ex.reps?.split('x')[1]) || 0;
          const wt = parseFloat(ex.weight) || 0;
          vol += (s * r * wt);
        }
      });
    }
    if (vol > 0) acc.push({ date, value: vol, createdAt: w.date });
    return acc;
  }, []).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  const renderRecoveryMap = () => {
    const now = new Date();
    const fatigueMap = {}; 
    workouts.forEach(w => {
      if (w.completed) {
        const wDate = new Date(w.completedAt || w.date);
        const hoursDiff = (now - wDate) / (1000 * 60 * 60);
        if (hoursDiff <= 72 && w.exercises) {
          w.exercises.forEach(ex => {
            const muscle = exercisesLib[ex.exerciseId] || 'Otros';
            if (!fatigueMap[muscle] || hoursDiff < fatigueMap[muscle]) {
              fatigueMap[muscle] = hoursDiff;
            }
          });
        }
      }
    });

    const muscles = Object.keys(fatigueMap);
    if (muscles.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius)' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>Estado Muscular (72h)</h4>
        {muscles.map(m => {
          const h = fatigueMap[m];
          let color = '#10b981';
          let label = 'Recuperado';
          if (h <= 24) { color = '#ef4444'; label = 'Fatigado'; }
          else if (h <= 48) { color = '#eab308'; label = 'Recuperándose'; }
          return (
            <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem' }}>{m}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{label}</span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChart = (dataset, labelSuffix, isArea = false) => {
    if (!dataset || dataset.length === 0) {
      return <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'var(--muted-foreground)'}}>No hay datos registrados aún.</div>;
    }
    
    // Prepare data for recharts
    const formattedData = dataset.map(log => ({
      date: new Date(log.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      value: parseFloat(log.value)
    }));

    const ChartComponent = isArea ? AreaChart : LineChart;
    const DataComponent = isArea ? Area : Line;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="var(--muted-foreground)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="var(--muted-foreground)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${val}${labelSuffix}`}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
            itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
            formatter={(value) => [`${value} ${labelSuffix}`, 'Valor']}
          />
          <DataComponent 
            type="monotone" 
            dataKey="value" 
            stroke="var(--primary)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill={isArea ? "url(#colorValue)" : "none"} 
            activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--background)', strokeWidth: 2 }}
          />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderMuscleBreakdown = () => {
    // Filtrar rutinas de los últimos 7 días
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentWorkouts = workouts.filter(w => {
      if (!w.completed) return false;
      const wDate = new Date(w.date || w.completedAt);
      return wDate >= oneWeekAgo;
    });

    const muscleCounts = {};
    let totalExercises = 0;

    recentWorkouts.forEach(w => {
      if (w.exercises) {
        w.exercises.forEach(ex => {
          const muscle = exercisesLib[ex.exerciseId] || 'Otros';
          muscleCounts[muscle] = (muscleCounts[muscle] || 0) + 1;
          totalExercises++;
        });
      }
    });

    const entries = Object.entries(muscleCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);

    if (entries.length === 0) {
      return <div style={{color:'var(--muted-foreground)', marginTop: '1rem'}}>Completa rutinas esta semana para ver tu distribución gráfica.</div>;
    }

    const COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];
    const topMuscle = entries[0];
    const topPercentage = Math.round((topMuscle.value / totalExercises) * 100);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '100%', height: '280px', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={entries}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {entries.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => {
                  const perc = Math.round((value / totalExercises) * 100);
                  return [`${perc}% (${value} ej.)`, name];
                }}
                contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', borderLeft: `4px solid ${COLORS[0]}` }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>
            <strong style={{ color: 'white' }}>Análisis Semanal:</strong> Tu entrenamiento está enfocado principalmente en <strong style={{ color: COLORS[0] }}>{topMuscle.name}</strong>, que representa el <strong>{topPercentage}%</strong> de tu volumen de esta semana. 
            {topPercentage > 50 ? ' Considera incluir otros grupos musculares para evitar desbalances.' : ' Tienes una distribución bastante equilibrada.'}
          </p>
        </div>
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

      {userRole !== 'student' && (
        <>
          <h2 style={{ marginTop: '1rem', fontSize: '1.25rem' }}>Estadísticas de la Plataforma</h2>
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
        </>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Mi Entrenamiento Personal</h2>
        <button 
          className="btn-primary" 
          onClick={() => navigate('/mis-rutinas')}
          style={{ background: 'var(--primary)', color: 'black', fontWeight: 'bold', padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={18} fill="black" /> Empezar Rutina
        </button>
      </div>

      {userRole === 'admin' && (
        <button 
          className="btn-secondary"
          style={{ width: 'fit-content', margin: '0 auto' }}
          onClick={async () => {
            if (!window.confirm("¿Inyectar datos de prueba en tu propio historial?")) return;
            const { addDoc } = await import('firebase/firestore');
            const studentId = currentUser.uid;
            
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

            // Seed Workouts for Muscle Pie Chart
            const qEx = query(collection(db, "exercises"));
            const exSnap = await getDocs(qEx);
            if (!exSnap.empty) {
              const allEx = exSnap.docs.map(d => ({id: d.id, ...d.data()}));
              for(let i=0; i<4; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                
                const ex1 = allEx[Math.floor(Math.random() * allEx.length)];
                const ex2 = allEx[Math.floor(Math.random() * allEx.length)];
                
                await addDoc(collection(db, "workouts"), {
                  studentId,
                  trainerId: currentUser.uid,
                  name: `Rutina de Prueba ${i+1}`,
                  date: date.toISOString().split('T')[0],
                  completed: true,
                  completedAt: date.toISOString(),
                  duration: 3600,
                  exercises: [
                    { exerciseId: ex1.id, name: ex1.name, sets: 4, reps: 10 },
                    { exerciseId: ex2.id, name: ex2.name, sets: 4, reps: 10 }
                  ]
                });
              }
            }

            alert("Datos inyectados exitosamente. Recarga la página para ver los cambios.");
          }}
        >
          Seed Demo Data
        </button>
      )}

      {/* Water Tracker */}
      <div className="panel glass" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(59, 130, 246, 0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '50%', color: '#3b82f6' }}>
            <Droplets size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#3b82f6' }}>Hidratación Diaria</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{waterGlasses} vasos hoy</p>
          </div>
        </div>
        <button className="btn-primary" onClick={handleAddWater} style={{ background: '#3b82f6', color: 'white', padding: '0.5rem 1rem' }}>
          + Tomar Agua
        </button>
      </div>

      {/* Insights Panel for all users */}
      <div className="panel glass" style={{ marginBottom: '1rem', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(to right, rgba(0,0,0,0.6), rgba(168, 85, 247, 0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Sparkles size={24} color="#a855f7" />
          <h3 style={{ margin: 0, color: '#a855f7' }}>Análisis Inteligente</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loadingAI ? (
            <div style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(168, 85, 247, 0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Analizando tus datos...
            </div>
          ) : insights.length > 0 ? insights.map((insight, idx) => (
            <div key={idx} style={{ 
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem', 
              background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius)',
              borderLeft: `4px solid ${insight.type === 'positive' ? '#10b981' : insight.type === 'negative' ? '#ef4444' : '#3b82f6'}`
            }}>
              <div style={{ marginTop: '2px' }}>
                {insight.type === 'positive' && <TrendingUp size={18} color="#10b981" />}
                {insight.type === 'negative' && <TrendingDown size={18} color="#ef4444" />}
                {insight.type === 'neutral' && <Minus size={18} color="#3b82f6" />}
              </div>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{insight.text}</p>
            </div>
          )) : (
            <div style={{ color: 'var(--muted-foreground)' }}>Agrega datos de entrenamiento para obtener análisis.</div>
          )}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="panel glass chart-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <select 
              value={chartMode} 
              onChange={(e) => setChartMode(e.target.value)}
              style={{ background: 'transparent', color: 'white', border: 'none', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none', cursor: 'pointer', flex: 1, minWidth: '200px' }}
            >
              <option value="rm" style={{background: 'var(--background)'}}>Evolución de Fuerza (RM)</option>
              <option value="weight" style={{background: 'var(--background)'}}>Evolución de Peso Corporal</option>
              <option value="fat" style={{background: 'var(--background)'}}>Evolución de % Grasa</option>
              <option value="volume" style={{background: 'var(--background)'}}>Volumen Semanal (Tonelaje)</option>
            </select>
            
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
            {chartMode === 'rm' && renderChart(rmLogs.filter(l => l.exerciseOrBodyPart === selectedExercise), 'kg', false)}
            {chartMode === 'weight' && renderChart(metricLogs.filter(l => l.metric === 'Peso Corporal'), 'kg', true)}
            {chartMode === 'fat' && renderChart(metricLogs.filter(l => l.metric === '% Grasa'), '%', true)}
            {chartMode === 'volume' && renderChart(volumeData, 'kg', true)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="panel glass">
            <h3>Trabajo por Músculos</h3>
            <p style={{fontSize: '0.85rem', color: 'var(--muted-foreground)'}}>Frecuencia de entrenamiento por grupo muscular.</p>
            {renderMuscleBreakdown()}
            {renderRecoveryMap()}
          </div>
          
          {/* Leaderboard Panel */}
          <div className="panel glass" style={{ border: '1px solid rgba(234, 179, 8, 0.3)', background: 'linear-gradient(to bottom right, rgba(0,0,0,0.6), rgba(234, 179, 8, 0.05))' }}>
            <h3 style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span>🏆</span> Clasificación Semanal
            </h3>
            <p style={{fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem'}}>Top de volumen levantado en tu gimnasio.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(234, 179, 8, 0.15)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#eab308' }}>1</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eab308', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>T</div>
                  <span style={{ fontWeight: 'bold' }}>Tú</span>
                </div>
                <span style={{ fontWeight: 'bold', color: '#eab308' }}>{Math.floor(volumeData.reduce((acc, curr) => acc + curr.value, 0) * 1.2)} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#94a3b8' }}>2</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#94a3b8', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>M</div>
                  <span>Marcos R.</span>
                </div>
                <span style={{ color: '#94a3b8' }}>{Math.floor(volumeData.reduce((acc, curr) => acc + curr.value, 0) * 0.9 + 1500)} kg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#b45309' }}>3</span>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#b45309', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>S</div>
                  <span>Sofía P.</span>
                </div>
                <span style={{ color: '#b45309' }}>{Math.floor(volumeData.reduce((acc, curr) => acc + curr.value, 0) * 0.7 + 1000)} kg</span>
              </div>
            </div>
          </div>
        </div>
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
