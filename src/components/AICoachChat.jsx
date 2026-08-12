import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function AICoachChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu entrenador de CoachNode AI. Puedo analizar tu fatiga, tus récords o crear rutinas. ¿En qué te ayudo hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const fetchUserContext = async () => {
    if (!currentUser) return '';
    try {
      const q = query(
        collection(db, "workouts"), 
        where("studentId", "==", currentUser.uid),
        where("completed", "==", true)
      );
      const snap = await getDocs(q);
      const workouts = snap.docs.map(doc => doc.data()).sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 5);
      
      let context = 'Datos recientes del usuario:\n';
      workouts.forEach((w, i) => {
        context += `- Hace ${i} rutinas hizo: ${w.name} con duración de ${Math.round(w.duration/60)} min.\n`;
        if (w.actualData) {
          const m = Object.values(w.actualData).filter(ex => ex.done).length;
          context += `  Completó ${m} ejercicios.\n`;
        }
      });
      return context;
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Falta API KEY");
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const context = await fetchUserContext();
      
      const prompt = `
Eres CoachNode AI, el asistente virtual de fitness integrado en la aplicación CoachNode.
Eres experto en musculación, hipertrofia y ciencias del deporte.
Responde de forma amigable, directa y usando emojis. Trata de mantener tus respuestas concisas (no más de 3-4 párrafos pequeños).
${context}

Historial de conversación:
${messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}`).join('\n')}

Usuario: ${userMessage}
Coach:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setMessages(prev => [...prev, { role: 'assistant', content: response.text() }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error técnico: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="glass"
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.5)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Sparkles size={28} />
      </button>

      {isOpen && (
        <div 
          className="modal glass"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            width: '350px',
            height: '500px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            margin: 0
          }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(to right, #a855f7, #6366f1)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 'bold' }}>
              <Bot size={24} />
              CoachNode AI
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.4)' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={16} color="white" />
                  </div>
                )}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '1rem',
                  background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  color: msg.role === 'user' ? 'black' : 'white',
                  borderTopRightRadius: msg.role === 'user' ? 0 : '1rem',
                  borderTopLeftRadius: msg.role === 'assistant' ? 0 : '1rem',
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Escribiendo...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '1rem', background: 'var(--card)', display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input 
              type="text" 
              className="input-field"
              placeholder="Pregúntame algo..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ flex: 1, borderRadius: '50px', paddingLeft: '1rem' }}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                background: '#a855f7', border: 'none', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                opacity: input.trim() && !isTyping ? 1 : 0.5
              }}
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
