/**
 * Fórmulas y tablas de referencia del material de certificación
 * "Entrenador Personal en Musculación — Nivel II (Therapeutic)".
 *
 * Cada bloque indica la diapositiva de la que procede para poder contrastarlo
 * con el temario. No se han añadido criterios que no aparezcan en el material.
 */

// ---------------------------------------------------------------------------
// Somatotipos (diapositiva 105)
// ---------------------------------------------------------------------------

export const SOMATOTIPOS = [
  {
    id: 'ectomorfo',
    nombre: 'Ectomorfo',
    descripcion:
      'Estructura delgada y alargada, extremidades largas y poca grasa. Le cuesta ganar peso y masa muscular.',
  },
  {
    id: 'mesomorfo',
    nombre: 'Mesomorfo',
    descripcion:
      'Estructura atlética y hombros anchos. Gana masa muscular con facilidad y controla bien el porcentaje graso.',
  },
  {
    id: 'endomorfo',
    nombre: 'Endomorfo',
    descripcion:
      'Estructura ancha y redondeada. Gana masa con facilidad, tanto muscular como grasa, y le cuesta más definir.',
  },
];

// ---------------------------------------------------------------------------
// Índice de Masa Corporal — IMC (diapositiva 108)
//   IMC = Peso / Altura²
// ---------------------------------------------------------------------------

/**
 * @param {number} pesoKg
 * @param {number} alturaCm
 * @returns {number|null} IMC, o null si los datos no son válidos.
 */
export function calcularIMC(pesoKg, alturaCm) {
  const peso = Number(pesoKg);
  const alturaM = Number(alturaCm) / 100;
  if (!Number.isFinite(peso) || !Number.isFinite(alturaM)) return null;
  if (peso <= 0 || alturaM <= 0) return null;
  return peso / (alturaM * alturaM);
}

// El temario advierte expresamente que el IMC no distingue entre grasa y
// músculo, por lo que no es fiable en deportistas. No incluye tabla de
// clasificación de IMC, así que aquí tampoco se inventa ninguna.
export const AVISO_IMC =
  'El IMC no distingue entre grasa y músculo, por eso es poco fiable en personas entrenadas.';

// ---------------------------------------------------------------------------
// Índice de Grasa Corporal — IGC
// ---------------------------------------------------------------------------

/**
 * Fórmula de Deurenberg (diapositivas 111 y 112):
 *   % Grasa = 1,2 × IMC + 0,23 × edad − 10,8 × sexo − 5,4
 *   sexo: hombre = 1, mujer = 0
 *
 * Ejemplo del temario: hombre de 25 años, 1,70 m y 90 kg → 26,91 %.
 *
 * Aquí sale 26,92 porque el cálculo se hace con decimales completos. La
 * diapositiva trunca dos veces (IMC 31,14186… → 31,14 y luego 1,2 × 31,14 =
 * 37,368 → 37,36), y ese truncamiento es lo que le resta la centésima. La
 * diferencia es de redondeo, no de fórmula.
 */
export function grasaDeurenberg(imc, edad, sexoCoef) {
  // Comprobación estricta ANTES de convertir: `Number(null)` es 0, que además
  // es un coeficiente válido (mujer). Sin esta guarda, un perfil sin sexo se
  // calculaba silenciosamente como si fuera mujer.
  if (sexoCoef !== 0 && sexoCoef !== 1) return null;
  const i = Number(imc);
  const e = Number(edad);
  if (!Number.isFinite(i) || !Number.isFinite(e)) return null;
  if (i <= 0 || e <= 0) return null;
  return 1.2 * i + 0.23 * e - 10.8 * sexoCoef - 5.4;
}

/**
 * Los 6 pliegues cutáneos del protocolo de plicometría (diapositiva 113).
 */
export const PLIEGUES = [
  { id: 'abdominal', nombre: 'Abdominal' },
  { id: 'suprailiaco', nombre: 'Suprailíaco' },
  { id: 'subescapular', nombre: 'Subescapular' },
  { id: 'tricipital', nombre: 'Tricipital' },
  { id: 'cuadricipital', nombre: 'Cuadricipital' },
  { id: 'peroneal', nombre: 'Peroneal' },
];

/**
 * Plicometría (diapositiva 113):
 *   Hombres: % Grasa = 3,64 + (suma de los 6 pliegues en mm × 0,097)
 *   Mujeres: % Grasa = 4,56 + (suma de los 6 pliegues en mm × 0,146)
 *
 * @param {number} sumaPliegesMm suma de los 6 pliegues, en milímetros
 * @param {0|1} sexoCoef hombre = 1, mujer = 0
 */
export function grasaPlicometria(sumaPliegesMm, sexoCoef) {
  const suma = Number(sumaPliegesMm);
  if (!Number.isFinite(suma) || suma <= 0) return null;
  if (sexoCoef === 1) return 3.64 + suma * 0.097;
  if (sexoCoef === 0) return 4.56 + suma * 0.146;
  return null;
}

/**
 * Tabla de clasificación del porcentaje graso (diapositiva 109).
 * Los rangos son los del temario, tal cual.
 */
export const TABLA_GRASA = [
  { nivel: 'Grasa esencial', mujeres: [8, 13], hombres: [4, 7], color: '#3b82f6' },
  { nivel: 'Fitness atlético', mujeres: [13.1, 19.9], hombres: [12, 16.9], color: '#10b981' },
  { nivel: 'Normal', mujeres: [20, 27], hombres: [17, 23.9], color: '#a3e635' },
  { nivel: 'Sobrepeso', mujeres: [27.1, 32.9], hombres: [24, 27.9], color: '#eab308' },
  { nivel: 'Obesidad', mujeres: [33, Infinity], hombres: [28, Infinity], color: '#ef4444' },
];

/**
 * Devuelve la fila de TABLA_GRASA que corresponde a un porcentaje.
 * Ojo: la tabla del temario deja huecos entre tramos (por ejemplo, en hombres
 * entre 7 % y 12 %). Cuando un valor cae en un hueco se devuelve la categoría
 * inmediatamente inferior en lugar de inventar un tramo nuevo.
 */
export function clasificarGrasa(porcentaje, sexoCoef) {
  const p = Number(porcentaje);
  if (!Number.isFinite(p)) return null;
  const clave = sexoCoef === 1 ? 'hombres' : 'mujeres';

  let ultima = null;
  for (const fila of TABLA_GRASA) {
    const [min, max] = fila[clave];
    if (p >= min && p <= max) return fila;
    if (p > max) ultima = fila;
  }
  return ultima || TABLA_GRASA[0];
}

// ---------------------------------------------------------------------------
// Índice de Masa Magra — IMM (diapositiva 115)
//   Masa magra = peso total − peso graso
// ---------------------------------------------------------------------------

export function calcularMasaMagra(pesoKg, porcentajeGrasa) {
  const peso = Number(pesoKg);
  const pct = Number(porcentajeGrasa);
  if (!Number.isFinite(peso) || !Number.isFinite(pct)) return null;
  if (peso <= 0 || pct < 0 || pct >= 100) return null;
  const pesoGraso = peso * (pct / 100);
  return { pesoGraso, masaMagra: peso - pesoGraso };
}

// ---------------------------------------------------------------------------
// Test de 1RM — método indirecto (diapositivas 121 a 123)
// ---------------------------------------------------------------------------

/**
 * Fórmula de Gorostiaga (1997):
 *   1RM = Peso utilizado / (1,0278 − 0,0278 × nº repeticiones)
 *
 * Comprobado con el ejemplo del temario: 60,8 kg al fallo en 7 repeticiones
 * → 72,97 kg.
 *
 * Nota: la fórmula de Brzycki (1993) que aparece en la diapositiva 121
 * (100 × peso / 102,78 − 2,78 × reps) es algebraicamente la misma expresión,
 * así que ambas devuelven idéntico resultado. Por eso aquí hay una sola función.
 *
 * Las repeticiones deben hacerse al fallo, y cuantas menos se hagan, más exacta
 * es la estimación.
 */
export function estimar1RM(pesoKg, repeticiones) {
  const peso = Number(pesoKg);
  const reps = Number(repeticiones);
  if (!Number.isFinite(peso) || !Number.isFinite(reps)) return null;
  if (peso <= 0 || reps < 1) return null;
  const divisor = 1.0278 - 0.0278 * reps;
  if (divisor <= 0) return null; // a partir de ~37 repeticiones la fórmula deja de tener sentido
  return peso / divisor;
}

/**
 * Coeficientes para inferir RM submáximos a partir del 1RM (diapositiva 123).
 * Ejemplo del temario: 12 RM = 72,97 kg × 0,72 = 53 kg.
 */
export const COEFICIENTES_RM = [
  { reps: 1, porcentaje: 100, coef: 1.0 },
  { reps: 2, porcentaje: 96, coef: 0.96 },
  { reps: 3, porcentaje: 92, coef: 0.92 },
  { reps: 4, porcentaje: 89, coef: 0.89 },
  { reps: 5, porcentaje: 86, coef: 0.86 },
  { reps: 6, porcentaje: 83, coef: 0.83 },
  { reps: 7, porcentaje: 81, coef: 0.81 },
  { reps: 8, porcentaje: 79, coef: 0.79 },
  { reps: 9, porcentaje: 77, coef: 0.77 },
  { reps: 10, porcentaje: 75, coef: 0.75 },
  { reps: 11, porcentaje: 73, coef: 0.73 },
  { reps: 12, porcentaje: 72, coef: 0.72 },
];

/** Convierte el sexo guardado en el perfil al coeficiente que piden las fórmulas. */
export function sexoACoeficiente(genero) {
  if (genero === 'masculino') return 1;
  if (genero === 'femenino') return 0;
  return null; // 'otro' o sin dato: las fórmulas sólo definen 1 y 0
}
