import React, { useState, useMemo } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildMeasureLog } from '../lib/progress';
import { Calculator, Save, Info, Ruler } from 'lucide-react';
import {
  SOMATOTIPOS,
  calcularIMC,
  AVISO_IMC,
  grasaDeurenberg,
  grasaPlicometria,
  PLIEGUES,
  TABLA_GRASA,
  clasificarGrasa,
  calcularMasaMagra,
  sexoACoeficiente,
} from '../lib/anthropometry';

/**
 * Evaluación antropométrica y de composición corporal.
 *
 * Implementa el bloque "Evaluación Antropométrica y Composición Corporal" del
 * temario de certificación (diapositivas 104 a 116): somatotipo, IMC, índice de
 * grasa corporal (Deurenberg y plicometría) e índice de masa magra.
 *
 * Los resultados se pueden guardar en `progress_logs`, de modo que aparecen
 * después en las gráficas de evolución igual que cualquier otra medida.
 */
export default function AnthropometryPanel({ perfil, studentId, onSaved }) {
  const [peso, setPeso] = useState(perfil?.weight || '');
  const [altura, setAltura] = useState(perfil?.height || '');
  const [edad, setEdad] = useState(perfil?.age || '');
  const [sexo, setSexo] = useState(() => {
    const c = sexoACoeficiente(perfil?.gender);
    return c === null ? '' : String(c);
  });
  const [somatotipo, setSomatotipo] = useState(perfil?.somatotipo || '');

  const [metodo, setMetodo] = useState('deurenberg'); // 'deurenberg' | 'plicometria'
  const [pliegues, setPliegues] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const sexoCoef = sexo === '' ? null : Number(sexo);

  const sumaPliegues = useMemo(
    () =>
      PLIEGUES.reduce((total, p) => {
        const v = parseFloat(pliegues[p.id]);
        return total + (Number.isFinite(v) && v > 0 ? v : 0);
      }, 0),
    [pliegues]
  );

  const pliegesCompletos = PLIEGUES.every((p) => {
    const v = parseFloat(pliegues[p.id]);
    return Number.isFinite(v) && v > 0;
  });

  const imc = calcularIMC(peso, altura);

  const grasa =
    metodo === 'deurenberg'
      ? grasaDeurenberg(imc, edad, sexoCoef)
      : pliegesCompletos
        ? grasaPlicometria(sumaPliegues, sexoCoef)
        : null;

  const clasificacion = grasa !== null ? clasificarGrasa(grasa, sexoCoef) : null;
  const magra = grasa !== null ? calcularMasaMagra(peso, grasa) : null;

  const fmt = (n, dec = 1) => (n === null || n === undefined ? '—' : n.toFixed(dec));

  const handleGuardar = async () => {
    if (!studentId) return;
    setGuardando(true);
    setMensaje('');
    try {
      const aGuardar = [];
      if (imc !== null) aGuardar.push({ metric: 'IMC', value: imc.toFixed(2), unit: '' });
      if (grasa !== null) aGuardar.push({ metric: '% Grasa', value: grasa.toFixed(1), unit: '%' });
      if (magra) {
        aGuardar.push({ metric: 'Masa Magra', value: magra.masaMagra.toFixed(1), unit: 'kg' });
      }
      const pesoNum = parseFloat(peso);
      if (Number.isFinite(pesoNum) && pesoNum > 0) {
        aGuardar.push({ metric: 'Peso Corporal', value: pesoNum.toFixed(1), unit: 'kg' });
      }

      if (aGuardar.length === 0) {
        setMensaje('Completa los datos para poder guardar.');
        return;
      }

      for (const m of aGuardar) {
        await addDoc(
          collection(db, 'progress_logs'),
          buildMeasureLog({ studentId, metric: m.metric, value: m.value, unit: m.unit })
        );
      }

      setMensaje(`Guardado: ${aGuardar.map((m) => m.metric).join(', ')}.`);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Error guardando la evaluación:', err);
      setMensaje('No se pudo guardar: ' + err.message);
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 6000);
    }
  };

  const somatoSel = SOMATOTIPOS.find((s) => s.id === somatotipo);

  return (
    <div className="glass anthro-panel">
      <div className="anthro-head">
        <Calculator size={22} color="var(--primary)" />
        <div>
          <h3>Evaluación Antropométrica</h3>
          <p>
            Calcula tu composición corporal con las fórmulas del temario de certificación.
            Los resultados se pueden guardar y aparecerán en la gráfica de evolución.
          </p>
        </div>
      </div>

      {/* ---------------- Datos base ---------------- */}
      <div className="anthro-grid">
        <label className="anthro-field">
          <span>Peso (kg)</span>
          <input type="number" step="0.1" min="1" value={peso}
            onChange={(e) => setPeso(e.target.value)} placeholder="Ej. 75.5" />
        </label>
        <label className="anthro-field">
          <span>Altura (cm)</span>
          <input type="number" step="1" min="1" value={altura}
            onChange={(e) => setAltura(e.target.value)} placeholder="Ej. 170" />
        </label>
        <label className="anthro-field">
          <span>Edad</span>
          <input type="number" step="1" min="1" value={edad}
            onChange={(e) => setEdad(e.target.value)} placeholder="Ej. 25" />
        </label>
        <label className="anthro-field">
          <span>Sexo</span>
          <select value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Selecciona…</option>
            <option value="1">Hombre</option>
            <option value="0">Mujer</option>
          </select>
        </label>
      </div>

      {sexo === '' && (
        <p className="anthro-note">
          <Info size={14} /> Las fórmulas de grasa corporal del temario sólo definen dos
          coeficientes de sexo (hombre = 1, mujer = 0). Elige el que corresponda para
          poder calcular el porcentaje graso.
        </p>
      )}

      {/* ---------------- IMC ---------------- */}
      <div className="anthro-block">
        <div className="anthro-block-head">
          <h4>Índice de Masa Corporal (IMC)</h4>
          <span className="anthro-value">{fmt(imc, 2)}</span>
        </div>
        <p className="anthro-desc">
          Relación entre tu peso y tu altura: <code>IMC = Peso / Altura²</code>. Es un
          indicador general de la masa total, sin distinguir de qué está compuesta.
        </p>
        <p className="anthro-warn"><Info size={14} /> {AVISO_IMC}</p>
      </div>

      {/* ---------------- Grasa corporal ---------------- */}
      <div className="anthro-block">
        <div className="anthro-block-head">
          <h4>Índice de Grasa Corporal (IGC)</h4>
          <span className="anthro-value" style={{ color: clasificacion?.color }}>
            {fmt(grasa)}{grasa !== null ? ' %' : ''}
          </span>
        </div>
        <p className="anthro-desc">
          Porcentaje del peso que corresponde a tejido graso. Es la medida que de verdad
          indica composición corporal, y la que conviene seguir en el tiempo.
        </p>

        <div className="anthro-tabs">
          <button type="button" className={metodo === 'deurenberg' ? 'on' : ''}
            onClick={() => setMetodo('deurenberg')}>Fórmula de Deurenberg</button>
          <button type="button" className={metodo === 'plicometria' ? 'on' : ''}
            onClick={() => setMetodo('plicometria')}>Plicometría (6 pliegues)</button>
        </div>

        {metodo === 'deurenberg' ? (
          <p className="anthro-desc">
            Estimación a partir del IMC, la edad y el sexo. No necesita instrumental, pero
            es la menos precisa de las tres que recoge el temario.
            <br />
            <code>% Grasa = 1,2 × IMC + 0,23 × edad − 10,8 × sexo − 5,4</code>
          </p>
        ) : (
          <>
            <p className="anthro-desc">
              Medición con plicómetro de los 6 pliegues cutáneos. Más exacta que la fórmula
              anterior porque mide grasa subcutánea real. Introduce cada pliegue en milímetros.
            </p>
            <div className="anthro-grid anthro-grid-3">
              {PLIEGUES.map((p) => (
                <label key={p.id} className="anthro-field">
                  <span>{p.nombre} (mm)</span>
                  <input type="number" step="0.1" min="0"
                    value={pliegues[p.id] || ''}
                    onChange={(e) => setPliegues({ ...pliegues, [p.id]: e.target.value })} />
                </label>
              ))}
            </div>
            <p className="anthro-desc" style={{ marginTop: '0.75rem' }}>
              Suma de pliegues: <strong>{sumaPliegues.toFixed(1)} mm</strong>
              {!pliegesCompletos && ' — faltan pliegues por rellenar'}
            </p>
          </>
        )}

        {clasificacion && (
          <div className="anthro-badge" style={{ background: `${clasificacion.color}20`, color: clasificacion.color, borderColor: `${clasificacion.color}55` }}>
            {clasificacion.nivel}
          </div>
        )}

        {/* Tabla de referencia del temario */}
        <div className="anthro-table-wrap">
          <table className="anthro-table">
            <thead>
              <tr><th>Descripción</th><th>Mujeres</th><th>Hombres</th></tr>
            </thead>
            <tbody>
              {TABLA_GRASA.map((f) => {
                const activa = clasificacion && clasificacion.nivel === f.nivel;
                const rango = ([a, b]) => (b === Infinity ? `${a}%+` : `${a} – ${b}%`);
                return (
                  <tr key={f.nivel} className={activa ? 'on' : ''}>
                    <td><span className="dot" style={{ background: f.color }} />{f.nivel}</td>
                    <td>{rango(f.mujeres)}</td>
                    <td>{rango(f.hombres)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- Masa magra ---------------- */}
      <div className="anthro-block">
        <div className="anthro-block-head">
          <h4>Índice de Masa Magra (IMM)</h4>
          <span className="anthro-value">{magra ? `${fmt(magra.masaMagra)} kg` : '—'}</span>
        </div>
        <p className="anthro-desc">
          Todo lo que no es grasa: músculo, hueso, órganos y agua. Se obtiene restando el
          peso graso al peso total. Es el número que interesa <em>subir</em> mientras el
          porcentaje graso baja.
        </p>
        {magra && (
          <p className="anthro-desc">
            Peso graso: <strong>{fmt(magra.pesoGraso)} kg</strong> · Masa magra:{' '}
            <strong>{fmt(magra.masaMagra)} kg</strong>
          </p>
        )}
      </div>

      {/* ---------------- Somatotipo ---------------- */}
      <div className="anthro-block">
        <div className="anthro-block-head">
          <h4>Somatotipo</h4>
        </div>
        <p className="anthro-desc">
          Clasificación de la estructura corporal. Condiciona la facilidad para ganar masa
          o perder grasa, y por tanto cómo conviene enfocar el entrenamiento.
        </p>
        <div className="anthro-tabs">
          {SOMATOTIPOS.map((s) => (
            <button key={s.id} type="button" className={somatotipo === s.id ? 'on' : ''}
              onClick={() => setSomatotipo(somatotipo === s.id ? '' : s.id)}>
              {s.nombre}
            </button>
          ))}
        </div>
        {somatoSel && <p className="anthro-desc" style={{ marginTop: '0.75rem' }}>{somatoSel.descripcion}</p>}
      </div>

      {/* ---------------- Guardar ---------------- */}
      <div className="anthro-actions">
        <button className="btn-primary" onClick={handleGuardar}
          disabled={guardando || (imc === null && grasa === null)}>
          <Save size={18} /> {guardando ? 'Guardando…' : 'Guardar en mi historial'}
        </button>
        <span className="anthro-hint">
          <Ruler size={14} /> Guarda IMC, % graso, masa magra y peso como medidas fechadas.
        </span>
      </div>

      {mensaje && <p className="anthro-msg">{mensaje}</p>}

      <style>{`
        .anthro-panel {
          padding: 1.5rem;
          border-radius: var(--radius);
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .anthro-head { display: flex; gap: 0.75rem; align-items: flex-start; }
        .anthro-head h3 { margin: 0 0 0.25rem 0; font-size: 1.15rem; }
        .anthro-head p { margin: 0; color: var(--muted-foreground); font-size: 0.875rem; line-height: 1.5; }

        .anthro-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }
        .anthro-grid-3 { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top: 1rem; }

        .anthro-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .anthro-field span { font-size: 0.8rem; color: var(--muted-foreground); }
        .anthro-field input, .anthro-field select {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--foreground);
          padding: 0.6rem 0.75rem;
          border-radius: calc(var(--radius) - 4px);
          outline: none;
          width: 100%;
        }
        .anthro-field input:focus, .anthro-field select:focus { border-color: var(--primary); }

        .anthro-block {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1.25rem;
        }
        .anthro-block-head {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap;
        }
        .anthro-block-head h4 { margin: 0; font-size: 1rem; }
        .anthro-value { font-size: 1.6rem; font-weight: 800; color: var(--primary); letter-spacing: -0.5px; }

        .anthro-desc { margin: 0.5rem 0 0 0; color: var(--muted-foreground); font-size: 0.875rem; line-height: 1.6; }
        .anthro-desc code {
          background: rgba(0,0,0,0.35); padding: 0.15rem 0.4rem; border-radius: 4px;
          font-size: 0.82rem; color: var(--foreground); display: inline-block; margin-top: 0.35rem;
        }
        .anthro-warn, .anthro-note {
          display: flex; align-items: center; gap: 0.4rem; margin: 0.75rem 0 0 0;
          font-size: 0.8rem; color: #eab308;
        }
        .anthro-note { color: #3b82f6; }

        .anthro-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
        .anthro-tabs button {
          background: rgba(255,255,255,0.05); border: 1px solid var(--border);
          color: var(--muted-foreground); padding: 0.45rem 0.9rem;
          border-radius: 999px; font-size: 0.82rem; font-weight: 600;
        }
        .anthro-tabs button.on {
          background: rgba(163,230,53,0.12); border-color: var(--primary); color: var(--primary);
        }

        .anthro-badge {
          display: inline-block; margin-top: 1rem; padding: 0.4rem 1rem;
          border-radius: 999px; font-weight: 700; font-size: 0.85rem; border: 1px solid;
        }

        .anthro-table-wrap { overflow-x: auto; margin-top: 1rem; }
        .anthro-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 340px; }
        .anthro-table th {
          text-align: left; color: var(--muted-foreground); font-weight: 600;
          padding: 0.5rem; border-bottom: 1px solid var(--border);
        }
        .anthro-table td { padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .anthro-table tr.on td { background: rgba(255,255,255,0.05); font-weight: 700; }
        .anthro-table .dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem;
        }

        .anthro-actions {
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
          padding-top: 0.5rem; border-top: 1px solid var(--border);
        }
        .anthro-hint {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.78rem; color: var(--muted-foreground);
        }
        .anthro-msg { margin: 0; font-size: 0.85rem; color: var(--primary); }

        @media (max-width: 768px) {
          .anthro-panel { padding: 1rem; }
          .anthro-actions .btn-primary { width: 100%; }
        }
      `}</style>
    </div>
  );
}
