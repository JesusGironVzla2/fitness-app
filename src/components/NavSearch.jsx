import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { searchNav } from '../lib/navigation';

/**
 * Buscador rápido de páginas: se abre con Ctrl/Cmd+K o desde la lupa de la
 * barra superior, se escribe y se va. Existe porque con 14 destinos en el menú
 * hay gente que sabe lo que quiere ("mis medidas", "hablar con el entrenador")
 * pero no en qué apartado lo pusimos; buscar por palabras es más rápido que
 * recorrer el menú entero.
 */
export default function NavSearch({ role, onClose }) {
  const [consulta, setConsulta] = useState('');
  const [activo, setActivo] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  const resultados = useMemo(() => searchNav(role, consulta), [role, consulta]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Al escribir cambia la lista, así que la selección vuelve arriba: si no, se
  // quedaba apuntando a una posición que ya era otra página distinta.
  useEffect(() => {
    setActivo(0);
  }, [consulta]);

  // Mantiene a la vista la opción seleccionada con el teclado.
  useEffect(() => {
    const el = listaRef.current?.children[activo];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  const ir = (item) => {
    if (!item) return;
    navigate(item.path);
    onClose();
  };

  const alPulsarTecla = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => (resultados.length ? (i + 1) % resultados.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => (resultados.length ? (i - 1 + resultados.length) % resultados.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      ir(resultados[activo]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="navsearch-overlay" onMouseDown={onClose}>
      <div
        className="navsearch glass"
        role="dialog"
        aria-label="Buscar en la app"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="navsearch-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={alPulsarTecla}
            placeholder="Buscar página: rutinas, medidas, mensajes…"
            aria-label="Buscar página"
          />
          <kbd>esc</kbd>
        </div>

        {resultados.length === 0 ? (
          <p className="navsearch-vacio">
            No hay ninguna página que se llame así. Prueba con «rutina», «peso» o «ayuda».
          </p>
        ) : (
          <div className="navsearch-lista" ref={listaRef}>
            {resultados.map((item, i) => (
              <button
                key={item.key}
                type="button"
                className={`navsearch-item ${i === activo ? 'activo' : ''}`}
                onMouseEnter={() => setActivo(i)}
                onClick={() => ir(item)}
              >
                <item.icon size={18} />
                <span className="navsearch-nombre">{item.name}</span>
                <span className="navsearch-seccion">{item.section}</span>
                {i === activo && <CornerDownLeft size={14} className="navsearch-enter" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .navsearch-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 1rem;
          padding-top: 12vh;
        }

        .navsearch {
          width: 100%;
          max-width: 520px;
          border-radius: var(--radius);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 70vh;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        }

        .navsearch-input {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--muted-foreground);
        }

        .navsearch-input input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          font-size: 1rem;
          color: var(--foreground);
        }

        .navsearch-input kbd {
          font-family: inherit;
          font-size: 0.75rem;
          padding: 0.15rem 0.4rem;
          border: 1px solid var(--border);
          border-radius: 0.35rem;
          color: var(--muted-foreground);
        }

        .navsearch-lista {
          overflow-y: auto;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .navsearch-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          min-height: 44px;
          padding: 0.625rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--muted-foreground);
          border-radius: calc(var(--radius) - 0.25rem);
          text-align: left;
          font-size: 0.95rem;
        }

        .navsearch-item.activo {
          background: rgba(163, 230, 53, 0.12);
          color: var(--primary);
        }

        .navsearch-nombre {
          flex: 1;
          min-width: 0;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .navsearch-seccion {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          flex-shrink: 0;
        }

        .navsearch-enter {
          flex-shrink: 0;
        }

        .navsearch-vacio {
          padding: 1.25rem 1rem;
          color: var(--muted-foreground);
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .navsearch-overlay {
            padding-top: 6vh;
          }

          /* En pantallas pequeñas el atajo de teclado no pinta nada y la
             sección repite lo que ya se ve en el menú. */
          .navsearch-input kbd,
          .navsearch-seccion {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
