import React, { useState } from 'react';
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
  LifeBuoy
} from 'lucide-react';
import '../styles/global.css';
import NotificationPanel from './NotificationPanel';

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { userRole, logout, isImpersonating, stopImpersonating, currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Error logging out", err);
    }
  };

  const navItems = {
    admin: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Entrenadores', path: '/entrenadores', icon: Users },
      { name: 'Mis Alumnos', path: '/alumnos', icon: UserSquare2 },
      { name: 'Ejercicios', path: '/ejercicios', icon: Dumbbell },
      { name: 'Rutinas', path: '/rutinas', icon: ListTodo },
      { name: 'Mis Rutinas', path: '/mis-rutinas', icon: ClipboardList },
      { name: 'Mi Progreso', path: '/progreso', icon: Activity },
      { name: 'Suplementación', path: '/suplementacion', icon: Pill },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
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
      { name: 'Suplementación', path: '/suplementacion', icon: Pill },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { name: 'Soporte', path: '/soporte', icon: LifeBuoy },
      { name: 'Configuración', path: '/configuracion', icon: Settings },
    ],
    user: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Mis Rutinas', path: '/mis-rutinas', icon: ClipboardList },
      { name: 'Mi Progreso', path: '/progreso', icon: Activity },
      { name: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { name: 'Soporte', path: '/soporte', icon: LifeBuoy },
      { name: 'Configuración', path: '/configuracion', icon: Settings },
    ]
  };

  const currentNavItems = navItems[userRole] || navItems.user;

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
          <h2>Fit<span className="accent">Pro</span></h2>
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
        <header className="topbar glass">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h3>Panel de {userRole === 'admin' ? 'Administrador' : userRole === 'trainer' ? 'Entrenador' : 'Alumno'}</h3>
            {isImpersonating && (
              <span className="badge" style={{ marginLeft: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                Modo: {currentUser.displayName || currentUser.email}
              </span>
            )}
          </div>
          <div className="topbar-right">
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
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
            <div className="user-profile">
              <div className="avatar">{userRole ? userRole.charAt(0).toUpperCase() : 'U'}</div>
              <span className="user-name">{userRole === 'admin' ? 'Admin' : userRole === 'trainer' ? 'Trainer' : 'Alumno'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
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

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
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
            display: block;
          }

          .topbar {
            padding: 0 1rem;
          }

          .page-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
