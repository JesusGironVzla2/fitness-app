import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Send, User, MessageSquare } from 'lucide-react';
import '../styles/global.css';

export default function Chat() {
  const { currentUser, userRole } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUsers = async () => {
      try {
        if (userRole === 'trainer' || userRole === 'admin') {
          // Fetch all students of this trainer
          const q = query(collection(db, "users"), where("role", "==", "student"), where("trainerId", "==", currentUser.uid));
          const snap = await getDocs(q);
          const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setConversations(users);
        } else if (userRole === 'student') {
          // Fetch the trainer of this student
          const studentRef = doc(db, "users", currentUser.uid);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const studentData = studentSnap.data();
            const trainerId = studentData.trainerId;
            
            if (trainerId) {
              const trainerRef = doc(db, "users", trainerId);
              const trainerSnap = await getDoc(trainerRef);
              if (trainerSnap.exists()) {
                const trainerData = trainerSnap.data();
                const trainer = { id: trainerSnap.id, ...trainerData };
                setConversations([trainer]);
                setSelectedUser(trainer);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching chat users:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser || !selectedUser) return;
    
    const targetUserId = selectedUser.uid || selectedUser.id;
    const chatId = [currentUser.uid, targetUserId].sort().join('_');
    
    const q = query(
      collection(db, "messages"), 
      where("chatId", "==", chatId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory safely handling both string dates and Firestore Timestamps
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeA - (isNaN(timeB) ? 0 : timeB);
      });
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    });
    
    return () => unsubscribe();
  }, [currentUser, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    
    const targetUserId = selectedUser.uid || selectedUser.id;
    const chatId = [currentUser.uid, targetUserId].sort().join('_');
    const msgText = newMessage.trim();
    setNewMessage('');
    
    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: currentUser.uid,
        receiverId: targetUserId,
        text: msgText,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="chat-page" style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      
      {/* Sidebar for conversations */}
      {(userRole === 'trainer' || userRole === 'admin') && (
        <div className="glass" style={{ width: '300px', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Mensajes</h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? <div style={{ padding: '1rem' }}>Cargando...</div> : conversations.map(user => (
              <div 
                key={user.id} 
                onClick={() => setSelectedUser(user)}
                style={{ 
                  padding: '1rem 1.5rem', 
                  borderBottom: '1px solid var(--border)', 
                  cursor: 'pointer',
                  background: selectedUser?.id === user.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{user.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Alumno</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {selectedUser ? (
          <>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedUser.name}</h2>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                  <MessageSquare size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p>Inicia la conversación enviando un mensaje.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ 
                        background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                        color: isMe ? 'black' : 'white',
                        padding: '0.75rem 1rem', 
                        borderRadius: '12px',
                        borderBottomRightRadius: isMe ? '0' : '12px',
                        borderBottomLeftRadius: !isMe ? '0' : '12px',
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', marginTop: '0.25rem', textAlign: isMe ? 'right' : 'left' }}>
                        {(() => {
                          try {
                            const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now());
                            if (isNaN(date.getTime())) return '';
                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          } catch (e) {
                            return '';
                          }
                        })()}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', color: 'var(--muted-foreground)', textAlign: 'center' }}>
            <User size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p>Selecciona un alumno para comenzar a chatear.</p>
          </div>
        )}
      </div>
    </div>
  );
}
