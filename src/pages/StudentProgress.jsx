import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Scale, Plus } from 'lucide-react';
import '../styles/global.css';

export default function StudentProgress() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();
  
  const [newLog, setNewLog] = useState({
    type: 'RM', // RM, PR, Medida, Peso
    exerciseOrBodyPart: '',
    value: '',
    unit: 'kg',
    notes: ''
  });

  useEffect(() => {
    if (currentUser) fetchLogs();
  }, [currentUser]);

  const fetchLogs = async () => {
    try {
      const q = query(
        collection(db, "progress_logs"), 
        where("studentId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "progress_logs"), {
        studentId: currentUser.uid,
        ...newLog,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setNewLog({ type: 'RM', exerciseOrBodyPart: '', value: '', unit: 'kg', notes: '' });
      fetchLogs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="progress-page">
      <div className="page-header">
        <div>
          <h1>Mi Progreso</h1>
          <p>Registra tus RMs, PRs, medidas y peso corporal.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>Registrar Log</span>
        </button>
      </div>

      <div className="grid">
        {loading ? <p>Cargando registros...</p> : logs.length === 0 ? (
          <div className="empty-state glass" style={{ gridColumn: '1 / -1' }}>
            <TrendingUp size={48} color="var(--muted-foreground)" />
            <h3>Sin registros</h3>
            <p>Comienza a registrar tu progreso para ver tu evolución.</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge" style={{ background: log.type === 'RM' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: log.type === 'RM' ? '#ef4444' : '#3b82f6' }}>
                  {log.type}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{log.exerciseOrBodyPart}</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {log.value} {log.unit}
                </div>
              </div>
              {log.notes && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>"{log.notes}"</p>}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Registrar Avance</h2>
            <form onSubmit={handleSaveLog} className="modal-form">
              <div className="input-group">
                <label>Tipo de Registro</label>
                <select className="input-field" value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value})}>
                  <option value="RM">1RM (Repetición Máxima)</option>
                  <option value="PR">PR (Récord Personal)</option>
                  <option value="Peso">Peso Corporal</option>
                  <option value="Medida">Medida Corporal (Brazo, Pierna, etc)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Ejercicio o Zona a medir</label>
                <input className="input-field" type="text" placeholder="Ej. Peso Muerto, Cintura, etc." required value={newLog.exerciseOrBodyPart} onChange={e => setNewLog({...newLog, exerciseOrBodyPart: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Valor</label>
                  <input className="input-field" type="number" step="0.1" required value={newLog.value} onChange={e => setNewLog({...newLog, value: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Unidad</label>
                  <select className="input-field" value={newLog.unit} onChange={e => setNewLog({...newLog, unit: e.target.value})}>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="cm">cm</option>
                    <option value="%">% (Grasa)</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Notas Adicionales</label>
                <textarea rows="2" value={newLog.notes} onChange={e => setNewLog({...newLog, notes: e.target.value})} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
