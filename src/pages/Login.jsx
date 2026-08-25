import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);
  
  const navigate = useNavigate();
  const { login, signup, resetPassword, authError, clearAuthError } = useAuth();

  // Si la sesión se cerró sola por cuenta suspendida/eliminada, mostrar el motivo.
  React.useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      if (isRegister) {
        // Sólo prospera si aún no hay ningún administrador (ver AuthContext).
        await signup(cleanEmail, password, 'admin');
      } else {
        await login(cleanEmail, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error("Firebase Error:", err);
      
      let errorMsg = 'Error en el servidor.';
      if (err.code === 'auth/email-already-in-use') errorMsg = 'Este correo ya está registrado.';
      else if (err.code === 'auth/weak-password') errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      else if (err.code === 'auth/invalid-credential') errorMsg = 'Correo o contraseña incorrectos.';
      else if (err.code === 'auth/operation-not-allowed') errorMsg = 'El inicio con correo/contraseña está deshabilitado en Firebase.';
      else if (err.code === 'auth/account-disabled') errorMsg = err.message;
      else if (err.code === 'auth/admin-already-exists') errorMsg = err.message;
      else if (err.code === 'auth/user-not-found') errorMsg = 'No existe ninguna cuenta con ese correo.';
      else if (err.code === 'auth/wrong-password') errorMsg = 'Correo o contraseña incorrectos.';
      else if (err.code === 'auth/too-many-requests') errorMsg = 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
      else if (err.code === 'auth/network-request-failed') errorMsg = 'Sin conexión con el servidor. Revisa tu red.';
      else errorMsg = err.message; // Mostrar mensaje completo si es otra cosa (ej. Firestore permissions)
      
      setError(errorMsg);
    }
    
    setLoading(false);
  };

  const handleReset = async () => {
    const cleanEmail = email.trim();
    setError('');
    setAviso('');

    if (!cleanEmail) {
      setError('Escribe tu correo arriba y vuelve a pulsar el enlace.');
      return;
    }

    setEnviandoReset(true);
    try {
      await resetPassword(cleanEmail);
      // Firebase no confirma si la cuenta existe, para no filtrar qué correos
      // están registrados. El mensaje es el mismo en ambos casos.
      setAviso(`Si ${cleanEmail} tiene una cuenta, te llega un enlace para crear una contraseña nueva. Revisa también el spam.`);
    } catch (err) {
      console.error('Error enviando el restablecimiento:', err);
      if (err.code === 'auth/invalid-email') setError('El correo no tiene un formato válido.');
      else if (err.code === 'auth/too-many-requests') setError('Demasiados intentos. Espera unos minutos.');
      else setError('No se pudo enviar el correo: ' + err.message);
    } finally {
      setEnviandoReset(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="logo-container">
          <Dumbbell className="logo-icon" size={48} color="var(--primary)" />
          <h1 className="logo-text">Coach<span className="accent">Node</span></h1>
        </div>
        <p className="subtitle">
          {isRegister ? 'Crea tu cuenta de Administrador' : 'Lleva tu entrenamiento al siguiente nivel'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        {aviso && <div className="notice-message">{aviso}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              type="email" 
              id="email" 
              placeholder="entrenador@ejemplo.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>

        {!isRegister && (
          <div className="forgot-row">
            <button type="button" className="text-btn" onClick={handleReset} disabled={enviandoReset}>
              {enviandoReset ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>
        )}

        <div className="toggle-mode">
          <button type="button" className="text-btn" onClick={() => { setIsRegister(!isRegister); setError(''); setAviso(''); }}>
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primer uso? Crea el Administrador'}
          </button>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: radial-gradient(circle at top right, rgba(163, 230, 53, 0.15), transparent 40%),
                            radial-gradient(circle at bottom left, rgba(163, 230, 53, 0.1), transparent 40%);
          padding: 1rem;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 3rem 2rem;
          border-radius: var(--radius);
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: fade-in 0.6s ease-out;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .logo-text {
          font-size: 2.5rem;
          letter-spacing: -1px;
        }

        .accent {
          color: var(--primary);
        }

        .subtitle {
          color: var(--muted-foreground);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--destructive);
          padding: 0.75rem;
          border-radius: var(--radius);
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          text-align: left;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
        }

        .input-group input {
          background-color: var(--input);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          border-radius: calc(var(--radius) - 4px);
          color: var(--foreground);
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 1px var(--primary);
        }

        .btn-primary {
          background-color: var(--primary);
          color: var(--primary-foreground);
          border: none;
          padding: 0.875rem;
          border-radius: calc(var(--radius) - 4px);
          font-weight: 600;
          font-size: 1rem;
          margin-top: 1rem;
          transition: all 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(163, 230, 53, 0.4);
          background-color: #bef264;
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .notice-message {
          background-color: rgba(163, 230, 53, 0.1);
          color: var(--primary);
          padding: 0.75rem;
          border-radius: var(--radius);
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          border: 1px solid rgba(163, 230, 53, 0.25);
          line-height: 1.5;
        }

        .forgot-row {
          margin-top: 1rem;
          text-align: center;
        }

        .forgot-row .text-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .toggle-mode {
          margin-top: 1.5rem;
        }

        .text-btn {
          background: transparent;
          border: none;
          color: var(--muted-foreground);
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .text-btn:hover {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
