import { generarId } from '../util/id.js';
import { mesesEntre, mesActual } from '../util/fechas.js';
import { crearMovimiento } from './movimientos.js';

export function crearSuscripcion(state, datos) {
  const sus = {
    id: generarId('sus'),
    nombre: datos.nombre,
    importe: Math.round(Number(datos.importe) * 100) / 100,
    categoria: datos.categoria,
    cuentaId: datos.cuentaId,
    divisionId: datos.divisionId || null,
    diaCobro: Math.min(28, Math.max(1, Number(datos.diaCobro) || 1)),
    activa: true,
    desde: datos.desde || mesActual(),
  };
  state.suscripciones.push(sus);
  return sus;
}

export function editarSuscripcion(state, id, cambios) {
  const sus = state.suscripciones.find((s) => s.id === id);
  if (sus) Object.assign(sus, cambios);
}

export function alternarActiva(state, id) {
  const sus = state.suscripciones.find((s) => s.id === id);
  if (sus) sus.activa = !sus.activa;
}

export function eliminarSuscripcion(state, id) {
  state.suscripciones = state.suscripciones.filter((s) => s.id !== id);
}

// Materializa como movimientos reales los cobros de suscripciones activas que ya
// deberían haberse producido, para que el saldo de la cuenta los refleje. Es idempotente:
// comprueba si ya existe el movimiento de ese mes antes de crearlo.
export function generarCargosPendientes(state, hastaFecha = new Date()) {
  const hastaMes = hastaFecha.toISOString().slice(0, 7);
  const generados = [];
  state.suscripciones.filter((s) => s.activa).forEach((sus) => {
    mesesEntre(sus.desde, hastaMes).forEach((mes) => {
      const yaExiste = state.movimientos.some((m) => m.origen === 'suscripcion' && m.suscripcionId === sus.id && m.fecha.slice(0, 7) === mes);
      if (yaExiste) return;
      const dia = String(sus.diaCobro).padStart(2, '0');
      const mov = crearMovimiento(state, {
        tipo: 'gasto',
        cuentaId: sus.cuentaId,
        divisionId: sus.divisionId,
        categoria: sus.categoria,
        nombre: sus.nombre,
        importe: sus.importe,
        fecha: `${mes}-${dia}`,
        origen: 'suscripcion',
      });
      mov.suscripcionId = sus.id;
      generados.push(mov);
    });
  });
  return generados;
}
