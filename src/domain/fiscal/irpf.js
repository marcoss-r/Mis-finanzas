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

// Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF). Se calcula sobre el
// rendimiento neto previo: íntegro menos Seguridad Social, sin restar aún los 2.000 € de
// otros gastos del art. 19.2.f.
export function reduccionRendimientoTrabajo(state, rendimientoNetoPrevio) {
  const r = obtenerTablasFiscales(state).reduccionTrabajo;
  const rn = rendimientoNetoPrevio;
  if (rn <= r.umbral1) return r.maxima;
  if (rn <= r.umbral2) return r.maxima - r.pendiente1 * (rn - r.umbral1);
  if (rn <= r.umbral3) return r.importe2 - r.pendiente2 * (rn - r.umbral2);
  return 0;
}

// Base sobre la que se aplica la escala, sin restar el mínimo personal y familiar: el mínimo
// se descuenta después aplicando la escala sobre él (tributa a tipo cero en el primer tramo).
export function calcularBaseImponible(state, rendimientoIntegroAnual, cotizacionSSAnual, situacion) {
  const tablas = obtenerTablasFiscales(state);
  const rendimientoNetoPrevio = Math.max(0, rendimientoIntegroAnual - cotizacionSSAnual);
  const reduccion = reduccionRendimientoTrabajo(state, rendimientoNetoPrevio);
  const base = Math.max(0, rendimientoNetoPrevio - tablas.gastosDeducibles - reduccion);
  const minimo = calcularMinimoPersonalYFamiliar(state, situacion);
  return { rendimientoNetoPrevio, reduccion, minimo, base };
}

function cuotaConMinimo(base, minimo, escala) {
  return Math.max(0, aplicarEscala(base, escala) - aplicarEscala(Math.min(minimo, base), escala));
}

// Tipo de retención de la nómina según el procedimiento del art. 85-86 RIRPF.
export function calcularTipoRetencion(state, { base, minimo }, rendimientoIntegroAnual, contrato) {
  const tablas = obtenerTablasFiscales(state);
  if (rendimientoIntegroAnual <= 0) return 0;
  let cuota = 0;
  if (rendimientoIntegroAnual > tablas.limiteExcluyente) {
    cuota = cuotaConMinimo(base, minimo, tablas.escalaRetenciones);
    const tope = (rendimientoIntegroAnual - tablas.limiteExcluyente) * (tablas.topeCuotaSobreExceso / 100);
    cuota = Math.min(cuota, tope);
  }
  let tipo = Math.round((cuota / rendimientoIntegroAnual) * 10000) / 100;
  if (contrato === 'temporal') tipo = Math.max(tipo, tablas.retencionMinimaTemporal);
  return Math.max(0, Math.min(47, tipo));
}

// Cuota íntegra anual (estatal + Comunidad de Madrid) que saldría en la declaración.
export function calcularCuotaAnualMadrid(state, { base, minimo }) {
  const tablas = obtenerTablasFiscales(state);
  const cuotaEstatal = cuotaConMinimo(base, minimo, tablas.escalaEstatal);
  const cuotaMadrid = cuotaConMinimo(base, minimo, tablas.escalaMadrid);
  return { cuotaEstatal, cuotaMadrid, total: cuotaEstatal + cuotaMadrid };
}
