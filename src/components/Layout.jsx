import React, { useState, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Pill,
  UserSquare2,
  ListTodo,
  Activity,
  MessageSquare,
  ClipboardList,
  LifeBuoy,
  Sparkles,
  Flame,
  Heart,
  Scale,
  Flame as FlameIcon,
  CloudOff
} from 'lucide-react';
import '../styles/global.css';
import NotificationPanel from './NotificationPanel';
import AICoachChat from './AICoachChat';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { dayKey, workoutDate } from '../lib/dates';
import { roleLabel } from '../lib/roles';

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [streak, setStreak] = useState(0);
  const [sinConexion, setSinConexion] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const navigate = useNavigate();
  const { userRole, logout, isImpersonating, stopImpersonating, currentUser } = useAuth();

  // Firestore guarda en local y sincroniza solo al volver la señal, pero sin
  // ningún aviso el usuario no sabe si sus datos se han guardado o no.
  React.useEffect(() => {
    const online = () => setSinConexion(false);
    const offline = () => setSinConexion(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Los menús de notificaciones y perfil se quedaban abiertos indefinidamente:
  // no había forma de cerrarlos salvo volver a pulsar su propio botón, y el de
  // notificaciones tapaba el contenido al navegar a otra página.
  React.useEffect(() => {
    if (!showNotifications && !showProfileMenu) return;

    const handlePointerDown = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showProfileMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Error logging out", err);
    }
  };

  React.useEffect(() => {
    if (currentUser) {
      const fetchStreak = async () => {
        try {
          const q = query(collection(db, "workouts"), where("studentId", "==", currentUser.uid), where("completed", "==", true));
          const snap = await getDocs(q);

          // `new Date(undefined).toISOString()` lanzaba RangeError con cualquier
          // rutina sin fecha, dejando la racha en 0 para siempre. Además
          // toISOString() devuelve el día en UTC y se comparaba contra días
          // locales, así que la racha se rompía sola según la hora del día.
          const dates = snap.docs
            .map(d => workoutDate(d.data()))
            .filter(Boolean)
            .map(dayKey);
          const uniqueDates = [...new Set(dates)].sort().reverse();
          
          let currentStreak = 0;
          let checkDate = new Date();
          
          if (uniqueDates.length > 0) {
            const todayStr = dayKey(checkDate);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = dayKey(yesterday);
            
            let dateIdx = 0;
            if (uniqueDates[0] === todayStr) {
              currentStreak++;
              dateIdx = 1;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (uniqueDates[0] === yesterdayStr) {
              currentStreak++;
              dateIdx = 1;
              checkDate.setDate(checkDate.getDate() - 2);
            } else {
              setStreak(0);
              return;
            }
            
            while (dateIdx < uniqueDates.length) {
              const expectedStr = dayKey(checkDate);
              if (uniqueDates[dateIdx] === expectedStr) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
                dateIdx++;
              } else {
                break;
              }
            }
          }
          setStreak(currentStreak);
        } catch (e) {
          console.error("Error fetching streak", e);
        }
      };
      fetchStreak();
    }
  }, [currentUser]);

  const navItems = {
    admin: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Entrenadores', path: '/entrenadores', icon: Users },
      { name: 'Mis Alumnos', path: '/alumnos', icon: UserSquare2 },
      { name: 'Ejercicios', path: '/ejercicios', icon: Dumbbell },
      { name: 'Rutinas', path: '/rutinas', icon: ListTodo },
      { name: 'Mis Rutinas', path: '/mis-rutinas', icon: ClipboardList },
      { name: 'Mi Progreso', path: '/progreso', icon: Activity },
      { name: 'Control Corporal', path: '/control-corporal', icon: Scale },
      { name: 'Fuerza e Hipertrofia', path: '/fuerza-hipertrofia', icon: FlameIcon },
      { name: 'Suplementación', path: '/suplementacion', icon: Pill },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { name: 'Consejos', path: '/consejos', icon: Sparkles },
      { name: 'Soporte', path: '/soporte', icon: LifeBuoy },
      { name: 'Configuración', path: '/configuracion', icon: Settings },
    ],
    trainer: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Mis Alumnos', path: '/alumnos', icon: UserSquare2 },
      { name: 'Ejercicios', path: '/ejercicios', icon: Dumbbell },
      { name: 'Rutinas', path: '/rutinas', icon: ListTodo },
      { name: 'Mis Rutinas', path: '/mis-rutinas', icon: ClipboardList },
      { name: 'Mi Progreso', path: '/progreso', icon: Activity },
      { name: 'Control Corporal', path: '/control-corporal', icon: Scale },
      { name: 'Fuerza e Hipertrofia', path: '/fuerza-hipertrofia', icon: FlameIcon },
      { name: 'Suplementación', path: '/suplementacion', icon: Pill },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { name: 'Consejos', path: '/consejos', icon: Sparkles },
      { name: 'Soporte', path: '/soporte', icon: LifeBuoy },
      { name: 'Configuración', path: '/configuracion', icon: Settings },
    ],
    student: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Mis Rutinas', path: '/mis-rutinas', icon: ClipboardList },
      { name: 'Mi Progreso', path: '/progreso', icon: Activity },
      { name: 'Control Corporal', path: '/control-corporal', icon: Scale },
      { name: 'Fuerza e Hipertrofia', path: '/fuerza-hipertrofia', icon: FlameIcon },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { name: 'Consejos', path: '/consejos', icon: Sparkles },
      { name: 'Wellness', path: '/wellness', icon: Heart },
      { name: 'Soporte', path: '/soporte', icon: LifeBuoy },
      { name: 'Configuración', path: '/configuracion', icon: Settings },
    ]
  };

  const currentNavItems = navItems[userRole] || navItems.student;

  return (
    <div className="layout-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Dumbbell className="logo-icon" size={32} color="var(--primary)" />
          <h2>Coach<span className="accent">Node</span></h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {currentNavItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {sinConexion && (
          <div className="offline-banner">
            <CloudOff size={16} />
            Sin conexión. Puedes seguir entrenando: lo que registres se guardará y se sincronizará al volver la señal.
          </div>
        )}

        <header className="topbar glass">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h3>Panel de {roleLabel(userRole)}</h3>
            {isImpersonating && (
              <span className="badge" style={{ marginLeft: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                Modo: {currentUser?.displayName || currentUser?.email || 'Vista de usuario'}
              </span>
            )}
          </div>
          <div className="topbar-right">
            
            {/* Streak Indicator */}
            {streak > 0 && (
              <button 
                onClick={() => navigate('/mis-rutinas')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(249, 115, 22, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '50px', color: '#f97316', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                title="Días seguidos entrenando. ¡No pierdas tu racha!"
              >
                <Flame size={20} fill="#f97316" color="#f97316" />
                <span>{streak}</span>
              </button>
            )}

            <div style={{ position: 'relative' }} ref={notificationsRef}>
              <button className="icon-btn" aria-label="Notificaciones" onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}>
                <Bell size={20} />
              </button>
              {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
              )}
            </div>
            {isImpersonating && (
              <button 
                className="btn-secondary" 
                onClick={() => {
                  stopImpersonating();
                  navigate('/');
                }} 
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                Salir de Vista
              </button>
            )}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <div className="user-profile" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}>
                <div className="avatar">{roleLabel(userRole).charAt(0)}</div>
                <span className="user-name">{roleLabel(userRole)}</span>
              </div>
              
              {showProfileMenu && (
                <div 
                  className="glass" 
                  style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    right: 0, 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    borderRadius: 'var(--radius)',
                    minWidth: '160px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <button 
                    className="nav-item logout-btn" 
                    onClick={handleLogout}
                    style={{ padding: '0.75rem', width: '100%', justifyContent: 'flex-start', margin: 0, fontSize: '0.9rem' }}
                  >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
        
        {/* Asistente IA. Va envuelto porque su botón flotante es `position:
            fixed; left: 2rem`, lo que en escritorio lo pone encima del menú
            lateral y en móvil, con el menú abierto, justo sobre "Cerrar Sesión".
            Se corrige desde aquí para no tocar el componente. */}
        <div className={`ai-coach-slot ${isSidebarOpen ? 'oculto' : ''}`}>
          <AICoachChat />
        </div>
      </main>

      <style>{`
        .layout-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .sidebar {
          width: 260px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          transition: transform 0.3s ease;
          z-index: 50;
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-header h2 {
          font-size: 1.5rem;
          margin: 0;
        }

        .sidebar-header .logo-icon {
          flex-shrink: 0;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          overflow-y: auto;
        }
        
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar-nav::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius);
          color: var(--muted-foreground);
          text-decoration: none;
          font-weight: 500;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          font-size: 1rem;
          cursor: pointer;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--foreground);
        }

        .nav-item.active {
          background: rgba(163, 230, 53, 0.1);
          color: var(--primary);
        }

        .sidebar-footer {
          padding: 1.5rem 1rem;
          border-top: 1px solid var(--border);
        }

        .logout-btn {
          width: 100%;
          color: var(--destructive);
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--destructive);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .topbar {
          height: 70px;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        .topbar-left, .topbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--muted-foreground);
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s;
          min-width: 44px;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn:hover {
          color: var(--foreground);
          background: rgba(255, 255, 255, 0.05);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          border-radius: 2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          cursor: pointer;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--primary-foreground);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .user-name {
          font-weight: 500;
          padding-right: 0.5rem;
        }

        .page-content {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .mobile-toggle, .mobile-close {
          display: none;
          background: transparent;
          border: none;
          color: var(--foreground);
          /* El icono medía 24x27: demasiado pequeño para el dedo, y son los
             dos controles principales de navegación en móvil. */
          min-width: 44px;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          padding: 0;
        }

        .mobile-close {
          margin-left: auto;
        }

        .mobile-toggle:active, .mobile-close:active {
          background: rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 40;
          }

          .mobile-toggle, .mobile-close {
            display: flex;
          }

          .topbar {
            padding: 0 0.75rem;
            gap: 0.5rem;
          }

          .topbar-left, .topbar-right {
            gap: 0.5rem;
            min-width: 0;
          }

          /* "Panel de Administrador" se partía en dos líneas y se salía de la
             barra de 70px. Se recorta con puntos suspensivos en una sola línea. */
          .topbar-left h3 {
            font-size: 0.95rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
          }

          /* El nombre del rol repetía lo que ya dice el título de la barra. */
          .user-name {
            display: none;
          }

          .user-profile {
            padding: 0.25rem;
          }

          .page-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
