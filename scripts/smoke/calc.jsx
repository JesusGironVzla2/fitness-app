import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Training from '../../src/pages/Training.jsx';
import AnthropometryPanel from '../../src/components/AnthropometryPanel.jsx';

const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

// Escribe en un <input> controlado por React disparando el setter nativo.
function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, String(value));
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function findInputByLabel(host, texto) {
  for (const label of host.querySelectorAll('label')) {
    if (label.textContent.includes(texto)) {
      const input = label.querySelector('input, select');
      if (input) return input;
    }
  }
  return null;
}

export async function run() {
  const out = [];

  // ---------- Calculadora de 1RM (ejemplo del temario: 60,8 kg x 7 reps) ----------
  {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(<MemoryRouter><Training /></MemoryRouter>);
    await tick(60);

    type(findInputByLabel(host, 'Peso utilizado'), '60.8');
    await tick();
    type(findInputByLabel(host, 'Repeticiones al fallo'), '7');
    await tick(60);

    const valor = host.querySelector('.tr-result-value').textContent.trim();
    out.push({ caso: '1RM: 60,8 kg x 7 reps', esperado: '73.0 kg', obtenido: valor });

    // Tabla de RM submáximos: la fila de 12 reps debe dar 52.5 kg (72,97 x 0,72)
    const filas = [...host.querySelectorAll('.tr-table tr')];
    const fila12 = filas.find(tr => tr.querySelector('td') &&
                                    tr.querySelector('td').textContent.startsWith('12'));
    const peso12 = fila12 ? fila12.querySelectorAll('td')[3].textContent.trim() : '(no encontrada)';
    out.push({ caso: 'RM submáximo a 12 reps (coef. 0,72)', esperado: '52.5 kg', obtenido: peso12 });

    root.unmount(); host.remove();
  }

  // ---------- Antropometría (ejemplo del temario: hombre 25a, 1,70 m, 90 kg) ----------
  {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(
      <AnthropometryPanel
        perfil={{ weight: '90', height: '170', age: '25', gender: 'masculino' }}
        studentId="test-uid"
      />
    );
    await tick(60);

    const bloques = [...host.querySelectorAll('.anthro-block')];
    const valorDe = (titulo) => {
      const b = bloques.find(x => x.querySelector('h4') && x.querySelector('h4').textContent.includes(titulo));
      const v = b && b.querySelector('.anthro-value');
      return v ? v.textContent.trim() : '(no encontrado)';
    };

    out.push({ caso: 'IMC (90 kg / 1,70 m)', esperado: '31.14', obtenido: valorDe('Masa Corporal') });
    out.push({ caso: '% Grasa Deurenberg (hombre, 25a)', esperado: '26.9 %', obtenido: valorDe('Grasa Corporal') });
    out.push({ caso: 'Masa magra', esperado: '65.8 kg', obtenido: valorDe('Masa Magra') });

    const badge = host.querySelector('.anthro-badge');
    out.push({ caso: 'Clasificación del % graso', esperado: 'Sobrepeso', obtenido: badge ? badge.textContent.trim() : '(sin badge)' });

    // El sexo debe venir prellenado desde el perfil
    const sel = findInputByLabel(host, 'Sexo');
    out.push({ caso: 'Sexo prellenado desde el perfil', esperado: '1', obtenido: sel ? sel.value : '(no encontrado)' });

    root.unmount(); host.remove();
  }

  return out;
}
