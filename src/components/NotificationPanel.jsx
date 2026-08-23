import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { X, Send, Plus } from 'lucide-react';
import { formatDate, formatTimeOfDay } from '../lib/dates';
import { ROLES } from '../lib/roles';

export default function NotificationPanel({ onClose }) {
  const { currentUser, userRole } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all'); // all, trainers, users, specific
  const [trainerId, setTrainerId] = useState(null); // For students
  
  useEffect(() => {
    if (!currentUser) return;

    // Fetch trainer ID if user is student
    const fetchTrainerId = async () => {
      if (userRole === ROLES.STUDENT) {
        try {
          const studentSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (studentSnap.exists()) {
            setTrainerId(studentSnap.data().trainerId || null);
          }
        } catch (err) {
          console.error("Error obteniendo el entrenador:", err);
        }
      }
    };
    fetchTrainerId();

    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Local filtering based on role
      const filtered = notifs.filter(n => {
        if (userRole === ROLES.ADMIN) return true; // Admin sees all
        
        if (n.targetRole === 'all') return true;
        
        if (userRole === ROLES.TRAINER) {
          return n.targetRole === 'trainer' || n.targetUserId === currentUser.uid;
        }
        
        if (userRole === ROLES.STUDENT) {
          // If targeted specifically to this student
          if (n.targetUserId === currentUser.uid) return true;
          // If targeted to all students
          if (n.targetRole === 'user' || n.targetRole === 'student') {
            // Must be from Admin or their Trainer
            if (n.senderRole === 'admin' || n.senderId === trainerId) return true;
          }
        }
        return false;
      });
      
      setNotifications(filtered);
    });

    return () => unsubscribe();
  }, [currentUser, userRole, trainerId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    let finalTargetRole = target;
    let targetUserId = null;

    if (userRole === ROLES.TRAINER) {
      finalTargetRole = ROLES.STUDENT; // Trainer broadcasts to their students
    } else if (userRole === ROLES.STUDENT) {
      finalTargetRole = ROLES.TRAINER;
      targetUserId = trainerId; // Student sends to their trainer
      // Sin entrenador asignado, el mensaje se guardaba con targetUserId null
      // y no lo recibía nadie, pero la UI decía "enviado".
      if (!targetUserId) {
        alert('Todavía no tienes un entrenador asignado, no hay a quién enviar el aviso.');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        title: title.trim(),
        message: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        senderRole: userRole,
        targetRole: finalTargetRole,
        targetUserId: targetUserId,
        createdAt: new Date().toISOString()
      });
      setIsComposing(false);
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error("Error sending notification:", err);
      alert('No se pudo enviar la notificación: ' + err.message);
    }
  };

  return (
    <div className="notification-panel glass">
      <div className="notification-header">
        <h3>Notificaciones</h3>
        <button className="icon-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="notification-body">
        {isComposing ? (
          <form className="compose-form" onSubmit={handleSend}>
            <h4>Nueva Notificación</h4>
            
            {userRole === ROLES.ADMIN && (
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="target-select">
                <option value="all">Todos los usuarios</option>
                <option value="trainer">Todos los Entrenadores</option>
                <option value="student">Todos los Alumnos</option>
              </select>
            )}
            
            {userRole === ROLES.TRAINER && (
              <p className="target-info">Destino: Todos tus alumnos</p>
            )}
            
            {userRole === ROLES.STUDENT && (
              <p className="target-info">Destino: Tu entrenador</p>
            )}

            <input 
              type="text" 
              placeholder="Título" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea 
              placeholder="Mensaje..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
            />
            <div className="compose-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsComposing(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">
                <Send size={16} style={{ marginRight: '0.5rem' }} /> Enviar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-state">No tienes notificaciones recientes.</div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="notification-item">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-msg">{notif.message}</div>
                    <div className="notif-footer">
                      <span className="notif-sender">De: {notif.senderName || 'Sistema'}</span>
                      <span className="notif-date">
                        {formatDate(notif.createdAt, '')} {formatTimeOfDay(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="btn-primary compose-btn" onClick={() => setIsComposing(true)}>
              <Plus size={20} /> Redactar
            </button>
          </>
        )}
      </div>

      <style>{`
        .notification-panel {
          position: absolute;
          top: 60px;
          right: 2rem;
          width: 350px;
          max-height: 500px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          z-index: 100;
          background: rgba(24, 24, 27, 0.95);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .notification-header {
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }
        
        .notification-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .notification-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 1rem;
          position: relative;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 3rem; /* Space for compose btn */
        }

        .notification-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
        }

        .notif-title {
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.25rem;
        }

        .notif-msg {
          font-size: 0.9rem;
          color: var(--foreground);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .notif-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }

        .compose-btn {
          position: sticky;
          bottom: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          margin-top: auto;
        }

        .compose-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .compose-form h4 {
          margin: 0;
        }

        .target-select,
        .compose-form input,
        .compose-form textarea {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border);
          color: white;
          font-family: inherit;
        }

        .target-info {
          font-size: 0.85rem;
          color: var(--primary);
          margin: 0;
        }

        .compose-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .empty-state {
          text-align: center;
          color: var(--muted-foreground);
          padding: 2rem 0;
        }
      `}</style>
    </div>
  );
}
