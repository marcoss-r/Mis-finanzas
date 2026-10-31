import { generarId } from '../util/id.js';
import { mesesEntre, hoyISO } from '../util/fechas.js';
import { crearMovimiento } from './movimientos.js';

// Una suscripción es un movimiento recurrente mensual. `tipo` puede ser 'gasto' (por
// defecto, p. ej. Netflix) o 'ingreso' (p. ej. los 30 € que cargan cada mes en la tarjeta
// restaurante). Tiene fecha de inicio y, opcionalmente, de fin (ambas inclusive).
export function crearSuscripcion(state, datos) {
  const fechaInicio = datos.fechaInicio || `${datos.desde || hoyISO().slice(0, 7)}-01`;
  const sus = {
    id: generarId('sus'),
    tipo: datos.tipo === 'ingreso' ? 'ingreso' : 'gasto',
    nombre: datos.nombre,
    importe: Math.round(Number(datos.importe) * 100) / 100,
    categoria: datos.categoria,
    cuentaId: datos.cuentaId,
    divisionId: datos.divisionId || null,
    diaCobro: Math.min(28, Math.max(1, Number(datos.diaCobro) || 1)),
    activa: true,
    desde: fechaInicio.slice(0, 7),
    fechaInicio,
    fechaFin: datos.fechaFin || null,
  };
  state.suscripciones.push(sus);
  return sus;
}

export function editarSuscripcion(state, id, cambios) {
  const sus = state.suscripciones.find((s) => s.id === id);
  if (!sus) return;
  Object.assign(sus, cambios);
  if (cambios.importe !== undefined) sus.importe = Math.round(Number(cambios.importe) * 100) / 100;
  if (cambios.diaCobro !== undefined) sus.diaCobro = Math.min(28, Math.max(1, Number(cambios.diaCobro) || 1));
  if (cambios.fechaInicio) sus.desde = cambios.fechaInicio.slice(0, 7);
  if ('fechaFin' in cambios) sus.fechaFin = cambios.fechaFin || null;
}

export function alternarActiva(state, id) {
  const sus = state.suscripciones.find((s) => s.id === id);
  if (sus) sus.activa = !sus.activa;
}

export function eliminarSuscripcion(state, id) {
  state.suscripciones = state.suscripciones.filter((s) => s.id !== id);
}

// Fecha de inicio efectiva: las suscripciones antiguas solo guardaban el mes (`desde`).
export function inicioDeSuscripcion(sus) {
  return sus.fechaInicio || `${sus.desde}-01`;
}

// ¿Está la suscripción vigente (entre inicio y fin) durante el mes dado (YYYY-MM)?
export function suscripcionVigenteEnMes(sus, mes) {
  if (inicioDeSuscripcion(sus).slice(0, 7) > mes) return false;
  if (sus.fechaFin && sus.fechaFin.slice(0, 7) < mes) return false;
  return true;
}

function isoLocal(fecha) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

// Materializa como movimientos reales los cobros (o ingresos) de suscripciones activas que
// ya deberían haberse producido, para que el saldo de la cuenta los refleje. Respeta la
// fecha de inicio y de fin, y no adelanta cobros cuyo día aún no ha llegado. Es idempotente:
// comprueba si ya existe el movimiento de ese mes antes de crearlo.
export function generarCargosPendientes(state, hastaFecha = new Date()) {
  const hastaISO = isoLocal(hastaFecha);
  const hastaMes = hastaISO.slice(0, 7);
  const generados = [];
  state.suscripciones.filter((s) => s.activa).forEach((sus) => {
    const inicio = inicioDeSuscripcion(sus);
    mesesEntre(inicio.slice(0, 7), hastaMes).forEach((mes) => {
      const fecha = `${mes}-${String(sus.diaCobro).padStart(2, '0')}`;
      if (fecha < inicio) return;
      if (sus.fechaFin && fecha > sus.fechaFin) return;
      if (fecha > hastaISO) return;
      const yaExiste = state.movimientos.some((m) => m.origen === 'suscripcion' && m.suscripcionId === sus.id && m.fecha.slice(0, 7) === mes);
      if (yaExiste) return;
      const mov = crearMovimiento(state, {
        tipo: sus.tipo === 'ingreso' ? 'ingreso' : 'gasto',
        cuentaId: sus.cuentaId,
        divisionId: sus.divisionId,
        categoria: sus.categoria,
        nombre: sus.nombre,
        importe: sus.importe,
        fecha,
        origen: 'suscripcion',
      });
      mov.suscripcionId = sus.id;
      generados.push(mov);
    });
  });
  return generados;
}
