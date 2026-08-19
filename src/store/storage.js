const STORAGE_KEY = 'finanzas:v2';
const CLAVES_V1 = ['movimientos', 'categorias', 'suscripciones', 'limiteMensual'];

const CATEGORIAS_POR_DEFECTO = ['Comida', 'Salidas', 'Ocio', 'Transporte', 'Ajuste', 'Interés', 'Nómina', 'Retribución flexible'];

function estadoPorDefecto() {
  return {
    version: 2,
    cuentas: [],
    divisiones: [],
    movimientos: [],
    traspasos: [],
    suscripciones: [],
    presupuestos: [],
    categorias: [...CATEGORIAS_POR_DEFECTO],
    salario: null,
    repartos: [],
    nominas: [],
    ajustes: {},
  };
}

export function exportarDatosV1() {
  const datos = {};
  CLAVES_V1.forEach((clave) => {
    const valor = localStorage.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  });
  return Object.keys(datos).length ? datos : null;
}

export function borrarDatosV1() {
  CLAVES_V1.forEach((clave) => localStorage.removeItem(clave));
}

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return estadoPorDefecto();
  try {
    const parsed = JSON.parse(raw);
    return { ...estadoPorDefecto(), ...parsed };
  } catch {
    return estadoPorDefecto();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function estadoVacio() {
  return estadoPorDefecto();
}
