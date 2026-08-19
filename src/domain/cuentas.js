import { generarId } from '../util/id.js';
import { hoyISO } from '../util/fechas.js';

export function crearCuenta(state, { nombre, tipo, saldoInicial, tae, divisionInteres, color }) {
  const cuenta = {
    id: generarId('cta'),
    nombre,
    tipo: tipo === 'ahorro' ? 'ahorro' : 'corriente',
    saldoInicial: Math.round((Number(saldoInicial) || 0) * 100) / 100,
    tae: tipo === 'ahorro' ? Number(tae) || 0 : 0,
    divisionInteres: divisionInteres || null,
    color: color || '#3987e5',
    archivada: false,
    creada: hoyISO(),
  };
  state.cuentas.push(cuenta);
  return cuenta;
}

export function editarCuenta(state, id, cambios) {
  const cuenta = state.cuentas.find((c) => c.id === id);
  if (!cuenta) return;
  Object.assign(cuenta, cambios);
  if (cuenta.tipo !== 'ahorro') cuenta.tae = 0;
}

export function archivarCuenta(state, id, archivada = true) {
  const cuenta = state.cuentas.find((c) => c.id === id);
  if (cuenta) cuenta.archivada = archivada;
}

export function cuentasActivas(state) {
  return state.cuentas.filter((c) => !c.archivada);
}

export function saldoCuenta(state, cuentaId) {
  const cuenta = state.cuentas.find((c) => c.id === cuentaId);
  if (!cuenta) return 0;
  let saldo = cuenta.saldoInicial;
  for (const m of state.movimientos) {
    if (m.cuentaId !== cuentaId) continue;
    saldo += m.tipo === 'ingreso' ? m.importe : -m.importe;
  }
  for (const t of state.traspasos) {
    if (t.cuentaDestino === cuentaId) saldo += t.importe;
    if (t.cuentaOrigen === cuentaId) saldo -= t.importe;
  }
  return Math.round(saldo * 100) / 100;
}

export function ajustarSaldo(state, cuentaId, saldoReal, fecha) {
  const actual = saldoCuenta(state, cuentaId);
  const diferencia = Math.round((Number(saldoReal) - actual) * 100) / 100;
  if (Math.abs(diferencia) < 0.005) return null;
  const mov = {
    id: generarId('mov'),
    tipo: diferencia > 0 ? 'ingreso' : 'gasto',
    cuentaId,
    divisionId: null,
    categoria: 'Ajuste',
    nombre: 'Ajuste de saldo',
    importe: Math.abs(diferencia),
    fecha: fecha || hoyISO(),
    origen: 'ajuste',
  };
  state.movimientos.push(mov);
  return mov;
}

export function patrimonioTotal(state) {
  return Math.round(cuentasActivas(state).reduce((t, c) => t + saldoCuenta(state, c.id), 0) * 100) / 100;
}
