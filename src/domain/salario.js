import { mesesEntre, diaHabilAnterior, ultimoDiaDelMes, diasNaturalesEntre, sumarMeses, fechaISOLocal } from '../util/fechas.js';
import { calcularCotizacionSS } from './fiscal/seguridadSocial.js';
import { calcularBaseImponible, calcularTipoRetencion, calcularCuotaAnualMadrid } from './fiscal/irpf.js';
import { validarRetribucionFlexible } from './fiscal/retribucionFlexible.js';
import { crearMovimiento } from './movimientos.js';

const redondear = (n) => Math.round(n * 100) / 100;

export function brutoEfectivoAnual(config) {
  return config.brutoAnual * (config.horasSemana / config.jornadaCompletaHoras);
}

export function fechaDeCobro(config, mes) {
  const dia = Math.min(config.diaCobro || 28, ultimoDiaDelMes(mes));
  const fechaBase = `${mes}-${String(dia).padStart(2, '0')}`;
  return config.ajusteDiaNoHabil === 'ninguno' ? fechaBase : diaHabilAnterior(fechaBase);
}

// Primer mes en el que hay nómina: el de incorporación si se conoce, y nunca antes de
// `activoDesde` (a partir de cuándo quieres que la app genere nóminas).
function primerMesDeNomina(config) {
  const mesIncorporacion = config.fechaIncorporacion?.slice(0, 7);
  if (!mesIncorporacion) return config.activoDesde;
  if (!config.activoDesde) return mesIncorporacion;
  return mesIncorporacion > config.activoDesde ? mesIncorporacion : config.activoDesde;
}

// Parte del mes trabajada, con mes comercial de 30 días: quien entra el día 2 cobra 29/30.
export function fraccionTrabajadaMes(config, mes) {
  const inc = config.fechaIncorporacion;
  if (!inc) return 1;
  const mesIncorporacion = inc.slice(0, 7);
  if (mes < mesIncorporacion) return 0;
  if (mes > mesIncorporacion) return 1;
  const dia = Number(inc.slice(8, 10));
  return Math.max(0, 30 - (dia - 1)) / 30;
}

// Devengo semestral de la paga extra (la de junio se genera de enero a junio y la de diciembre
// de julio a diciembre). Si te incorporas dentro del periodo cobras la parte proporcional por
// días naturales.
function fraccionPagaExtra(config, mes) {
  const inc = config.fechaIncorporacion;
  const inicioPeriodo = `${sumarMeses(mes, -5)}-01`;
  const finPeriodo = `${mes}-${String(ultimoDiaDelMes(mes)).padStart(2, '0')}`;
  if (!inc || inc <= inicioPeriodo) return 1;
  if (inc > finPeriodo) return 0;
  return diasNaturalesEntre(inc, finPeriodo) / diasNaturalesEntre(inicioPeriodo, finPeriodo);
}

// Tipo de retención anual que aplicaría la empresa, calculado sobre el salario de un año
// completo (es lo habitual aunque te incorpores a mitad de año). Si has fijado el % que
// aparece en tu nómina real (`tipoRetencionManual`), manda ese.
export function tipoRetencionAnual(state, config) {
  if (config.tipoRetencionManual != null && config.tipoRetencionManual >= 0) return Number(config.tipoRetencionManual);
  const brutoAnual = brutoEfectivoAnual(config);
  const { totalExentoMensual } = validarRetribucionFlexible(state, config.retribucionFlexible || [], brutoAnual);
  const integroAnual = Math.max(0, brutoAnual - totalExentoMensual * 12);
  const cotizacionAnual = calcularCotizacionSS(state, brutoAnual / 12, config.contrato).cuota * 12;
  const base = calcularBaseImponible(state, integroAnual, cotizacionAnual, config.situacion || {});
  return calcularTipoRetencion(state, base, integroAnual, config.contrato);
}

export function calcularNomina(state, config, mes) {
  const brutoAnual = brutoEfectivoAnual(config);
  const pagas = config.numeroPagas === 14 ? 14 : 12;
  const brutoPorPaga = brutoAnual / pagas;
  const fraccionMes = fraccionTrabajadaMes(config, mes);
  const esMesPagaExtra = pagas === 14 && (config.mesesPagaExtra || []).includes(Number(mes.slice(5, 7)));

  const sueldoMes = brutoPorPaga * fraccionMes;
  const pagaExtra = esMesPagaExtra ? brutoPorPaga * fraccionPagaExtra(config, mes) : 0;
  const brutoMes = sueldoMes + pagaExtra;

  const { totalExentoMensual, avisos } = validarRetribucionFlexible(state, config.retribucionFlexible || [], brutoAnual);
  const exentoMes = Math.min(totalExentoMensual * fraccionMes, sueldoMes);

  // La base de cotización es mensual y ya incluye la prorrata de las pagas extra (y la
  // retribución flexible en especie, que cotiza aunque no tribute), así que la paga extra
  // no vuelve a cotizar el mes en que se cobra.
  const cotizacion = calcularCotizacionSS(state, (brutoAnual / 12) * fraccionMes, config.contrato, fraccionMes);

  const tipoRetencion = tipoRetencionAnual(state, config);
  const baseRetencion = brutoMes - exentoMes;
  const irpf = redondear(baseRetencion * (tipoRetencion / 100));
  const neto = redondear(baseRetencion - cotizacion.cuota - irpf);

  return {
    modelo: 2,
    mes,
    fraccionMes: Math.round(fraccionMes * 10000) / 10000,
    sueldoMes: redondear(sueldoMes),
    pagaExtra: redondear(pagaExtra),
    brutoMes: redondear(brutoMes),
    retribucionFlexible: redondear(exentoMes),
    baseCotizacion: cotizacion.base,
    seguridadSocial: cotizacion.cuota,
    baseRetencion: redondear(baseRetencion),
    irpf,
    tipoRetencion,
    neto,
    avisos,
    confirmada: false,
    editadaManualmente: false,
    desgloseReal: false,
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
  if (nomina.brutoMes <= 0) return null;
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
  if (!state.salario) return [];
  const desde = primerMesDeNomina(state.salario);
  if (!desde) return [];
  const hastaMes = fechaISOLocal(hastaFecha).slice(0, 7);
  const generadas = [];
  mesesEntre(desde, hastaMes).forEach((mes) => {
    const fecha = new Date(`${fechaDeCobro(state.salario, mes)}T00:00:00`);
    if (fecha > hastaFecha) return;
    const n = generarNominaDelMes(state, mes);
    if (n) generadas.push(n);
  });
  return generadas;
}

// Ajusta los ingresos que generó una nómina: los de "Nómina" se reescalan al nuevo neto
// respetando el reparto entre cuentas, y el de retribución flexible toma su nuevo importe.
function reescalarMovimientos(state, nomina, nuevoNeto, nuevaFlexible) {
  const factor = nomina.neto > 0 ? nuevoNeto / nomina.neto : 0;
  nomina.movimientosGenerados.forEach((id) => {
    const mov = state.movimientos.find((m) => m.id === id);
    if (!mov) return;
    if (mov.categoria === 'Nómina') mov.importe = redondear(mov.importe * factor);
    else if (mov.categoria === 'Retribución flexible' && nuevaFlexible != null) mov.importe = redondear(nuevaFlexible);
  });
}

function eliminarNomina(state, nomina) {
  const ids = new Set(nomina.movimientosGenerados);
  state.movimientos = state.movimientos.filter((m) => !ids.has(m.id));
  state.nominas = state.nominas.filter((n) => n !== nomina);
}

// Corrige el neto de una nómina ya generada cuando solo conoces lo que te ingresaron.
// El bruto y la Seguridad Social se toman del cálculo y el IRPF se deduce por diferencia,
// de modo que lo retenido de más queda registrado para la estimación de la renta.
export function editarNetoNomina(state, mes, nuevoNeto) {
  const nomina = state.nominas.find((n) => n.mes === mes);
  if (!nomina) return;
  const neto = redondear(Number(nuevoNeto));
  reescalarMovimientos(state, nomina, neto);
  nomina.neto = neto;
  nomina.irpf = redondear(Math.max(0, nomina.baseRetencion - nomina.seguridadSocial - neto));
  nomina.tipoRetencion = nomina.baseRetencion > 0 ? redondear((nomina.irpf / nomina.baseRetencion) * 100) : 0;
  nomina.editadaManualmente = true;
  nomina.desgloseReal = false;
}

// Guarda el desglose exacto de la nómina en papel. Ya no se recalcula nunca.
export function editarNominaReal(state, mes, { brutoMes, retribucionFlexible, seguridadSocial, irpf }) {
  const nomina = state.nominas.find((n) => n.mes === mes);
  if (!nomina) return;
  const flexible = redondear(Number(retribucionFlexible ?? nomina.retribucionFlexible) || 0);
  const bruto = redondear(Number(brutoMes));
  const baseRetencion = redondear(bruto - flexible);
  const neto = redondear(baseRetencion - Number(seguridadSocial) - Number(irpf));
  reescalarMovimientos(state, nomina, neto, flexible);
  Object.assign(nomina, {
    brutoMes: bruto,
    retribucionFlexible: flexible,
    baseRetencion,
    seguridadSocial: redondear(Number(seguridadSocial)),
    irpf: redondear(Number(irpf)),
    tipoRetencion: baseRetencion > 0 ? redondear((Number(irpf) / baseRetencion) * 100) : 0,
    neto,
    editadaManualmente: true,
    desgloseReal: true,
  });
}

// Recalcula con el modelo actual las nóminas ya generadas (tras cambiar la configuración,
// las tablas o al venir de una versión anterior de la app):
// - automáticas: se sustituyen por la nueva estimación y se reescalan sus ingresos; si el mes
//   queda antes de la incorporación, se eliminan junto con sus movimientos;
// - con el neto editado: se conserva el neto real y se rehace el resto del desglose;
// - con el desglose real completo: no se tocan.
export function recalcularNominas(state) {
  if (!state.salario) return;
  [...state.nominas].forEach((anterior) => {
    if (anterior.desgloseReal) return;
    const nueva = calcularNomina(state, state.salario, anterior.mes);
    if (!anterior.editadaManualmente && nueva.brutoMes <= 0) {
      eliminarNomina(state, anterior);
      return;
    }
    if (anterior.editadaManualmente) {
      nueva.neto = anterior.neto;
      nueva.irpf = redondear(Math.max(0, nueva.baseRetencion - nueva.seguridadSocial - anterior.neto));
      nueva.tipoRetencion = nueva.baseRetencion > 0 ? redondear((nueva.irpf / nueva.baseRetencion) * 100) : 0;
    }
    reescalarMovimientos(state, anterior, nueva.neto, nueva.retribucionFlexible);
    Object.assign(nueva, {
      confirmada: anterior.confirmada,
      editadaManualmente: anterior.editadaManualmente,
      movimientosGenerados: anterior.movimientosGenerados,
    });
    state.nominas[state.nominas.indexOf(anterior)] = nueva;
  });
}

// Estimación de la declaración de la renta de un año: suma lo realmente cobrado y retenido
// en las nóminas ya registradas y proyecta el resto del año con el cálculo automático.
// Solo tiene en cuenta este salario (sin otros ingresos, deducciones ni otros pagadores).
export function estimarRentaAnual(state, anio) {
  const config = state.salario;
  if (!config) return null;
  const incorporacion = config.fechaIncorporacion?.slice(0, 7);
  let integro = 0;
  let seguridadSocial = 0;
  let retenido = 0;
  let nominasReales = 0;

  mesesEntre(`${anio}-01`, `${anio}-12`).forEach((mes) => {
    if (incorporacion && mes < incorporacion) return;
    const guardada = state.nominas.find((n) => n.mes === mes && n.modelo === 2);
    const n = guardada || calcularNomina(state, config, mes);
    if (guardada) nominasReales += 1;
    integro += n.brutoMes - n.retribucionFlexible;
    seguridadSocial += n.seguridadSocial;
    retenido += n.irpf;
  });

  const base = calcularBaseImponible(state, integro, seguridadSocial, config.situacion || {});
  const cuota = calcularCuotaAnualMadrid(state, base);
  const resultado = redondear(retenido - cuota.total);

  return {
    anio,
    rendimientoIntegro: redondear(integro),
    seguridadSocial: redondear(seguridadSocial),
    reduccionTrabajo: redondear(base.reduccion),
    baseLiquidable: redondear(base.base),
    minimoPersonalYFamiliar: base.minimo,
    cuotaEstatal: redondear(cuota.cuotaEstatal),
    cuotaMadrid: redondear(cuota.cuotaMadrid),
    cuotaTotal: redondear(cuota.total),
    retenido: redondear(retenido),
    // Positivo: a devolver. Negativo: a pagar.
    resultado,
    nominasReales,
  };
}
