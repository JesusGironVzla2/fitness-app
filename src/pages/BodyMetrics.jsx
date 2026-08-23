import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import AnthropometryPanel from '../components/AnthropometryPanel';
import { fetchProgressLogs, buildMeasureLog, MEASURE_TYPE } from '../lib/progress';
import { formatDate } from '../lib/dates';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Scale, Plus, TrendingUp, Activity } from 'lucide-react';
import '../styles/global.css';

const METRICS_LIST = [
  { name: 'Peso Corporal', unit: 'kg' },
  { name: '% Grasa', unit: '%' },
  // Resultados de la evaluación antropométrica (ver AnthropometryPanel)
  { name: 'IMC', unit: '' },
  { name: 'Masa Magra', unit: 'kg' },
  { name: 'Cuello', unit: 'cm' },
  { name: 'Hombros', unit: 'cm' },
  { name: 'Pecho', unit: 'cm' },
  { name: 'Cintura', unit: 'cm' },
  { name: 'Cadera', unit: 'cm' },
  { name: 'Brazos', unit: 'cm' },
  { name: 'Piernas', unit: 'cm' },
  { name: 'Gemelos', unit: 'cm' },
];

export default function BodyMetrics() {
  const { currentUser } = useAuth();
  const [metricsData, setMetricsData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMetric, setSelectedMetric] = useState('Peso Corporal');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newMetricType, setNewMetricType] = useState('Peso Corporal');
  const [newMetricValue, setNewMetricValue] = useState('');

  // Perfil del usuario: sirve para prellenar la evaluación antropométrica con
  // los datos que ya se pidieron al darle de alta.
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchMetrics();
      fetchPerfil();
    }
  }, [currentUser]);

  const fetchPerfil = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) setPerfil(snap.data());
    } catch (e) {
      console.error('Error cargando el perfil:', e);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // `fetchProgressLogs` lee tanto los documentos nuevos (studentId/'Medida')
      // como los antiguos de esta pantalla (userId/'metric'), ya ordenados.
      const logs = await fetchProgressLogs(currentUser.uid);
      setMetricsData(logs.filter(l => l.type === MEASURE_TYPE && l.metric));
    } catch (e) {
      console.error('Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMetric = async (e) => {
    e.preventDefault();
    const parsed = parseFloat(newMetricValue);
    if (!Number.isFinite(parsed)) {
      alert('Introduce un valor numérico válido.');
      return;
    }

    try {
      await addDoc(collection(db, 'progress_logs'), buildMeasureLog({
        studentId: currentUser.uid,
        metric: newMetricType,
        value: parseFloat(newMetricValue),
        unit: METRICS_LIST.find(m => m.name === newMetricType)?.unit || '',
      }));
      setShowAddModal(false);
      setNewMetricValue('');
      setSelectedMetric(newMetricType); // Auto-select the newly added metric
      fetchMetrics();
    } catch (error) {
      console.error('Error adding metric:', error);
      alert('Hubo un error al guardar la métrica.');
    }
  };

  // Filter data for the chart based on selected metric
  const chartData = metricsData
    .filter(m => m.metric === selectedMetric && m.numericValue !== null)
    .map(m => ({
      ...m,
      value: m.numericValue,
      dateFormatted: formatDate(m.createdAt)
    }));

  const currentUnit = METRICS_LIST.find(m => m.name === selectedMetric)?.unit || '';

  // Get latest values for summary cards
  const getLatestValue = (metricName) => {
    const records = metricsData.filter(m => m.metric === metricName && m.numericValue !== null);
    if (records.length === 0) return '-';
    return records[records.length - 1].numericValue;
  };

  return (
    <div className="metrics-page" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={32} color="var(--primary)" />
            Control Corporal
          </h1>
          <p>Haz seguimiento de tu peso, grasa y medidas corporales.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          <span>Registrar Medida</span>
        </button>
      </div>

      <div className="metrics-summary" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Peso</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getLatestValue('Peso Corporal')} <span style={{fontSize: '0.9rem'}}>kg</span></p>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>% Grasa</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getLatestValue('% Grasa')} <span style={{fontSize: '0.9rem'}}>%</span></p>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Cintura</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getLatestValue('Cintura')} <span style={{fontSize: '0.9rem'}}>cm</span></p>
        </div>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Brazos</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{getLatestValue('Brazos')} <span style={{fontSize: '0.9rem'}}>cm</span></p>
        </div>
      </div>

      <div className="chart-container glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={20} color="var(--primary)"/> Evolución</h3>
          <select 
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
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
            {METRICS_LIST.map(m => (
              <option key={m.name} value={m.name} style={{ background: 'var(--background)' }}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando métricas...</p>
        ) : chartData.length > 0 ? (
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="dateFormatted" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name={`${selectedMetric} (${currentUnit})`}
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted-foreground)' }}>
            <Activity size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No hay datos registrados para {selectedMetric}.</p>
          </div>
        )}
      </div>

      {/* Evaluación antropométrica y composición corporal
          (temario Nivel II, diapositivas 104-116) */}
      <AnthropometryPanel
        perfil={perfil}
        studentId={currentUser?.uid}
        onSaved={fetchMetrics}
      />

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Registrar Medida</h2>
            <p className="modal-subtitle">Añade un nuevo registro de progreso.</p>
            <form onSubmit={handleAddMetric} className="modal-form">
              <div className="input-group">
                <label>Tipo de Métrica</label>
                <select 
                  value={newMetricType}
                  onChange={(e) => setNewMetricType(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius)',
                    outline: 'none',
                    width: '100%'
                  }}
                >
                  {METRICS_LIST.map(m => (
                    <option key={m.name} value={m.name} style={{ background: 'var(--background)' }}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Valor ({METRICS_LIST.find(m => m.name === newMetricType)?.unit})</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="Ej. 75.5" 
                  value={newMetricValue}
                  onChange={(e) => setNewMetricValue(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
