import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { currentRole } from '../smoke/mocks/AuthContext.jsx';
import '../../src/styles/global.css';

import Layout from '../../src/components/Layout.jsx';
import Login from '../../src/pages/Login.jsx';
import Dashboard from '../../src/pages/Dashboard.jsx';
import Trainers from '../../src/pages/Trainers.jsx';
import Exercises from '../../src/pages/Exercises.jsx';
import Students from '../../src/pages/Students.jsx';
import Workouts from '../../src/pages/Workouts.jsx';
import StudentWorkouts from '../../src/pages/StudentWorkouts.jsx';
import StudentProgress from '../../src/pages/StudentProgress.jsx';
import BodyMetrics from '../../src/pages/BodyMetrics.jsx';
import Training from '../../src/pages/Training.jsx';
import Supplements from '../../src/pages/Supplements.jsx';
import Chat from '../../src/pages/Chat.jsx';
import Settings from '../../src/pages/Settings.jsx';
import Support from '../../src/pages/Support.jsx';
import Tips from '../../src/pages/Tips.jsx';
import Wellness from '../../src/pages/Wellness.jsx';

const PAGES = {
  login: Login, dashboard: Dashboard, entrenadores: Trainers, ejercicios: Exercises,
  alumnos: Students, rutinas: Workouts, 'mis-rutinas': StudentWorkouts,
  progreso: StudentProgress, 'control-corporal': BodyMetrics,
  'fuerza-hipertrofia': Training, suplementacion: Supplements, mensajes: Chat,
  soporte: Support, configuracion: Settings, consejos: Tips, wellness: Wellness,
};

const params = new URLSearchParams(location.search);
const nombre = params.get('page') || 'dashboard';
const rol = params.get('role') || 'admin';
const conLayout = params.get('layout') !== '0';

currentRole.value = rol;
const Page = PAGES[nombre] || Dashboard;

// Se registran TODAS las páginas, no sólo la de `?page=`. Con una sola ruta,
// pulsar cualquier enlace del menú llevaba a una ruta que no existía: no
// encajaba ni la del Layout, así que React desmontaba la app entera y dejaba
// `#root` vacío. Parecía un fallo de la app y era del banco de pruebas.
const contenido = conLayout ? (
  <MemoryRouter initialEntries={[`/${nombre}`]}>
    <Routes>
      <Route element={<Layout />}>
        {Object.entries(PAGES).map(([ruta, Componente]) => (
          <Route key={ruta} path={`/${ruta}`} element={<Componente />} />
        ))}
      </Route>
    </Routes>
  </MemoryRouter>
) : (
  <MemoryRouter initialEntries={[`/${nombre}`]}><Page /></MemoryRouter>
);

createRoot(document.getElementById('root')).render(contenido);

// Marca para que el auditor sepa que ya terminó de montar.
setTimeout(() => { window.__LISTO__ = true; }, 400);
