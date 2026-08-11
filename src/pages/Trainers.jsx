import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, secondaryAuth } from '../lib/firebase';
import { UserPlus, Mail, Key } from 'lucide-react';
import '../styles/global.css';

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ email: '', password: '', name: '' });
  const [actionError, setActionError] = useState('');
  const { impersonate } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "trainer"));
      const querySnapshot = await getDocs(q);
      const trainersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.status !== 'deleted');
      setTrainers(trainersData);
    } catch (err) {
      console.error("Error fetching trainers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      // 1. Crear el usuario en Authentication usando la app secundaria (para no desloguear al admin)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newTrainer.email, newTrainer.password);
      
      // 2. Guardar el perfil en Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: newTrainer.email,
        name: newTrainer.name,
        role: 'trainer',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // 3. Cerrar la sesión de la app secundaria
      await secondaryAuth.signOut();

      // 4. Actualizar lista y cerrar modal
      setShowModal(false);
      setNewTrainer({ email: '', password: '', name: '' });
      fetchTrainers();

    } catch (err) {
      console.error("Error creating trainer:", err);
      setActionError(err.message);
    }
  };

  const handleUpdateStatus = async (trainerId, newStatus) => {
    if (newStatus === 'deleted' && !window.confirm("¿Seguro que deseas eliminar a este entrenador?")) return;
    
    try {
      await updateDoc(doc(db, "users", trainerId), { status: newStatus });
      fetchTrainers();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="trainers-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Entrenadores</h1>
          <p>Administra los entrenadores que tienen acceso a la plataforma.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={20} />
          <span>Agregar Entrenador</span>
        </button>
      </div>

      <div className="trainers-list">
        {loading ? (
          <p>Cargando entrenadores...</p>
        ) : trainers.length === 0 ? (
          <div className="empty-state glass">
            <UserPlus size={48} color="var(--muted-foreground)" />
            <h3>No hay entrenadores</h3>
            <p>Aún no has registrado ningún entrenador en la plataforma.</p>
          </div>
        ) : (
          <div className="grid">
            {trainers.map(trainer => (
              <div key={trainer.id} className="trainer-card glass">
                <div className="trainer-header">
                  <div className="avatar">{trainer.name ? trainer.name.charAt(0).toUpperCase() : 'E'}</div>
                  <div>
                    <h3>{trainer.name || 'Sin Nombre'}</h3>
                    <p>{trainer.email}</p>
                  </div>
                </div>
                <div className="trainer-footer">
                  <span className={`badge ${trainer.status === 'suspended' ? 'suspended' : ''}`}>
                    {trainer.status === 'suspended' ? 'Suspendido' : 'Activo'}
                  </span>
                  <span className="date">Registrado el {new Date(trainer.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      impersonate(trainer);
                      navigate('/');
                    }}
                  >
                    Entrar
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ color: trainer.status === 'suspended' ? 'var(--primary)' : 'var(--destructive)', borderColor: trainer.status === 'suspended' ? 'var(--primary)' : 'var(--destructive)' }}
                    onClick={() => handleUpdateStatus(trainer.id, trainer.status === 'suspended' ? 'active' : 'suspended')}
                  >
                    {trainer.status === 'suspended' ? 'Activar' : 'Suspender'}
                  </button>
                  <button 
                    className="text-btn" 
                    style={{ gridColumn: 'span 2', color: 'var(--muted-foreground)', padding: '0.5rem' }}
                    onClick={() => handleUpdateStatus(trainer.id, 'deleted')}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal glass">
            <h2>Nuevo Entrenador</h2>
            <p className="modal-subtitle">Crea una cuenta para un nuevo entrenador. Él podrá agregar a sus propios alumnos.</p>
            
            {actionError && <div className="error-message">{actionError}</div>}

            <form onSubmit={handleCreateTrainer} className="modal-form">
              <div className="input-group">
                <label>Nombre Completo</label>
                <div className="input-with-icon">
                  <input 
                    type="text" 
                    placeholder="Ej. Carlos Fitness" 
                    value={newTrainer.name}
                    onChange={(e) => setNewTrainer({...newTrainer, name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Correo Electrónico</label>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input 
                    type="email" 
                    placeholder="carlos@ejemplo.com" 
                    value={newTrainer.email}
                    onChange={(e) => setNewTrainer({...newTrainer, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Contraseña Temporal</label>
                <div className="input-with-icon">
                  <Key size={18} />
                  <input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    value={newTrainer.password}
                    onChange={(e) => setNewTrainer({...newTrainer, password: e.target.value})}
                    required
                    minLength="6"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Entrenador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          border-radius: var(--radius);
          gap: 1rem;
        }

        .empty-state h3 {
          font-size: 1.5rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .trainer-card {
          padding: 1.5rem;
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .trainer-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .trainer-header h3 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }

        .trainer-header p {
          color: var(--muted-foreground);
          font-size: 0.875rem;
        }

        .trainer-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }

        .date {
          font-size: 0.8rem;
          color: var(--muted-foreground);
        }

        .badge.suspended {
          background: rgba(239, 68, 68, 0.1);
          color: var(--destructive);
        }

        .text-btn:hover {
          color: var(--destructive) !important;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }

        .modal {
          width: 100%;
          max-width: 500px;
          padding: 2rem;
          border-radius: var(--radius);
          animation: fade-up 0.3s ease-out;
        }

        .modal h2 {
          margin-bottom: 0.5rem;
        }

        .modal-subtitle {
          color: var(--muted-foreground);
          margin-bottom: 2rem;
          font-size: 0.9rem;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon svg {
          position: absolute;
          left: 1rem;
          color: var(--muted-foreground);
        }

        .input-with-icon input {
          width: 100%;
          padding-left: 2.75rem !important;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--foreground);
          padding: 0.75rem 1.25rem;
          border-radius: calc(var(--radius) - 4px);
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--destructive);
          padding: 0.75rem;
          border-radius: calc(var(--radius) - 4px);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
