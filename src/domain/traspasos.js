import { generarId } from '../util/id.js';
import { hoyISO } from '../util/fechas.js';

export function crearTraspaso(state, { fecha, importe, cuentaOrigen, divisionOrigen, cuentaDestino, divisionDestino, nota }) {
  const traspaso = {
    id: generarId('tra'),
    fecha: fecha || hoyISO(),
    importe: Math.round(Number(importe) * 100) / 100,
    cuentaOrigen,
    divisionOrigen: divisionOrigen || null,
    cuentaDestino,
    divisionDestino: divisionDestino || null,
    nota: nota || '',
  };
  state.traspasos.push(traspaso);
  return traspaso;
}

export function eliminarTraspaso(state, id) {
  state.traspasos = state.traspasos.filter((t) => t.id !== id);
}

export function traspasosDeCuenta(state, cuentaId) {
  return state.traspasos.filter((t) => t.cuentaOrigen === cuentaId || t.cuentaDestino === cuentaId);
}
