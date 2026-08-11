import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Send, UserCircle2, MessageSquare } from 'lucide-react';
import '../styles/global.css';

export default function Support() {
  const { currentUser, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // For Admin only
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!currentUser) return;

    if (userRole === 'admin') {
      // Admin: Fetch all users to show in the sidebar (ideally only those who messaged support, but for simplicity, we show trainers and students)
      const fetchUsers = async () => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "in", ["trainer", "student", "user"]));
        const snap = await getDocs(q);
        const usersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConversations(usersList);
      };
      fetchUsers();
    } else {
      // Trainer or Student: The selected "user" they are talking to is conceptually the Admin
      // They don't need a selectedUser object, their chatId is fixed.
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    if (!currentUser) return;
    
    let currentChatId = null;
    
    if (userRole === 'admin') {
      if (!selectedUser) {
        setMessages([]);
        return;
      }
      currentChatId = `support_${selectedUser.id}`;
    } else {
      currentChatId = `support_${currentUser.uid}`;
    }

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", currentChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeA - (isNaN(timeB) ? 0 : timeB);
      });
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [currentUser, userRole, selectedUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (userRole === 'admin' && !selectedUser) return;

    const currentChatId = userRole === 'admin' ? `support_${selectedUser.id}` : `support_${currentUser.uid}`;
    const receiverId = userRole === 'admin' ? selectedUser.id : 'admin'; // 'admin' is a conceptual ID here

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, "messages"), {
        chatId: currentChatId,
        senderId: currentUser.uid,
        receiverId: receiverId,
        text: msgText,
        createdAt: new Date().toISOString(),
        isSupport: true
      });
    } catch (err) {
      console.error("Error sending support message:", err);
    }
  };

  return (
    <div className="chat-page" style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      
      {/* Sidebar for Admin to see users */}
      {userRole === 'admin' && (
        <div className="chat-sidebar glass" style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Tickets de Soporte</h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
            {conversations.map(u => (
              <div 
                key={u.id}
                onClick={() => setSelectedUser(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  background: selectedUser?.id === u.id ? 'rgba(163, 230, 53, 0.1)' : 'transparent',
                  border: selectedUser?.id === u.id ? '1px solid var(--primary)' : '1px solid transparent',
                  marginBottom: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCircle2 size={24} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{u.name || u.email}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {u.role === 'trainer' ? 'Entrenador' : 'Alumno'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="chat-main glass" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {userRole === 'admin' ? (selectedUser ? selectedUser.name?.charAt(0) || 'U' : '?') : 'A'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              {userRole === 'admin' 
                ? (selectedUser ? selectedUser.name || selectedUser.email : 'Selecciona un usuario') 
                : 'Soporte CoachNode'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
              {userRole === 'admin' ? 'Ticket de ayuda' : 'Comunícate directamente con el administrador'}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(userRole === 'admin' && !selectedUser) ? (
            <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: 'auto', marginBottom: 'auto' }}>
              Selecciona un ticket de la lista para ver los mensajes.
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: 'auto', marginBottom: 'auto' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.2, display: 'block' }} />
              Envía un mensaje para iniciar el chat de soporte.
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              return (
                <div 
                  key={msg.id} 
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{
                    background: isMe ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: isMe ? 'var(--primary-foreground)' : 'var(--foreground)',
                    padding: '1rem',
                    borderRadius: '1rem',
                    borderBottomRightRadius: isMe ? '0' : '1rem',
                    borderBottomLeftRadius: isMe ? '1rem' : '0',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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

        {/* Message Input */}
        {(!userRole || (userRole === 'admin' && selectedUser) || userRole !== 'admin') && (
          <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Escribe tu mensaje de soporte..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '2rem',
                  outline: 'none'
                }}
              />
              <button 
                type="submit" 
                className="btn-primary"
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
