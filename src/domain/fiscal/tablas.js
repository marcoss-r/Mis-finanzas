// Valores fiscales de referencia (aprox. 2025/2026, contribuyente residente en Madrid).
// Cambian cada año por ley de presupuestos: revísalos en enero contra tu nómina real
// (ver planificación, sección 9). Son editables desde Ajustes; state.ajustes.tablasFiscales
// sobrescribe estos valores por defecto sin tener que tocar el código.
export const TABLAS_POR_DEFECTO = {
  ss: {
    contingenciasComunes: 4.70,
    desempleoIndefinido: 1.55,
    desempleoTemporal: 1.60,
    formacionProfesional: 0.10,
    mei: 0.15,
  },
  baseCotizacionMinima: 1323.00,
  baseCotizacionMaxima: 4909.50,
  // Escala combinada usada para estimar el tipo de retención mensual de la nómina
  // (igual en toda España, ver sección 4 de la planificación).
  escalaRetenciones: [
    { hasta: 12450, tipo: 19 },
    { hasta: 20200, tipo: 24 },
    { hasta: 35200, tipo: 30 },
    { hasta: 60000, tipo: 37 },
    { hasta: 300000, tipo: 45 },
    { hasta: null, tipo: 47 },
  ],
  // Escala estatal general (mitad de la cuota total) para la estimación de la cuota anual real.
  escalaEstatal: [
    { hasta: 12450, tipo: 9.50 },
    { hasta: 20200, tipo: 12.00 },
    { hasta: 35200, tipo: 15.00 },
    { hasta: 60000, tipo: 18.50 },
    { hasta: 300000, tipo: 22.50 },
    { hasta: null, tipo: 24.50 },
  ],
  // Escala autonómica de la Comunidad de Madrid, más baja que la media estatal.
  escalaMadrid: [
    { hasta: 13362.22, tipo: 8.50 },
    { hasta: 19004.66, tipo: 10.70 },
    { hasta: 35425.10, tipo: 12.80 },
    { hasta: 57320.98, tipo: 17.80 },
    { hasta: 66593.00, tipo: 18.80 },
    { hasta: 76837.20, tipo: 19.80 },
    { hasta: 300000.00, tipo: 22.80 },
    { hasta: null, tipo: 23.80 },
  ],
  minimos: {
    contribuyente: 5550,
    mayor65: 1150,
    mayor75: 1400,
    hijo1: 2400,
    hijo2: 2700,
    hijo3: 4000,
    hijo4: 4500,
    hijoMenor3: 2800,
    ascendiente: 1150,
    ascendienteMayor75: 1400,
    discapacidad33: 3000,
    discapacidad65: 9000,
    movilidadReducida: 3000,
  },
  retribucionFlexible: {
    comidaPorDia: 11,
    transporteMes: 136.36,
    transporteAnio: 1500,
    seguroMedicoAnio: 500,
    seguroMedicoAnioDiscapacidad: 1500,
    topePorcentaje: 30,
  },
};

export function obtenerTablasFiscales(state) {
  const overrides = state.ajustes?.tablasFiscales || {};
  return {
    ...TABLAS_POR_DEFECTO,
    ...overrides,
    ss: { ...TABLAS_POR_DEFECTO.ss, ...(overrides.ss || {}) },
    minimos: { ...TABLAS_POR_DEFECTO.minimos, ...(overrides.minimos || {}) },
    retribucionFlexible: { ...TABLAS_POR_DEFECTO.retribucionFlexible, ...(overrides.retribucionFlexible || {}) },
  };
}

export function aplicarEscala(baseAnual, tramos) {
  let cuota = 0;
  let restante = Math.max(0, baseAnual);
  let anterior = 0;
  for (const tramo of tramos) {
    const techo = tramo.hasta === null ? Infinity : tramo.hasta;
    const ancho = Math.min(restante, techo - anterior);
    if (ancho <= 0) break;
    cuota += ancho * (tramo.tipo / 100);
    restante -= ancho;
    anterior = techo;
    if (restante <= 0) break;
  }
  return cuota;
}
