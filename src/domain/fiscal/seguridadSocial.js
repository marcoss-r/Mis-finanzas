import { obtenerTablasFiscales } from './tablas.js';

export function calcularCotizacionSS(state, baseBrutaMensual, contrato) {
  const tablas = obtenerTablasFiscales(state);
  const base = Math.min(Math.max(baseBrutaMensual, tablas.baseCotizacionMinima), tablas.baseCotizacionMaxima);
  const tipoDesempleo = contrato === 'temporal' ? tablas.ss.desempleoTemporal : tablas.ss.desempleoIndefinido;
  const tipoTotal = tablas.ss.contingenciasComunes + tipoDesempleo + tablas.ss.formacionProfesional + tablas.ss.mei;
  const cuota = Math.round(base * (tipoTotal / 100) * 100) / 100;
  return { base: Math.round(base * 100) / 100, tipoTotal: Math.round(tipoTotal * 100) / 100, cuota };
}
