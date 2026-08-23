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
- que el menú lateral se abra, se cierre y no tape nada;
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

**Reglas fijas de la IA** (ver `.agents/AGENTS.md`):

- El proveedor es **siempre OpenRouter**. No se llama a la API de Gemini
  directamente desde el cliente: hay riesgo de geobloqueo (Venezuela).
- El modelo es **siempre el slug dinámico `openrouter/free`**, nunca un modelo
  concreto, para que OpenRouter enrute al mejor gratuito disponible y la app no
  se rompa si uno sale del tier gratuito.

Las tres llamadas viven en `AICoachChat.jsx`, `Dashboard.jsx` y
`StudentWorkouts.jsx`. Si alguna vez se centralizan, deben seguir mandando el
mismo modelo y la misma cabecera `HTTP-Referer: https://coachnode.vercel.app`.

## Roles

Tres roles, normalizados en `src/lib/roles.js`:

- `admin` — gestiona entrenadores, ve toda la plataforma y puede suplantar cuentas.
- `trainer` — gestiona sus alumnos, asigna rutinas y registra medidas.
- `student` — entrena, registra progreso y habla con su entrenador.

`user` es una etiqueta antigua equivalente a `student`; `normalizeRole()` la
traduce, así que en el código sólo se comparan los tres valores de arriba.

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
