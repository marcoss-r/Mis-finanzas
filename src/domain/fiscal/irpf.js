import { obtenerTablasFiscales, aplicarEscala } from './tablas.js';
import { edadDesdeFecha } from '../../util/fechas.js';

export function calcularMinimoPersonalYFamiliar(state, situacion) {
  const tablas = obtenerTablasFiscales(state);
  let minimo = tablas.minimos.contribuyente;
  const edad = situacion.edad || 0;
  if (edad >= 65) minimo += tablas.minimos.mayor65;
  if (edad >= 75) minimo += tablas.minimos.mayor75;

  (situacion.hijos || []).forEach((hijo, i) => {
    const tramos = [tablas.minimos.hijo1, tablas.minimos.hijo2, tablas.minimos.hijo3, tablas.minimos.hijo4];
    minimo += tramos[Math.min(i, 3)];
    if (edadDesdeFecha(hijo.nacimiento) < 3) minimo += tablas.minimos.hijoMenor3;
  });

  (situacion.ascendientes || []).forEach((asc) => {
    minimo += tablas.minimos.ascendiente;
    if ((asc.edad || 0) >= 75) minimo += tablas.minimos.ascendienteMayor75;
  });

  if (situacion.discapacidad === 33) minimo += tablas.minimos.discapacidad33;
  if (situacion.discapacidad === 65) minimo += tablas.minimos.discapacidad65;
  if (situacion.movilidadReducida) minimo += tablas.minimos.movilidadReducida;

  return minimo;
}

// Reducción simplificada por obtención de rendimientos del trabajo (art. 20 LIRPF), para
// rentas del trabajo bajas/medias.
function reduccionRendimientoTrabajo(rendimientoPrevio) {
  if (rendimientoPrevio <= 14047.5) return 7302;
  if (rendimientoPrevio >= 19747.5) return 0;
  return 7302 - 1.14 * (rendimientoPrevio - 14047.5);
}

export function calcularBaseImponible(state, rendimientoIntegroAnual, cotizacionSSAnual, situacion) {
  const gastosGenericos = 2000;
  const rendimientoPrevio = Math.max(0, rendimientoIntegroAnual - cotizacionSSAnual - gastosGenericos);
  const reduccion = Math.max(0, reduccionRendimientoTrabajo(rendimientoPrevio));
  const rendimientoNeto = Math.max(0, rendimientoPrevio - reduccion);
  const minimo = calcularMinimoPersonalYFamiliar(state, situacion);
  const base = Math.max(0, rendimientoNeto - minimo);
  return { rendimientoNeto, minimo, base };
}

export function calcularTipoRetencion(state, baseImponibleAnual, rendimientoIntegroAnual) {
  const tablas = obtenerTablasFiscales(state);
  const cuota = aplicarEscala(baseImponibleAnual, tablas.escalaRetenciones);
  const tipo = rendimientoIntegroAnual > 0 ? (cuota / rendimientoIntegroAnual) * 100 : 0;
  return Math.max(0, Math.min(47, tipo));
}

export function calcularCuotaAnualMadrid(state, baseImponibleAnual) {
  const tablas = obtenerTablasFiscales(state);
  const cuotaEstatal = aplicarEscala(baseImponibleAnual, tablas.escalaEstatal);
  const cuotaMadrid = aplicarEscala(baseImponibleAnual, tablas.escalaMadrid);
  return { cuotaEstatal, cuotaMadrid, total: cuotaEstatal + cuotaMadrid };
}
