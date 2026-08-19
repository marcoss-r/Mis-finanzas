import { mesesEntre } from '../util/fechas.js';
import { saldoCuenta } from './cuentas.js';
import { crearMovimiento } from './movimientos.js';

// Abona `saldo × TAE/12` el último día de cada mes vencido, por cuenta de ahorro.
// Idempotente: no vuelve a abonar un mes que ya tiene su movimiento de interés.
export function abonarInteresesPendientes(state, hastaFecha = new Date()) {
  const hastaMes = hastaFecha.toISOString().slice(0, 7);
  const generados = [];
  state.cuentas.filter((c) => c.tipo === 'ahorro' && c.tae > 0 && !c.archivada).forEach((cuenta) => {
    const desde = cuenta.creada.slice(0, 7);
    mesesEntre(desde, hastaMes).forEach((mes) => {
      if (mes === hastaMes && hastaFecha.getDate() < diasDelMes(mes)) return;
      const yaExiste = state.movimientos.some((m) => m.origen === 'interes' && m.cuentaIdOrigenInteres === cuenta.id && m.fecha.slice(0, 7) === mes);
      if (yaExiste) return;
      const saldo = saldoCuenta(state, cuenta.id);
      if (saldo <= 0) return;
      const importe = Math.round(saldo * (cuenta.tae / 100 / 12) * 100) / 100;
      if (importe <= 0) return;
      const mov = crearMovimiento(state, {
        tipo: 'ingreso',
        cuentaId: cuenta.id,
        divisionId: cuenta.divisionInteres || null,
        categoria: 'Interés',
        nombre: `Interés ${cuenta.nombre}`,
        importe,
        fecha: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`,
        origen: 'interes',
      });
      mov.cuentaIdOrigenInteres = cuenta.id;
      generados.push(mov);
    });
  });
  return generados;
}

function diasDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return new Date(anio, mes, 0).getDate();
}
