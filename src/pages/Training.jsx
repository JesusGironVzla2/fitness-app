import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Flame, Calculator, Info, Save, Timer, Layers } from 'lucide-react';
import { estimar1RM, COEFICIENTES_RM } from '../lib/anthropometry';
import '../styles/global.css';

/**
 * Referencia de prescripción de entrenamiento anaeróbico.
 *
 * Contenido tomado del Módulo III del temario de certificación
 * "Entrenador Personal en Musculación — Nivel II" (diapositivas 130 a 157):
 * tipos de crecimiento muscular, pilares del entrenamiento anaeróbico, TUT,
 * parámetros de fuerza y de hipertrofia, métodos de hipertrofia y RIR.
 *
 * Incluye además la calculadora de 1RM por método indirecto (diapositivas
 * 119-123), que puede guardar el resultado en el historial de progreso.
 */

const PILARES = [
  {
    nombre: 'Tensión mecánica',
    desc: 'La carga que soporta el músculo. A mayor peso, mayor tensión mecánica. Es el estímulo principal del entrenamiento de fuerza.',
  },
  {
    nombre: 'Estrés metabólico',
    desc: 'Respuesta funcional, endocrina y metabólica que busca recobrar el equilibrio del organismo. A mayor estrés metabólico, mayor liberación hormonal y más adaptaciones neuromusculares.',
  },
  {
    nombre: 'Daño muscular',
    desc: 'Microrroturas de la fibra provocadas por el ejercicio. Reparadas con descanso y nutrición adecuados, son parte del proceso de adaptación.',
  },
];

const CRECIMIENTO = [
  {
    tipo: 'Sarcomérica',
    asociado: 'Entrenamiento de FUERZA',
    desc: 'Aumento del tamaño de la fibra muscular. Gran aumento de la fuerza y ligero aumento del tamaño.',
    color: '#ef4444',
  },
  {
    tipo: 'Sarcoplásmica',
    asociado: 'Entrenamiento de HIPERTROFIA',
    desc: 'Aumento de la cantidad de fibras musculares. Ligero aumento de la fuerza y gran aumento del tamaño del músculo.',
    color: '#a855f7',
  },
];

const METODOS = [
  {
    nombre: 'Super series',
    desc: 'Encadenar ejercicios sin descanso entre ellos: biseries (2), triseries (3) o series gigantes (4 o más).',
  },
  {
    nombre: 'Pre-fatiga / Post-fatiga',
    desc: 'Combinar un ejercicio aislado con uno multiarticular. En pre-fatiga se aísla primero para llegar cansado al básico; en post-fatiga, al revés.',
  },
  {
    nombre: 'Rest-pause',
    desc: 'Llegar al fallo, descansar unos 10 segundos y continuar hasta el fallo de nuevo dentro de la misma serie.',
  },
  {
    nombre: 'Drop-set',
    desc: 'Hacer 3 subseries bajando un 30 % el peso en cada una. Las tres juntas equivalen a una sola serie.',
  },
];

const SESION_FUERZA = [
  { ejercicio: 'Press de banca', series: '5x5 (6RM)', descanso: '180 seg' },
  { ejercicio: 'Sentadilla con barra', series: '5x5 (6RM)', descanso: '180 seg' },
  { ejercicio: 'Ejercicio accesorio', series: '2x8 (15RM)', descanso: '60 seg' },
  { ejercicio: 'Ejercicio accesorio', series: '2x8 (15RM)', descanso: '60 seg' },
];

const SESION_HIPERTROFIA = [
  { ejercicio: 'Remo con barra', series: '4x12 (15RM)', descanso: '60 seg' },
  { ejercicio: 'Jalón al pecho', series: '3x12 (15RM)', descanso: '60 seg' },
  { ejercicio: 'Remo con mancuerna', series: '3x12 (15RM)', descanso: '60 seg' },
  { ejercicio: 'Curl de bíceps', series: '3x12 (15RM)', descanso: '60 seg' },
  { ejercicio: 'Curl predicador', series: '3x12 (15RM)', descanso: '60 seg' },
];

export default function Training() {
  const { currentUser } = useAuth();

  const [pesoRM, setPesoRM] = useState('');
  const [repsRM, setRepsRM] = useState('');
  const [ejercicioRM, setEjercicioRM] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const rm = estimar1RM(pesoRM, repsRM);

  const handleGuardarRM = async () => {
    if (rm === null) return;
    setGuardando(true);
    setMensaje('');
    try {
      await addDoc(collection(db, 'progress_logs'), {
        studentId: currentUser.uid,
        type: 'RM',
        exerciseOrBodyPart: ejercicioRM.trim() || 'Ejercicio sin especificar',
        value: rm.toFixed(1),
        unit: 'kg',
        notes: `Estimado (Gorostiaga): ${pesoRM}kg x ${repsRM} reps al fallo`,
        createdAt: new Date().toISOString(),
      });
      setMensaje(`Guardado: ${rm.toFixed(1)} kg de 1RM estimado.`);
      setPesoRM('');
      setRepsRM('');
      setEjercicioRM('');
    } catch (err) {
      console.error('Error guardando el RM:', err);
      setMensaje('No se pudo guardar: ' + err.message);
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 6000);
    }
  };

  return (
    <div className="training-page">
      <div className="page-header">
        <div>
          <h1>Fuerza e Hipertrofia</h1>
          <p>Cómo se prescribe cada objetivo, según el temario de certificación Nivel II.</p>
        </div>
      </div>

      {/* ---------- Tipos de crecimiento ---------- */}
      <section className="tr-section">
        <h2><Layers size={20} /> Tipos de crecimiento muscular</h2>
        <p className="tr-lead">
          Fuerza e hipertrofia no son lo mismo: producen adaptaciones distintas en el músculo.
          De ahí que se entrenen con parámetros diferentes.
        </p>
        <div className="tr-cards">
          {CRECIMIENTO.map((c) => (
            <div key={c.tipo} className="glass tr-card" style={{ borderTop: `3px solid ${c.color}` }}>
              <h3 style={{ color: c.color }}>{c.tipo}</h3>
              <span className="tr-tag">{c.asociado}</span>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Pilares ---------- */}
      <section className="tr-section">
        <h2><Flame size={20} /> Pilares del entrenamiento anaeróbico</h2>
        <p className="tr-lead">
          Los tres mecanismos que provocan la adaptación. Cualquier rutina debería estimular
          alguno de ellos de forma deliberada.
        </p>
        <div className="tr-cards">
          {PILARES.map((p) => (
            <div key={p.nombre} className="glass tr-card">
              <h3>{p.nombre}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Parámetros: fuerza vs hipertrofia ---------- */}
      <section className="tr-section">
        <h2><Dumbbell size={20} /> Parámetros de prescripción</h2>

        <div className="tr-cards">
          <div className="glass tr-proto" style={{ borderLeft: '4px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444' }}>Entrenamiento de FUERZA</h3>
            <p className="tr-obj">
              Todo entrenamiento destinado a aumentar la fuerza máxima en movimientos
              multiarticulares. <strong>Objetivo: mejorar el 1RM.</strong>
            </p>
            <dl className="tr-params">
              <div><dt>Selección del ejercicio</dt><dd>Multiarticular</dd></div>
              <div><dt>Series</dt><dd>4 – 6</dd></div>
              <div><dt>Repeticiones</dt><dd>1 – 6</dd></div>
              <div><dt>Intensidad</dt><dd>85 – 100 % del RM</dd></div>
              <div><dt>Nº de ejercicios</dt><dd>1 – 3</dd></div>
              <div><dt>Descanso entre series</dt><dd>Alto</dd></div>
              <div><dt>TUT por serie</dt><dd>~15 segundos</dd></div>
            </dl>
            <p className="tr-effects">
              Efecto generalizado · Máximo estrés metabólico · Se busca <strong>prevenir la fatiga</strong>
            </p>
          </div>

          <div className="glass tr-proto" style={{ borderLeft: '4px solid #a855f7' }}>
            <h3 style={{ color: '#a855f7' }}>Entrenamiento de HIPERTROFIA</h3>
            <p className="tr-obj">
              Busca el aumento del tamaño del músculo, acumulando volumen y estrés metabólico
              con cargas moderadas.
            </p>
            <dl className="tr-params">
              <div><dt>Selección del ejercicio</dt><dd>Multiarticular o selectivo</dd></div>
              <div><dt>Series</dt><dd>3 – 4 (varía)</dd></div>
              <div><dt>Repeticiones</dt><dd>12 – 15</dd></div>
              <div><dt>Intensidad</dt><dd>70 – 83 % del RM</dd></div>
              <div><dt>Nº de ejercicios</dt><dd>Más de 3</dd></div>
              <div><dt>Descanso entre series</dt><dd>60 seg (varía)</dd></div>
              <div><dt>TUT por serie</dt><dd>30 – 60 segundos</dd></div>
            </dl>
            <p className="tr-effects">
              Efecto generalizado o localizado · Alto estrés metabólico · <strong>Genera fatiga</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Sesiones de ejemplo ---------- */}
      <section className="tr-section">
        <h2><Timer size={20} /> Sesiones de ejemplo</h2>
        <div className="tr-cards">
          <div className="glass tr-card">
            <h3 style={{ color: '#ef4444' }}>Día de fuerza</h3>
            <div className="tr-table-wrap">
              <table className="tr-table">
                <thead><tr><th>Ejercicio</th><th>Series x rep.</th><th>Descanso</th></tr></thead>
                <tbody>
                  {SESION_FUERZA.map((f, i) => (
                    <tr key={i}><td>{f.ejercicio}</td><td>{f.series}</td><td>{f.descanso}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tr-foot">90 seg entre ejercicios · Duración aproximada: 60 min</p>
          </div>

          <div className="glass tr-card">
            <h3 style={{ color: '#a855f7' }}>Día de hipertrofia (espalda / bíceps)</h3>
            <div className="tr-table-wrap">
              <table className="tr-table">
                <thead><tr><th>Ejercicio</th><th>Series x rep.</th><th>Descanso</th></tr></thead>
                <tbody>
                  {SESION_HIPERTROFIA.map((f, i) => (
                    <tr key={i}><td>{f.ejercicio}</td><td>{f.series}</td><td>{f.descanso}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tr-foot">60 seg entre ejercicios · Duración aproximada: 50 min</p>
          </div>
        </div>
      </section>

      {/* ---------- Métodos de hipertrofia + RIR ---------- */}
      <section className="tr-section">
        <h2><Flame size={20} /> Métodos de hipertrofia</h2>
        <p className="tr-lead">Recursos para aumentar el estímulo sin necesidad de subir la carga.</p>
        <div className="tr-cards">
          {METODOS.map((m) => (
            <div key={m.nombre} className="glass tr-card">
              <h3>{m.nombre}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="glass tr-card tr-rir">
          <h3>¿Hace falta entrenar al fallo? — Método RIR</h3>
          <p>
            RIR son las <strong>repeticiones de reserva</strong>: las que podrías haber hecho y
            no hiciste. Permite no llegar al fallo y aun así rendir en todas las series.
          </p>
          <p className="tr-example">
            Ejemplo del temario: una serie de 12 repeticiones con el peso de tu 15RM deja
            <strong> RIR = 3</strong>, que es el rango óptimo para hipertrofia.
          </p>
        </div>
      </section>

      {/* ---------- Calculadora 1RM ---------- */}
      <section className="tr-section">
        <h2><Calculator size={20} /> Calculadora de 1RM (método indirecto)</h2>
        <p className="tr-lead">
          El 1RM es el peso máximo con el que se puede hacer una repetición en buena forma.
          Este método lo <em>estima</em> a partir de una serie llevada al fallo, sin necesidad
          de intentar el levantamiento máximo real.
        </p>

        <div className="glass tr-calc">
          <div className="tr-calc-grid">
            <label>
              <span>Ejercicio</span>
              <input type="text" value={ejercicioRM} placeholder="Ej. Press de banca"
                onChange={(e) => setEjercicioRM(e.target.value)} />
            </label>
            <label>
              <span>Peso utilizado (kg)</span>
              <input type="number" step="0.1" min="1" value={pesoRM} placeholder="Ej. 60.8"
                onChange={(e) => setPesoRM(e.target.value)} />
            </label>
            <label>
              <span>Repeticiones al fallo</span>
              <input type="number" step="1" min="1" max="12" value={repsRM} placeholder="Ej. 7"
                onChange={(e) => setRepsRM(e.target.value)} />
            </label>
          </div>

          <div className="tr-result">
            <span className="tr-result-label">1RM estimado</span>
            <span className="tr-result-value">{rm === null ? '—' : `${rm.toFixed(1)} kg`}</span>
          </div>

          <p className="tr-note">
            <Info size={14} /> Las repeticiones deben hacerse al fallo. Cuantas menos
            repeticiones, más exacta es la estimación.
          </p>
          <p className="tr-formula">
            <code>1RM = Peso / (1,0278 − 0,0278 × repeticiones)</code> — Gorostiaga (1997)
          </p>

          <div className="tr-calc-actions">
            <button className="btn-primary" onClick={handleGuardarRM} disabled={rm === null || guardando}>
              <Save size={18} /> {guardando ? 'Guardando…' : 'Guardar en mi progreso'}
            </button>
          </div>
          {mensaje && <p className="tr-msg">{mensaje}</p>}

          {rm !== null && (
            <div className="tr-table-wrap" style={{ marginTop: '1.5rem' }}>
              <h4 className="tr-sub">RM submáximos a partir de tu 1RM</h4>
              <p className="tr-lead" style={{ marginBottom: '0.75rem' }}>
                Con qué peso deberías trabajar según las repeticiones que quieras hacer.
              </p>
              <table className="tr-table">
                <thead>
                  <tr><th>Repeticiones</th><th>% del 1RM</th><th>Coef.</th><th>Peso</th></tr>
                </thead>
                <tbody>
                  {COEFICIENTES_RM.map((c) => {
                    const esFuerza = c.reps <= 6;
                    return (
                      <tr key={c.reps}>
                        <td>
                          {c.reps}
                          <span className="tr-zone" style={{ color: esFuerza ? '#ef4444' : '#a855f7' }}>
                            {esFuerza ? 'fuerza' : 'hipertrofia'}
                          </span>
                        </td>
                        <td>{c.porcentaje} %</td>
                        <td>{c.coef.toFixed(2)}</td>
                        <td><strong>{(rm * c.coef).toFixed(1)} kg</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Uso del cinturón ---------- */}
      <section className="tr-section">
        <div className="glass tr-card tr-belt">
          <h3>Uso del cinturón</h3>
          <p>
            Aumenta la presión intraabdominal para dar más estabilidad a la columna con cargas
            pesadas, pero resta participación a la musculatura lumbar. Por eso se reserva para:
          </p>
          <ul>
            <li>Levantamientos con cargas superiores al <strong>90 % del 1RM</strong> (1 a 3 repeticiones).</li>
            <li>Cuando lo prescriba un profesional de la salud (médico, fisioterapeuta o terapeuta ocupacional).</li>
          </ul>
        </div>
      </section>

      <p className="tr-source">
        Contenido basado en el temario «Entrenador Personal en Musculación — Nivel II
        (Therapeutic)», Módulos II y III.
      </p>

      <style>{`
        .training-page { display: flex; flex-direction: column; gap: 2.5rem; }
        .tr-section { display: flex; flex-direction: column; gap: 1rem; }
        .tr-section h2 {
          display: flex; align-items: center; gap: 0.6rem;
          font-size: 1.25rem; margin: 0; color: var(--foreground);
        }
        .tr-lead { color: var(--muted-foreground); font-size: 0.9rem; line-height: 1.6; margin: 0; }

        .tr-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .tr-card { padding: 1.5rem; border-radius: var(--radius); }
        .tr-card h3 { margin: 0 0 0.6rem 0; font-size: 1.05rem; }
        .tr-card p { color: var(--muted-foreground); font-size: 0.88rem; line-height: 1.6; margin: 0 0 0.5rem 0; }

        .tr-tag {
          display: inline-block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;
          text-transform: uppercase; color: var(--muted-foreground);
          background: rgba(255,255,255,0.06); padding: 0.2rem 0.6rem;
          border-radius: 999px; margin-bottom: 0.75rem;
        }

        .tr-proto { padding: 1.5rem; border-radius: var(--radius); }
        .tr-proto h3 { margin: 0 0 0.75rem 0; font-size: 1.05rem; letter-spacing: -0.3px; }
        .tr-obj { color: var(--muted-foreground); font-size: 0.88rem; line-height: 1.6; margin: 0 0 1.25rem 0; }

        .tr-params { margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
        .tr-params > div {
          display: flex; justify-content: space-between; gap: 1rem;
          padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tr-params dt { color: var(--muted-foreground); font-size: 0.85rem; margin: 0; }
        .tr-params dd { margin: 0; font-weight: 700; font-size: 0.88rem; text-align: right; }

        .tr-effects {
          margin: 1.25rem 0 0 0; font-size: 0.8rem; color: var(--muted-foreground);
          padding-top: 0.75rem; border-top: 1px solid var(--border); line-height: 1.6;
        }

        .tr-table-wrap { overflow-x: auto; }
        .tr-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 320px; }
        .tr-table th {
          text-align: left; padding: 0.5rem; color: var(--muted-foreground);
          font-weight: 600; border-bottom: 1px solid var(--border); white-space: nowrap;
        }
        .tr-table td { padding: 0.55rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .tr-foot { margin: 0.9rem 0 0 0; font-size: 0.8rem; color: var(--muted-foreground); }
        .tr-sub { margin: 0 0 0.25rem 0; font-size: 0.95rem; }
        .tr-zone { display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.4px; }

        .tr-rir { border: 1px solid rgba(168,85,247,0.3); }
        .tr-example {
          background: rgba(168,85,247,0.08); border-left: 3px solid #a855f7;
          padding: 0.75rem 1rem; border-radius: 4px; margin-top: 0.75rem !important;
        }

        .tr-calc { padding: 1.5rem; border-radius: var(--radius); }
        .tr-calc-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem; margin-bottom: 1.25rem;
        }
        .tr-calc-grid label { display: flex; flex-direction: column; gap: 0.35rem; }
        .tr-calc-grid span { font-size: 0.8rem; color: var(--muted-foreground); }
        .tr-calc-grid input {
          background: rgba(255,255,255,0.05); border: 1px solid var(--border);
          color: var(--foreground); padding: 0.6rem 0.75rem;
          border-radius: calc(var(--radius) - 4px); outline: none; width: 100%;
        }
        .tr-calc-grid input:focus { border-color: var(--primary); }

        .tr-result {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 1rem; padding: 1rem 1.25rem; border-radius: var(--radius);
          background: rgba(163,230,53,0.08); border: 1px solid rgba(163,230,53,0.25);
        }
        .tr-result-label { font-size: 0.85rem; color: var(--muted-foreground); }
        .tr-result-value { font-size: 1.9rem; font-weight: 800; color: var(--primary); letter-spacing: -1px; }

        .tr-note {
          display: flex; align-items: center; gap: 0.4rem;
          margin: 1rem 0 0 0; font-size: 0.8rem; color: #3b82f6;
        }
        .tr-formula { margin: 0.5rem 0 0 0; font-size: 0.8rem; color: var(--muted-foreground); }
        .tr-formula code {
          background: rgba(0,0,0,0.35); padding: 0.15rem 0.4rem;
          border-radius: 4px; color: var(--foreground);
        }
        .tr-calc-actions { margin-top: 1.25rem; }
        .tr-msg { margin: 0.75rem 0 0 0; font-size: 0.85rem; color: var(--primary); }

        .tr-belt { border: 1px solid rgba(234,179,8,0.3); }
        .tr-belt ul {
          margin: 0.75rem 0 0 0; padding-left: 1.25rem;
          color: var(--muted-foreground); font-size: 0.88rem; line-height: 1.8;
        }

        .tr-source {
          font-size: 0.78rem; color: var(--muted-foreground);
          border-top: 1px solid var(--border); padding-top: 1rem; margin: 0;
        }

        @media (max-width: 768px) {
          .tr-calc, .tr-card, .tr-proto { padding: 1.15rem; }
          .tr-calc-actions .btn-primary { width: 100%; }
        }
      `}</style>
    </div>
  );
}
