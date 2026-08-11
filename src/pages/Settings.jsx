import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Save, User } from 'lucide-react';
import '../styles/global.css';

export default function Settings() {
  const { currentUser, userRole } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: 'masculino',
    weight: '',
    height: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      
      // Get previous data to check if weight changed
      const docSnap = await getDoc(docRef);
      const oldWeight = docSnap.exists() ? docSnap.data().weight : null;

      await updateDoc(docRef, {
        name: profile.name,
        phone: profile.phone || '',
        address: profile.address || '',
        age: profile.age || '',
        gender: profile.gender || 'masculino',
        weight: profile.weight || '',
        height: profile.height || ''
      });

      // If student updated weight, log it in progress automatically
      if (userRole === 'student' && profile.weight && profile.weight !== oldWeight) {
        await addDoc(collection(db, "progress_logs"), {
          studentId: currentUser.uid,
          type: 'Medida',
          metric: 'Peso Corporal',
          value: profile.weight,
          unit: 'kg',
          createdAt: new Date().toISOString()
        });
      }

      setMessage('Perfil actualizado exitosamente.');
    } catch (err) {
      console.error("Error updating profile:", err);
      setMessage('Error al actualizar el perfil.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Cargando...</div>;

  return (
    <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Configuración</h1>
          <p>Actualiza tus datos personales y preferencias.</p>
        </div>
      </div>

      <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : <User size={40} />}
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>{profile.name || 'Usuario'}</h2>
            <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>{currentUser.email}</p>
            <span className="badge" style={{ marginTop: '0.5rem', display: 'inline-block', background: 'rgba(255,255,255,0.1)' }}>
              {userRole === 'admin' ? 'Administrador' : userRole === 'trainer' ? 'Entrenador' : 'Alumno'}
            </span>
          </div>
        </div>

        {message && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: 'var(--radius)', 
            background: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: message.includes('Error') ? '#ef4444' : '#10b981',
            border: `1px solid ${message.includes('Error') ? '#ef4444' : '#10b981'}`
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="modal-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                className="input-field"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                required
              />
            </div>

            <div className="input-group">
              <label>Teléfono</label>
              <input 
                type="text" 
                className="input-field"
                value={profile.phone || ''}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
              />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Dirección</label>
              <input 
                type="text" 
                className="input-field"
                value={profile.address || ''}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Edad</label>
              <input 
                type="number" 
                className="input-field"
                value={profile.age || ''}
                onChange={(e) => setProfile({...profile, age: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label>Sexo</label>
              <select 
                className="input-field"
                value={profile.gender || 'masculino'}
                onChange={(e) => setProfile({...profile, gender: e.target.value})}
              >
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {(userRole === 'student' || userRole === 'trainer') && (
              <>
                <div className="input-group">
                  <label>Estatura (cm)</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={profile.height || ''}
                    onChange={(e) => setProfile({...profile, height: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Peso Actual (kg)</label>
                  <input 
                    type="number"
                    step="0.1" 
                    className="input-field"
                    value={profile.weight || ''}
                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                  />
                  {userRole === 'student' && (
                    <small style={{ color: 'var(--muted-foreground)', marginTop: '0.25rem', display: 'block' }}>
                      Al guardar, el peso se registrará en tu historial de progreso.
                    </small>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={20} style={{ marginRight: '0.5rem' }} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
