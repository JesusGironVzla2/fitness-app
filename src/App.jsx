import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Trainers from './pages/Trainers';
import Exercises from './pages/Exercises';
import Students from './pages/Students';
import Workouts from './pages/Workouts';
import StudentWorkouts from './pages/StudentWorkouts';
import StudentProgress from './pages/StudentProgress';
import Supplements from './pages/Supplements';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Support from './pages/Support';
import Tips from './pages/Tips';
import Wellness from './pages/Wellness';
import BodyMetrics from './pages/BodyMetrics';
import Training from './pages/Training';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { loading } = useAuth();
  
  if (loading) return null;
  
  return <Navigate to="/dashboard" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/entrenadores" element={<Trainers />} />
          <Route path="/ejercicios" element={<Exercises />} />
          <Route path="/alumnos" element={<Students />} />
          <Route path="/rutinas" element={<Workouts />} />
          <Route path="/mis-rutinas" element={<StudentWorkouts />} />
          <Route path="/progreso" element={<StudentProgress />} />
          <Route path="/control-corporal" element={<BodyMetrics />} />
          <Route path="/fuerza-hipertrofia" element={<Training />} />
          <Route path="/suplementacion" element={<Supplements />} />
          <Route path="/mensajes" element={<Chat />} />
          <Route path="/soporte" element={<Support />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="/consejos" element={<Tips />} />
          <Route path="/wellness" element={<Wellness />} />
        </Route>
        
        <Route path="/" element={
          <ProtectedRoute>
            <RootRedirect />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
