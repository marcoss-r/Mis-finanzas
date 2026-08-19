import { generarId } from '../util/id.js';
import { mesActual } from '../util/fechas.js';

export function crearPresupuesto(state, { categoria, limite, desde, hasta }) {
  const p = {
    id: generarId('pre'),
    categoria,
    limite: Math.round(Number(limite) * 100) / 100,
    desde: desde || mesActual(),
    hasta: hasta || null,
  };
  state.presupuestos.push(p);
  return p;
}

export function editarPresupuesto(state, id, cambios) {
  const p = state.presupuestos.find((x) => x.id === id);
  if (p) Object.assign(p, cambios);
}

export function eliminarPresupuesto(state, id) {
  state.presupuestos = state.presupuestos.filter((p) => p.id !== id);
}

export function presupuestosVigentes(state, mes) {
  return state.presupuestos.filter((p) => p.desde <= mes && (!p.hasta || p.hasta >= mes));
}

export function gastadoEnCategoria(state, categoria, mes) {
  return Math.round(
    state.movimientos
      .filter((m) => m.tipo === 'gasto' && m.categoria === categoria && m.fecha.slice(0, 7) === mes)
      .reduce((t, m) => t + m.importe, 0) * 100,
  ) / 100;
}
