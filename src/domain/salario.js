import { mesesEntre, diaHabilAnterior, ultimoDiaDelMes } from '../util/fechas.js';
import { calcularCotizacionSS } from './fiscal/seguridadSocial.js';
import { calcularBaseImponible, calcularTipoRetencion, calcularCuotaAnualMadrid } from './fiscal/irpf.js';
import { validarRetribucionFlexible } from './fiscal/retribucionFlexible.js';
import { crearMovimiento } from './movimientos.js';

export function brutoEfectivoAnual(config) {
  return config.brutoAnual * (config.horasSemana / config.jornadaCompletaHoras);
}

export function fechaDeCobro(config, mes) {
  const dia = Math.min(config.diaCobro || 28, ultimoDiaDelMes(mes));
  const fechaBase = `${mes}-${String(dia).padStart(2, '0')}`;
  return config.ajusteDiaNoHabil === 'ninguno' ? fechaBase : diaHabilAnterior(fechaBase);
}

export function calcularNomina(state, config, mes) {
  const brutoAnual = brutoEfectivoAnual(config);
  const pagas = config.numeroPagas === 14 ? 14 : 12;
  const brutoPorPaga = brutoAnual / pagas;
  const esPagaExtra = pagas === 14 && (config.mesesPagaExtra || []).includes(Number(mes.slice(5, 7)));
  const brutoMes = brutoPorPaga * (esPagaExtra ? 2 : 1);

  const { totalExentoMensual, avisos } = validarRetribucionFlexible(state, config.retribucionFlexible || [], brutoAnual);
  const exentoMes = Math.min(totalExentoMensual, brutoMes);
  const baseCotizacionMes = Math.max(0, brutoMes - exentoMes);

  const cotizacion = calcularCotizacionSS(state, baseCotizacionMes, config.contrato);

  const brutoAnualCotizable = Math.max(0, brutoAnual - totalExentoMensual * 12);
  const cotizacionAnualEstim = calcularCotizacionSS(state, brutoAnualCotizable / 12, config.contrato).cuota * 12;

  const { base: baseImponibleAnual, minimo } = calcularBaseImponible(state, brutoAnualCotizable, cotizacionAnualEstim, config.situacion || {});
  const tipoRetencion = calcularTipoRetencion(state, baseImponibleAnual, brutoAnualCotizable);
  const irpfMes = Math.round(baseCotizacionMes * (tipoRetencion / 100) * 100) / 100;

  const neto = Math.round((brutoMes - cotizacion.cuota - irpfMes) * 100) / 100;

  const cuotaMadrid = calcularCuotaAnualMadrid(state, baseImponibleAnual);
  const retenidoEstimadoAnual = Math.round(brutoAnualCotizable * (tipoRetencion / 100) * 100) / 100;
  const diferencia = Math.round((retenidoEstimadoAnual - cuotaMadrid.total) * 100) / 100;

  return {
    mes,
    brutoMes: Math.round(brutoMes * 100) / 100,
    retribucionFlexible: Math.round(exentoMes * 100) / 100,
    baseCotizacion: Math.round(baseCotizacionMes * 100) / 100,
    seguridadSocial: cotizacion.cuota,
    irpf: irpfMes,
    tipoRetencion: Math.round(tipoRetencion * 100) / 100,
    neto,
    minimoPersonalYFamiliar: Math.round(minimo * 100) / 100,
    estimacionAnualMadrid: {
      cuotaEstimada: Math.round(cuotaMadrid.total * 100) / 100,
      retenidoEstimado: retenidoEstimadoAnual,
      diferencia,
    },
    avisos,
    confirmada: false,
    editadaManualmente: false,
    movimientosGenerados: [],
  };
}

export function repartoDelMes(state, mes) {
  const repartos = state.repartos.filter((r) => r.mes <= mes).sort((a, b) => a.mes.localeCompare(b.mes));
  return repartos.length ? repartos[repartos.length - 1] : null;
}

export function guardarReparto(state, mes, destinos) {
  const existente = state.repartos.find((r) => r.mes === mes);
  if (existente) existente.destinos = destinos;
  else state.repartos.push({ mes, destinos });
  return destinos.reduce((t, d) => t + Number(d.porcentaje), 0);
}

export function generarNominaDelMes(state, mes) {
  if (state.nominas.some((n) => n.mes === mes)) return null;
  if (!state.salario) return null;

  const nomina = calcularNomina(state, state.salario, mes);
  const reparto = repartoDelMes(state, mes) || { destinos: [] };
  const fecha = fechaDeCobro(state.salario, mes);
  const totalPct = reparto.destinos.reduce((t, d) => t + Number(d.porcentaje), 0) || 100;

  const movimientosGenerados = [];
  reparto.destinos.forEach((destino) => {
    const importe = Math.round(nomina.neto * (destino.porcentaje / totalPct) * 100) / 100;
    if (importe <= 0) return;
    const mov = crearMovimiento(state, {
      tipo: 'ingreso',
      cuentaId: destino.cuentaId,
      divisionId: destino.divisionId,
      categoria: 'Nómina',
      nombre: `Nómina ${mes}`,
      importe,
      fecha,
      origen: 'nomina',
    });
    movimientosGenerados.push(mov.id);
  });

  if (nomina.retribucionFlexible > 0 && state.salario.cuentaRetribucionFlexible) {
    const mov = crearMovimiento(state, {
      tipo: 'ingreso',
      cuentaId: state.salario.cuentaRetribucionFlexible,
      divisionId: null,
      categoria: 'Retribución flexible',
      nombre: `Retribución flexible ${mes}`,
      importe: nomina.retribucionFlexible,
      fecha,
      origen: 'nomina',
    });
    movimientosGenerados.push(mov.id);
  }

  nomina.confirmada = true;
  nomina.movimientosGenerados = movimientosGenerados;
  state.nominas.push(nomina);
  return nomina;
}

export function generarNominasPendientes(state, hastaFecha = new Date()) {
  if (!state.salario || !state.salario.activoDesde) return [];
  const hastaMes = hastaFecha.toISOString().slice(0, 7);
  const generadas = [];
  mesesEntre(state.salario.activoDesde, hastaMes).forEach((mes) => {
    const fecha = new Date(`${fechaDeCobro(state.salario, mes)}T00:00:00`);
    if (fecha > hastaFecha) return;
    const n = generarNominaDelMes(state, mes);
    if (n) generadas.push(n);
  });
  return generadas;
}

export function editarNomina(state, mes, cambios) {
  const nomina = state.nominas.find((n) => n.mes === mes);
  if (!nomina) return;
  Object.assign(nomina, cambios, { editadaManualmente: true });
}
