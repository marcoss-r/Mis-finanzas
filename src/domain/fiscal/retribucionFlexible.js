import { obtenerTablasFiscales } from './tablas.js';

export function validarRetribucionFlexible(state, conceptos, brutoAnual) {
  const tablas = obtenerTablasFiscales(state);
  const avisos = [];
  let totalExentoMensual = 0;

  conceptos.forEach((c) => {
    let limiteMensual = Infinity;
    if (c.concepto === 'comida') {
      const dias = c.diasMes || 20;
      limiteMensual = tablas.retribucionFlexible.comidaPorDia * dias;
    } else if (c.concepto === 'transporte') {
      limiteMensual = tablas.retribucionFlexible.transporteMes;
    } else if (c.concepto === 'seguroMedico') {
      limiteMensual = tablas.retribucionFlexible.seguroMedicoAnio / 12;
    }
    if (c.importeMensual > limiteMensual) {
      avisos.push(`"${c.concepto}" supera el límite de exención mensual (${limiteMensual.toFixed(2)} €).`);
    }
    totalExentoMensual += Math.min(c.importeMensual, limiteMensual);
  });

  const topeGeneral = (brutoAnual / 12) * (tablas.retribucionFlexible.topePorcentaje / 100);
  if (totalExentoMensual > topeGeneral) {
    avisos.push(`El total de retribución flexible supera el ${tablas.retribucionFlexible.topePorcentaje}% del salario mensual.`);
  }

  return { totalExentoMensual: Math.round(totalExentoMensual * 100) / 100, avisos };
}
