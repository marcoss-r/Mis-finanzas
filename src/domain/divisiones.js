import { generarId } from '../util/id.js';
import { hoyISO } from '../util/fechas.js';
import { saldoCuenta } from './cuentas.js';
import { crearTraspaso } from './traspasos.js';

export function crearDivision(state, { cuentaId, nombre, objetivo, objetivoFecha, color }) {
  const orden = divisionesDeCuenta(state, cuentaId).length + 1;
  const division = {
    id: generarId('div'),
    cuentaId,
    nombre,
    objetivo: objetivo ? Math.round(Number(objetivo) * 100) / 100 : null,
    objetivoFecha: objetivoFecha || null,
    color: color || '#199e70',
    orden,
  };
  state.divisiones.push(division);
  return division;
}

export function editarDivision(state, id, cambios) {
  const division = state.divisiones.find((d) => d.id === id);
  if (division) Object.assign(division, cambios);
}

export function eliminarDivision(state, id) {
  state.movimientos.forEach((m) => {
    if (m.divisionId === id) m.divisionId = null;
  });
  state.traspasos.forEach((t) => {
    if (t.divisionOrigen === id) t.divisionOrigen = null;
    if (t.divisionDestino === id) t.divisionDestino = null;
  });
  state.divisiones = state.divisiones.filter((d) => d.id !== id);
}

export function divisionesDeCuenta(state, cuentaId) {
  return state.divisiones.filter((d) => d.cuentaId === cuentaId).sort((a, b) => a.orden - b.orden);
}

export function saldoDivision(state, divisionId) {
  if (!divisionId) return 0;
  let saldo = 0;
  for (const m of state.movimientos) {
    if (m.divisionId !== divisionId) continue;
    saldo += m.tipo === 'ingreso' ? m.importe : -m.importe;
  }
  for (const t of state.traspasos) {
    if (t.divisionDestino === divisionId) saldo += t.importe;
    if (t.divisionOrigen === divisionId) saldo -= t.importe;
  }
  return Math.round(saldo * 100) / 100;
}

export function sinAsignar(state, cuentaId) {
  const saldo = saldoCuenta(state, cuentaId);
  const sumaDivisiones = divisionesDeCuenta(state, cuentaId).reduce((t, d) => t + saldoDivision(state, d.id), 0);
  return Math.round((saldo - sumaDivisiones) * 100) / 100;
}

// reparto: [{ divisionId, porcentaje }] sobre el "Sin asignar" actual de la cuenta
export function repartirPorPorcentaje(state, cuentaId, reparto, fecha) {
  const totalPct = reparto.reduce((t, r) => t + Number(r.porcentaje), 0);
  if (totalPct > 100.001) throw new Error('El reparto supera el 100%');
  const disponible = sinAsignar(state, cuentaId);
  const traspasos = [];
  reparto.forEach((r) => {
    if (!(r.porcentaje > 0)) return;
    const importe = Math.round(disponible * (r.porcentaje / 100) * 100) / 100;
    if (importe <= 0) return;
    traspasos.push(crearTraspaso(state, {
      fecha: fecha || hoyISO(),
      importe,
      cuentaOrigen: cuentaId,
      divisionOrigen: null,
      cuentaDestino: cuentaId,
      divisionDestino: r.divisionId,
      nota: 'Reparto inicial por porcentaje',
    }));
  });
  return traspasos;
}

// Cuánto falta ahorrar al mes para llegar al objetivo en objetivoFecha
export function ahorroMensualNecesario(state, divisionId) {
  const division = state.divisiones.find((d) => d.id === divisionId);
  if (!division || !division.objetivo || !division.objetivoFecha) return null;
  const saldo = saldoDivision(state, divisionId);
  const restante = division.objetivo - saldo;
  if (restante <= 0) return 0;
  const hoy = new Date();
  const meta = new Date(`${division.objetivoFecha}T00:00:00`);
  const mesesRestantes = Math.max(1, (meta.getFullYear() - hoy.getFullYear()) * 12 + (meta.getMonth() - hoy.getMonth()));
  return Math.round((restante / mesesRestantes) * 100) / 100;
}
