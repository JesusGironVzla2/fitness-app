/**
 * Único sitio donde se define la navegación de la app.
 *
 * Antes vivía dentro de `Layout.jsx` como tres listas planas —hasta 14 enlaces
 * seguidos, sin jerarquía— y había que repetir cada entrada en el rol de admin,
 * en el de entrenador y en el de alumno. Aquí los enlaces se declaran una vez
 * (`ITEMS`) y cada rol sólo dice qué secciones ve y en qué orden, así que el
 * menú lateral, la barra inferior del móvil y el buscador rápido siempre
 * enseñan lo mismo.
 */
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Settings,
  Pill,
  UserSquare2,
  ListTodo,
  Activity,
  MessageSquare,
  ClipboardList,
  LifeBuoy,
  Sparkles,
  Heart,
  Scale,
  Flame,
} from 'lucide-react';

/**
 * `short` es la etiqueta de la barra inferior del móvil, donde sólo caben unos
 * 10 caracteres. `keywords` alimenta el buscador: son las palabras con las que
 * alguien buscaría la página sin saber cómo se llama en el menú.
 */
export const ITEMS = {
  dashboard: {
    name: 'Inicio',
    short: 'Inicio',
    path: '/dashboard',
    icon: LayoutDashboard,
    keywords: 'panel dashboard resumen principal hoy',
  },
  misRutinas: {
    name: 'Mis Rutinas',
    short: 'Rutinas',
    path: '/mis-rutinas',
    icon: ClipboardList,
    keywords: 'entrenar hoy sesion entrenamiento series repeticiones',
  },
  fuerza: {
    name: 'Fuerza e Hipertrofia',
    short: 'Fuerza',
    path: '/fuerza-hipertrofia',
    icon: Flame,
    keywords: 'rm fuerza hipertrofia volumen carga 1rm maximos',
  },
  progreso: {
    name: 'Mi Progreso',
    short: 'Progreso',
    path: '/progreso',
    icon: Activity,
    keywords: 'graficas evolucion historial marcas records logs',
  },
  control: {
    name: 'Control Corporal',
    short: 'Medidas',
    path: '/control-corporal',
    icon: Scale,
    keywords: 'peso medidas antropometria grasa cintura bascula',
  },
  wellness: {
    name: 'Wellness',
    short: 'Wellness',
    path: '/wellness',
    icon: Heart,
    keywords: 'descanso sueno animo estres bienestar fatiga',
  },
  alumnos: {
    name: 'Mis Alumnos',
    short: 'Alumnos',
    path: '/alumnos',
    icon: UserSquare2,
    keywords: 'clientes deportistas alta usuarios fichas',
  },
  rutinas: {
    name: 'Rutinas',
    short: 'Asignar',
    path: '/rutinas',
    icon: ListTodo,
    keywords: 'asignar planificar plantillas programar semana',
  },
  ejercicios: {
    name: 'Ejercicios',
    short: 'Ejercicios',
    path: '/ejercicios',
    icon: Dumbbell,
    keywords: 'catalogo biblioteca movimientos musculos',
  },
  entrenadores: {
    name: 'Entrenadores',
    short: 'Coaches',
    path: '/entrenadores',
    icon: Users,
    keywords: 'coaches staff equipo personal',
  },
  suplementacion: {
    name: 'Suplementación',
    short: 'Suplem.',
    path: '/suplementacion',
    icon: Pill,
    keywords: 'suplementos creatina proteina vitaminas nutricion',
  },
  consejos: {
    name: 'Consejos',
    short: 'Consejos',
    path: '/consejos',
    icon: Sparkles,
    keywords: 'tips guias recomendaciones aprender ideas',
  },
  mensajes: {
    name: 'Mensajes',
    short: 'Mensajes',
    path: '/mensajes',
    icon: MessageSquare,
    keywords: 'chat hablar entrenador conversacion escribir',
  },
  soporte: {
    name: 'Soporte',
    short: 'Ayuda',
    path: '/soporte',
    icon: LifeBuoy,
    keywords: 'ayuda incidencia problema contacto dudas',
  },
  configuracion: {
    name: 'Configuración',
    short: 'Ajustes',
    path: '/configuracion',
    icon: Settings,
    keywords: 'ajustes perfil cuenta preferencias tema',
  },
};

/**
 * Las secciones agrupan los enlaces por lo que la persona quiere hacer, no por
 * cómo está montada la app: primero entrenar, luego mirar cómo va, luego (si
 * eres entrenador) gestionar a los demás, y al final consulta y cuenta.
 */
export const SECTIONS = {
  admin: [
    { title: 'Entrenar', items: ['dashboard', 'misRutinas', 'fuerza'] },
    { title: 'Mi progreso', items: ['progreso', 'control'] },
    { title: 'Gestión', items: ['alumnos', 'rutinas', 'ejercicios', 'entrenadores'] },
    { title: 'Recursos', items: ['suplementacion', 'consejos'] },
    { title: 'Cuenta', items: ['mensajes', 'soporte', 'configuracion'] },
  ],
  trainer: [
    { title: 'Entrenar', items: ['dashboard', 'misRutinas', 'fuerza'] },
    { title: 'Mi progreso', items: ['progreso', 'control'] },
    { title: 'Gestión', items: ['alumnos', 'rutinas', 'ejercicios'] },
    { title: 'Recursos', items: ['suplementacion', 'consejos'] },
    { title: 'Cuenta', items: ['mensajes', 'soporte', 'configuracion'] },
  ],
  student: [
    { title: 'Entrenar', items: ['dashboard', 'misRutinas', 'fuerza'] },
    { title: 'Mi progreso', items: ['progreso', 'control', 'wellness'] },
    { title: 'Recursos', items: ['consejos'] },
    { title: 'Cuenta', items: ['mensajes', 'soporte', 'configuracion'] },
  ],
};

/**
 * Los cuatro destinos de la barra inferior del móvil; el quinto hueco lo ocupa
 * siempre el botón "Más", que abre el menú completo. Son los de uso diario: un
 * alumno abre su rutina, un entrenador abre su lista de alumnos.
 */
export const QUICK_ITEMS = {
  admin: ['dashboard', 'alumnos', 'rutinas', 'mensajes'],
  trainer: ['dashboard', 'alumnos', 'rutinas', 'mensajes'],
  student: ['dashboard', 'misRutinas', 'progreso', 'mensajes'],
};

const forRole = (mapa, role) => mapa[role] || mapa.student;

/** Secciones del rol, ya resueltas a objetos de enlace. */
export function navSections(role) {
  return forRole(SECTIONS, role).map((seccion) => ({
    title: seccion.title,
    items: seccion.items.map((clave) => ({ key: clave, ...ITEMS[clave] })),
  }));
}

/** Todos los enlaces del rol en una sola lista (buscador, atajos). */
export function navItems(role) {
  return navSections(role).flatMap((seccion) =>
    seccion.items.map((item) => ({ ...item, section: seccion.title }))
  );
}

/** Destinos de la barra inferior del móvil. */
export function quickItems(role) {
  return forRole(QUICK_ITEMS, role).map((clave) => ({ key: clave, ...ITEMS[clave] }));
}

/** Quita acentos y mayúsculas para que "suplementacion" encuentre "Suplementación". */
export function normalize(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Filtra los enlaces del rol por nombre, sección o palabras clave. */
export function searchNav(role, consulta) {
  const q = normalize(consulta).trim();
  const todos = navItems(role);
  if (!q) return todos;

  const palabras = q.split(/\s+/);
  return todos
    .map((item) => {
      const nombre = normalize(item.name);
      const bolsa = `${nombre} ${normalize(item.section)} ${normalize(item.keywords)}`;
      if (!palabras.every((p) => bolsa.includes(p))) return null;
      // Primero lo que empieza por lo escrito, luego lo que lo lleva en el
      // nombre, y al final lo que sólo coincide por palabra clave.
      const puntos = nombre.startsWith(q) ? 0 : nombre.includes(q) ? 1 : 2;
      return { item, puntos };
    })
    .filter(Boolean)
    .sort((a, b) => a.puntos - b.puntos)
    .map((x) => x.item);
}
