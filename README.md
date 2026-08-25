# CoachNode

Plataforma para entrenadores y alumnos: rutinas, progreso, medidas corporales,
mensajería y un asistente de IA. React + Vite + Firebase (Auth + Firestore).

## Puesta en marcha

```bash
npm install
```

```bash
npm run dev
```

Otros comandos: `npm run build` (producción), `npm run preview` (servir el build),
`npm run lint` (oxlint).

### Comprobación de humo

```bash
npm run smoke
```

Monta cada página de la app en un DOM headless (jsdom) con Firebase simulado y
comprueba, para los tres roles, que renderiza su contenido y no lanza errores.
Existe porque la app llegó a publicarse con una página en blanco causada por una
variable no declarada: `npm run lint` (con la regla `no-undef` activada) y este
script cubren ese hueco. El código vive en `scripts/smoke/`.

### Auditoría responsive

```bash
npm run responsive
```

Abre cada página en el Chrome instalado en el equipo (vía `puppeteer-core`, sin
descargar ningún navegador) a **320, 360, 390, 430, 768 y 1280 px** y comprueba:

- que ninguna página se desplace en horizontal;
- que no haya texto por debajo de 12 px;
- que ningún control táctil baje de 44 px en móvil;
- que el menú lateral se abra, se cierre, no tape nada y quepa entero sin
  recortarse, y que al desplegar sus secciones aparezcan todos los enlaces;
- que los modales quepan, se puedan recorrer de arriba abajo y no queden
  ocultos tras el botón flotante del asistente.

Deja capturas en `scripts/responsive/capturas/` para revisarlas a ojo. Requiere
Google Chrome o Edge instalado.

## Variables de entorno

Se leen desde `.env.local` (ya ignorado por git). **Todas las variables `VITE_*`
se incluyen en el bundle que se envía al navegador**, así que cualquiera que abra
las herramientas de desarrollo puede leerlas. No pongas aquí claves con permisos
sensibles ni facturación abierta; usa claves restringidas por dominio.

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `VITE_OPENROUTER_API_KEY` | Sí, para la IA | Clave de OpenRouter, el único proveedor de IA del proyecto. |
| `VITE_SITE_URL` | No | Origen a declarar en `HTTP-Referer`. Si falta se usa `window.location.origin`. |

**Reglas fijas de la IA** (ver `.agents/AGENTS.md`):

- El proveedor es **siempre OpenRouter**. No se llama a la API de Gemini
  directamente desde el cliente: hay riesgo de geobloqueo (Venezuela).
- El modelo es **siempre el slug dinámico `openrouter/free`**, nunca un modelo
  concreto, para que OpenRouter enrute al mejor gratuito disponible y la app no
  se rompa si uno sale del tier gratuito.

Las tres llamadas viven en `AICoachChat.jsx`, `Dashboard.jsx` y
`StudentWorkouts.jsx`, y comparten cabeceras a través de
`src/lib/openrouter.js`. El `HTTP-Referer` ya no lleva un dominio escrito a
mano: sale de `VITE_SITE_URL` y, si no está definida, del origen real del
navegador. Cualquier llamada nueva debe usar `openRouterHeaders()` y seguir
mandando el mismo modelo.

## Roles

Tres roles, normalizados en `src/lib/roles.js`:

- `admin` — gestiona entrenadores, ve toda la plataforma y puede suplantar cuentas.
- `trainer` — gestiona sus alumnos, asigna rutinas y registra medidas.
- `student` — entrena, registra progreso y habla con su entrenador.

`user` es una etiqueta antigua equivalente a `student`; `normalizeRole()` la
traduce, así que en el código sólo se comparan los tres valores de arriba.

## Navegación

Todos los destinos se declaran una sola vez en `src/lib/navigation.js`, y de ahí
salen las tres formas de moverse por la app:

- **Menú lateral**, agrupado en secciones plegables —Entrenar, Mi progreso,
  Gestión, Recursos, Cuenta— en vez de la lista plana de hasta 14 enlaces que
  había antes. Cada rol ve sus secciones (`SECTIONS`), con los mismos permisos
  de siempre: 14 destinos el admin, 13 el entrenador, 10 el alumno. Se pliegan
  porque desplegadas ocupaban 950px en un hueco de 580px y un admin tenía seis
  destinos por debajo del corte. Sólo se abre sola la sección de la página en la
  que estás; lo que abras a mano se recuerda en `localStorage`.
- **Barra inferior en móvil** (`QUICK_ITEMS`) con los cuatro destinos de uso
  diario del rol más un botón «Más» que abre el menú completo. Su alto está en
  la variable CSS `--bottom-nav-h`, que usan también el contenido de la página,
  el botón del asistente y el cronómetro de descanso para no quedar tapados.
- **Buscador rápido** con `Ctrl`/`Cmd` + `K` o desde la lupa del menú
  (`src/components/NavSearch.jsx`). Busca por nombre, sección y palabras clave
  (`keywords`) ignorando acentos, así que «peso» encuentra Control Corporal y
  «chat» encuentra Mensajes.

Para añadir una página: se declara en `ITEMS`, se mete en la sección que le
toque dentro de `SECTIONS` y se registra su ruta en `src/App.jsx`. No hay que
tocar `Layout.jsx`.

## Notas de funcionamiento

**Sin conexión.** Firestore usa caché persistente en IndexedDB
(`src/lib/firebase.js`). Lo ya consultado se sigue leyendo sin red y las
escrituras se encolan en local hasta que vuelve la señal; el aviso amarillo del
Layout se lo indica al usuario. Si IndexedDB no está disponible (navegación
privada, por ejemplo), cae a Firestore en memoria en lugar de fallar.

**Acceso de los alumnos.** El entrenador crea la cuenta con una contraseña
inicial, pero puede pulsar «Enviar acceso» en la ficha del alumno para que este
reciba un correo y se ponga la suya. En el login hay «¿Olvidaste tu
contraseña?». Los mensajes no revelan si un correo está registrado o no.

**Estadísticas del panel de admin.** Las cuatro tarjetas de «Estadísticas de la
Plataforma» salen de Firestore (`src/lib/platformStats.js`); antes eran
constantes escritas a mano, así que el panel enseñaba 12/148/356/+24% tuviera la
plataforma lo que tuviera. Las reglas de recuento no son evidentes y están
probadas en el smoke:

- **Entrenadores activos** excluye suspendidos y bajas; **alumnos totales** sólo
  descuenta las bajas, porque un suspendido sigue siendo alumno.
- El rol se lee con `normalizeRole()`: contar por `role` en crudo dejaría fuera
  a quien tenga la etiqueta antigua `user` o ninguna.
- **Crecimiento** compara las altas de alumnos de los últimos 30 días con las de
  los 30 anteriores. Los documentos antiguos no tienen `createdAt`; si no hay
  con qué comparar, la tarjeta dice «—» y explica por qué, en lugar de enseñar
  un 0 % que se leería como un dato.
- El número de rutinas usa el agregado del servidor, que no tiene respaldo en
  caché y falla sin conexión: se cae a contar documentos, que sí responde desde
  la caché.

**Estadísticas del panel de entrenador.** Mismo tratamiento y mismo archivo
(`resumirEntrenador`). «Rutinas Asignadas» y «Sesiones Completadas» salen de
`workouts` filtrado por `trainerId`; una rutina completada sin fecha cuenta
igual, porque se completó: lo único que no se sabe es cuándo.

**Retención** es qué parte de tus alumnos ha entrenado en los últimos 30 días,
contando **alumnos distintos y no sesiones** —si no, uno muy constante taparía a
cinco que lo han dejado— y sólo los que siguen en tu lista, para que dar de baja
a un inactivo no dispare la cifra sola. Sin alumnos asignados dice «—», no 0 %.

«Mis Alumnos» ya leía de Firestore, pero su consulta filtraba por
`role == 'student'` en crudo y dejaba fuera a los alumnos con la etiqueta
antigua `user`. Ahora filtra en memoria con `normalizeRole()`, como el resto.

**Historial por ejercicio.** Al abrir una rutina, cada ejercicio muestra la
última serie efectiva registrada («4x10 · 62,5 kg · RIR 2 · hace 3 días») con un
botón para repetir esos valores. Sale de `workouts.actualData`, que ya se
guardaba desde el principio pero no se mostraba en ninguna parte
(`src/lib/history.js`).

## Contenido del temario de certificación

Dos pantallas implementan material del curso «Entrenador Personal en Musculación
— Nivel II (Therapeutic)». Las fórmulas y tablas viven en
`src/lib/anthropometry.js`, con la diapositiva de origen anotada en cada bloque.

**Control Corporal → Evaluación Antropométrica** (diapositivas 104-116)

- IMC = Peso / Altura², con el aviso de que no distingue grasa de músculo.
- % de grasa por fórmula de Deurenberg y por plicometría de 6 pliegues.
- Tabla de clasificación del % graso por sexo.
- Índice de masa magra y peso graso.
- Somatotipos (ectomorfo, mesomorfo, endomorfo).
- Los resultados se guardan como medidas fechadas y alimentan la gráfica.

**Fuerza e Hipertrofia** (diapositivas 130-157 y 119-123)

- Crecimiento sarcomérico frente a sarcoplásmico.
- Pilares del entrenamiento anaeróbico y TUT por objetivo.
- Parámetros de prescripción de fuerza y de hipertrofia, con sesiones de ejemplo.
- Métodos de hipertrofia (super series, pre/post-fatiga, rest-pause, drop-set) y RIR.
- Calculadora de 1RM por método indirecto y tabla de RM submáximos.
- Criterios de uso del cinturón.

Todas las fórmulas están contrastadas contra los ejemplos ya resueltos del
temario en `npm run smoke`. Dos apuntes sobre el material de origen:

- La fórmula de Brzycki (1993) de la diapositiva 121 es algebraicamente idéntica
  a la de Gorostiaga (1997) tal como está escrita, así que ambas dan el mismo
  resultado y se implementa una sola.
- El ejemplo de Deurenberg da 26,91 % en la diapositiva y 26,92 % en la app
  porque la diapositiva trunca pasos intermedios. Es redondeo, no discrepancia
  de fórmula.

## Modelo de datos (Firestore)

| Colección | Campos clave |
| --- | --- |
| `users` | `role`, `status` (`active` / `suspended` / `deleted`), `trainerId`, datos de perfil |
| `exercises` | `name`, `targetMuscle`, `description`, `imageUrl` |
| `workouts` | `studentId`, `trainerId`, `date` (`YYYY-MM-DD`), `exercises[]`, `completed`, `actualData`, `duration` |
| `progress_logs` | `studentId`, `type` (`RM` / `Medida` / `Water`), `metric`, `value`, `unit`, `createdAt` |
| `messages` | `chatId`, `senderId`, `receiverId`, `text`, `createdAt` |
| `notifications` | `targetRole`, `targetUserId`, `senderId`, `title`, `message`, `createdAt` |

Los `progress_logs` se leen y escriben siempre a través de `src/lib/progress.js`.
Existen documentos antiguos con `userId` en lugar de `studentId` y `type: 'metric'`
en lugar de `'Medida'`; la capa de lectura acepta ambas formas y la de escritura
genera sólo la canónica.

Las fechas llegan en tres formatos distintos (ISO, `YYYY-MM-DD` y `Timestamp` de
Firestore) y algunos documentos no tienen ninguna, así que todo el manejo de
fechas pasa por `src/lib/dates.js` en lugar de `new Date(...)` directo.

## Seguridad

El control de acceso por rol de esta app es **sólo de interfaz**: decide qué se
muestra, no qué se puede leer o escribir. La protección real tiene que estar en
las reglas de seguridad de Firestore, que no viven en este repositorio. Como
mínimo deberían garantizar que:

- un alumno sólo lee y escribe sus propios `workouts` y `progress_logs`;
- un entrenador sólo accede a los documentos de sus alumnos (`trainerId`);
- nadie puede modificar su propio campo `role` ni `status`;
- el borrado masivo de `workouts` / `progress_logs` (Ajustes → Zona de Peligro)
  queda restringido a administradores.
