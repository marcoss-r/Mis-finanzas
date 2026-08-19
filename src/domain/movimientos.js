import { generarId } from '../util/id.js';

export function crearMovimiento(state, datos) {
  const mov = {
    id: generarId('mov'),
    tipo: datos.tipo,
    cuentaId: datos.cuentaId,
    divisionId: datos.divisionId || null,
    categoria: datos.categoria,
    nombre: datos.nombre,
    importe: Math.round(Number(datos.importe) * 100) / 100,
    fecha: datos.fecha,
    origen: datos.origen || 'manual',
  };
  state.movimientos.push(mov);
  return mov;
}

export function editarMovimiento(state, id, cambios) {
  const mov = state.movimientos.find((m) => m.id === id);
  if (mov) Object.assign(mov, cambios);
}

export function eliminarMovimiento(state, id) {
  state.movimientos = state.movimientos.filter((m) => m.id !== id);
}

export function movimientosDelMes(state, mes) {
  return state.movimientos
    .filter((m) => m.fecha.slice(0, 7) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function movimientosDeCuenta(state, cuentaId) {
  return state.movimientos.filter((m) => m.cuentaId === cuentaId);
}

export function movimientosDeDivision(state, divisionId) {
  return state.movimientos.filter((m) => m.divisionId === divisionId);
}
