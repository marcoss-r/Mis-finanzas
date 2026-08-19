import { el, tarjeta, abrirModal, cerrarModal } from './componentes.js';
import { euros, porcentaje } from './formato.js';
import { update } from '../store/state.js';
import { cuentasActivas } from '../domain/cuentas.js';
import { divisionesDeCuenta } from '../domain/divisiones.js';
import { calcularNomina, repartoDelMes, guardarReparto, fechaDeCobro, generarNominasPendientes, editarNetoNomina } from '../domain/salario.js';
import { mesActual, formatearMes } from '../util/fechas.js';
import { abrirAjustesFiscales } from './ajustesView.js';

export function renderSalario(contenedor, state) {
  if (!state.salario) {
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Gestor de salario' }),
        el('p', { class: 'hint-text', text: 'Configura tu salario bruto anual y la app calculará el neto mensual (IRPF + Seguridad Social, Madrid) y lo repartirá entre tus cuentas cada mes.' }),
        el('button', { type: 'button', class: 'btn-primary', text: 'Configurar salario', onClick: () => abrirFormularioConfiguracion(state) }),
        el('button', { type: 'button', class: 'btn-secondary', text: 'Tablas fiscales (avanzado)', onClick: () => abrirAjustesFiscales(state) }),
      ]),
    );
    return;
  }

  const mes = mesActual();
  const nomina = calcularNomina(state, state.salario, mes);

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Configuración' }),
      el('p', { text: `Bruto anual: ${euros(state.salario.brutoAnual)} · ${state.salario.horasSemana}h/semana · ${state.salario.numeroPagas} pagas · cobro el día ${state.salario.diaCobro}` }),
      el('div', { class: 'action-row' }, [
        el('button', { type: 'button', class: 'btn-secondary', text: 'Editar configuración', onClick: () => abrirFormularioConfiguracion(state) }),
        el('button', { type: 'button', class: 'btn-secondary', text: 'Tablas fiscales', onClick: () => abrirAjustesFiscales(state) }),
      ]),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: `Desglose estimado — ${formatearMes(mes)}` }),
      el('ul', { class: 'breakdown-list' }, [
        filaDesglose('Bruto del mes', euros(nomina.brutoMes)),
        filaDesglose('Retribución flexible (exenta)', `-${euros(nomina.retribucionFlexible)}`),
        filaDesglose('Base de cotización', euros(nomina.baseCotizacion)),
        filaDesglose('Seguridad Social', `-${euros(nomina.seguridadSocial)}`),
        filaDesglose(`IRPF (retención ${porcentaje(nomina.tipoRetencion)})`, `-${euros(nomina.irpf)}`),
        filaDesglose('Neto mensual', euros(nomina.neto), true),
      ]),
      el('p', { class: 'hint-text', text: `Cobro estimado el ${fechaDeCobro(state.salario, mes)}.` }),
      el('p', { class: 'hint-text', text: `Estimación anual (Madrid): retenido ~${euros(nomina.estimacionAnualMadrid.retenidoEstimado)}, cuota real ~${euros(nomina.estimacionAnualMadrid.cuotaEstimada)} → ${nomina.estimacionAnualMadrid.diferencia >= 0 ? 'a devolver' : 'a pagar'} ~${euros(Math.abs(nomina.estimacionAnualMadrid.diferencia))}.` }),
      nomina.avisos.length ? el('div', { class: 'warning-box', text: nomina.avisos.join(' ') }) : null,
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Retribución flexible' }),
      el('div', {}, (state.salario.retribucionFlexible || []).map((c) => filaConcepto(state, c))),
      el('button', { type: 'button', class: 'btn-secondary', text: '+ Concepto', onClick: () => abrirFormularioConcepto(state) }),
      el('label', { text: 'Cuenta destino de la retribución flexible' }),
      selectCuentaSimple(state, state.salario.cuentaRetribucionFlexible, (valor) => update((s) => { s.salario.cuentaRetribucionFlexible = valor || null; })),
    ]),
  );

  contenedor.append(renderReparto(state, mes));

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Historial de nóminas' }),
      state.nominas.length
        ? el('ul', { class: 'movement-list' }, [...state.nominas].reverse().map((n) => el('li', { class: 'movement-item' }, [
            el('span', { class: 'movement-name', text: formatearMes(n.mes) }),
            el('span', { class: 'movement-category', text: n.editadaManualmente ? 'Editada' : 'Automática' }),
            el('span', { class: 'movement-amount income', text: euros(n.neto) }),
            el('button', { type: 'button', class: 'btn-secondary', text: 'Editar', onClick: () => abrirFormularioEditarNomina(n) }),
          ])))
        : el('p', { class: 'empty-state', text: 'Todavía no se ha generado ninguna nómina.' }),
    ]),
  );
}

function abrirFormularioEditarNomina(nomina) {
  const neto = el('input', { type: 'number', step: '0.01', min: '0', value: nomina.neto });
  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const valor = parseFloat(neto.value);
      if (!(valor >= 0)) return;
      update((s) => editarNetoNomina(s, nomina.mes, valor));
      cerrarModal();
    },
  }, [
    el('p', { class: 'hint-text', text: `Nómina calculada: ${euros(nomina.neto)}. Si tu nómina real fue distinta, escribe el importe real: se ajustarán proporcionalmente los ingresos ya generados en tus cuentas.` }),
    el('label', { text: 'Neto real (€)' }), neto,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Guardar' }),
  ]);
  abrirModal(`Editar nómina — ${formatearMes(nomina.mes)}`, form);
}

function filaDesglose(etiqueta, valor, total) {
  return el('li', { class: `breakdown-row${total ? ' total' : ''}` }, [
    el('span', { text: etiqueta }),
    el('span', { text: valor }),
  ]);
}

function selectCuentaSimple(state, valorActual, onChange) {
  const cuentas = cuentasActivas(state);
  const select = el('select', { onChange: (e) => onChange(e.target.value) }, [
    el('option', { value: '', text: '(ninguna)' }),
    ...cuentas.map((c) => el('option', { value: c.id, text: c.nombre })),
  ]);
  select.value = valorActual || '';
  return select;
}

function filaConcepto(state, c) {
  return el('div', { class: 'goal-item' }, [
    el('div', { class: 'division-top' }, [
      el('span', { text: `${etiquetaConcepto(c.concepto)}${c.concepto === 'comida' ? ` (${c.diasMes || 20} días)` : ''}` }),
      el('span', { text: euros(c.importeMensual) }),
    ]),
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Eliminar', onClick: () => update((s) => { s.salario.retribucionFlexible = s.salario.retribucionFlexible.filter((x) => x !== c); }) }),
    ]),
  ]);
}

function etiquetaConcepto(concepto) {
  return { comida: 'Comida (tarjeta restaurante)', transporte: 'Transporte público', seguroMedico: 'Seguro médico', guarderia: 'Guardería', formacion: 'Formación' }[concepto] || concepto;
}

function abrirFormularioConcepto(state) {
  const concepto = el('select', {}, [
    el('option', { value: 'comida', text: 'Comida (tarjeta restaurante)' }),
    el('option', { value: 'transporte', text: 'Transporte público' }),
    el('option', { value: 'seguroMedico', text: 'Seguro médico' }),
    el('option', { value: 'guarderia', text: 'Guardería' }),
    el('option', { value: 'formacion', text: 'Formación' }),
  ]);
  const importeMensual = el('input', { type: 'number', step: '0.01', min: '0' });
  const diasMes = el('input', { type: 'number', min: '1', max: '23', value: '20' });
  const grupoDias = el('div', { class: 'form-group' }, [el('label', { text: 'Días trabajados al mes' }), diasMes]);
  function actualizar() { grupoDias.classList.toggle('hidden', concepto.value !== 'comida'); }
  concepto.addEventListener('change', actualizar);
  actualizar();

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      if (!(parseFloat(importeMensual.value) > 0)) return;
      update((s) => {
        s.salario.retribucionFlexible = s.salario.retribucionFlexible || [];
        s.salario.retribucionFlexible.push({ concepto: concepto.value, importeMensual: parseFloat(importeMensual.value), diasMes: parseInt(diasMes.value, 10) || 20 });
      });
      cerrarModal();
    },
  }, [
    el('label', { text: 'Concepto' }), concepto,
    el('label', { text: 'Importe mensual (€)' }), importeMensual,
    grupoDias,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Añadir concepto' }),
  ]);
  abrirModal('Nuevo concepto de retribución flexible', form);
}

function renderReparto(state, mes) {
  const cuentas = cuentasActivas(state);
  const actual = repartoDelMes(state, mes);
  const filas = (actual?.destinos || []).map((d) => ({ ...d }));
  const contenedorFilas = el('div', {});

  function pintarFilas() {
    contenedorFilas.innerHTML = '';
    filas.forEach((fila, i) => contenedorFilas.append(filaReparto(state, cuentas, fila, i, filas, pintarFilas)));
  }
  pintarFilas();

  const total = el('p', { class: 'hint-text' });
  function actualizarTotal() {
    const suma = filas.reduce((t, f) => t + (Number(f.porcentaje) || 0), 0);
    total.textContent = `Suma actual: ${suma}%. Debe llegar al 100%.`;
  }
  actualizarTotal();

  return tarjeta([
    el('h2', { text: `Reparto de la nómina — ${formatearMes(mes)}` }),
    el('p', { class: 'hint-text', text: 'Se aplica a partir de este mes hasta que definas otro reparto.' }),
    contenedorFilas,
    el('button', { type: 'button', class: 'btn-secondary', text: '+ Destino', onClick: () => {
      if (!cuentas.length) { alert('Crea una cuenta primero.'); return; }
      filas.push({ cuentaId: cuentas[0].id, divisionId: null, porcentaje: 0 });
      pintarFilas();
      actualizarTotal();
    } }),
    total,
    el('button', { type: 'button', class: 'btn-primary', text: 'Guardar reparto', onClick: () => {
      const suma = filas.reduce((t, f) => t + (Number(f.porcentaje) || 0), 0);
      if (Math.round(suma) !== 100) {
        alert('El reparto debe sumar 100%.');
        return;
      }
      update((s) => {
        guardarReparto(s, mes, filas);
        generarNominasPendientes(s);
      });
    } }),
  ]);
}

function filaReparto(state, cuentas, fila, indice, filas, repintar) {
  const selectCuenta = el('select', {}, cuentas.map((c) => el('option', { value: c.id, text: c.nombre })));
  selectCuenta.value = fila.cuentaId;
  const selectDivision = el('select', {});
  function actualizarDivisiones() {
    selectDivision.innerHTML = '';
    selectDivision.append(el('option', { value: '', text: 'Sin asignar' }));
    divisionesDeCuenta(state, selectCuenta.value).forEach((d) => selectDivision.append(el('option', { value: d.id, text: d.nombre })));
    selectDivision.value = fila.divisionId || '';
  }
  actualizarDivisiones();
  selectCuenta.addEventListener('change', () => { fila.cuentaId = selectCuenta.value; fila.divisionId = null; actualizarDivisiones(); });
  selectDivision.addEventListener('change', () => { fila.divisionId = selectDivision.value || null; });

  const porcentaje = el('input', { type: 'number', step: '0.1', min: '0', max: '100', value: fila.porcentaje });
  porcentaje.addEventListener('input', () => { fila.porcentaje = parseFloat(porcentaje.value) || 0; });

  const eliminar = el('button', { type: 'button', text: '×', 'aria-label': 'Eliminar destino', onClick: () => { filas.splice(indice, 1); repintar(); } });

  return el('div', { class: 'split-row' }, [selectCuenta, selectDivision, porcentaje, eliminar]);
}

function abrirFormularioConfiguracion(state) {
  const s = state.salario || {};
  const brutoAnual = el('input', { type: 'number', step: '0.01', min: '0', value: s.brutoAnual ?? '' });
  const jornadaCompletaHoras = el('input', { type: 'number', step: '0.5', min: '1', value: s.jornadaCompletaHoras ?? 40 });
  const horasSemana = el('input', { type: 'number', step: '0.5', min: '1', value: s.horasSemana ?? 40 });
  const numeroPagas = el('select', {}, [el('option', { value: '12', text: '12 pagas' }), el('option', { value: '14', text: '14 pagas' })]);
  numeroPagas.value = String(s.numeroPagas || 12);
  const diaCobro = el('input', { type: 'number', min: '1', max: '31', value: s.diaCobro ?? 28 });
  const contrato = el('select', {}, [el('option', { value: 'indefinido', text: 'Indefinido' }), el('option', { value: 'temporal', text: 'Temporal' })]);
  contrato.value = s.contrato || 'indefinido';
  const activoDesde = el('input', { type: 'month', value: s.activoDesde || mesActual() });

  const situ = s.situacion || {};
  const edad = el('input', { type: 'number', min: '16', max: '100', value: situ.edad ?? 30 });
  const numHijos = el('input', { type: 'number', min: '0', max: '10', value: (situ.hijos || []).length });
  const hijosMenores3 = el('input', { type: 'number', min: '0', max: '10', value: (situ.hijos || []).filter((h) => h.nacimiento).length });
  const discapacidad = el('select', {}, [el('option', { value: '0', text: 'Sin discapacidad' }), el('option', { value: '33', text: '33%' }), el('option', { value: '65', text: '65%' })]);
  discapacidad.value = String(situ.discapacidad || 0);
  const movilidadReducida = el('input', { type: 'checkbox' });
  movilidadReducida.checked = Boolean(situ.movilidadReducida);

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const numHijosVal = parseInt(numHijos.value, 10) || 0;
      const menores3Val = Math.min(numHijosVal, parseInt(hijosMenores3.value, 10) || 0);
      const hijos = Array.from({ length: numHijosVal }, (_, i) => ({ nacimiento: i < menores3Val ? new Date().toISOString().slice(0, 10) : null }));

      update((st) => {
        st.salario = {
          ...st.salario,
          brutoAnual: parseFloat(brutoAnual.value) || 0,
          jornadaCompletaHoras: parseFloat(jornadaCompletaHoras.value) || 40,
          horasSemana: parseFloat(horasSemana.value) || 40,
          numeroPagas: parseInt(numeroPagas.value, 10),
          mesesPagaExtra: [6, 12],
          diaCobro: parseInt(diaCobro.value, 10) || 28,
          ajusteDiaNoHabil: 'anterior',
          contrato: contrato.value,
          activoDesde: activoDesde.value,
          retribucionFlexible: st.salario?.retribucionFlexible || [],
          cuentaRetribucionFlexible: st.salario?.cuentaRetribucionFlexible || null,
          situacion: {
            edad: parseInt(edad.value, 10) || 0,
            estadoCivil: situ.estadoCivil || 'soltero',
            hijos,
            ascendientes: situ.ascendientes || [],
            discapacidad: parseInt(discapacidad.value, 10) || 0,
            movilidadReducida: movilidadReducida.checked,
          },
        };
        generarNominasPendientes(st);
      });
      cerrarModal();
    },
  }, [
    el('label', { text: 'Bruto anual (€)' }), brutoAnual,
    el('label', { text: 'Jornada completa (h/semana)' }), jornadaCompletaHoras,
    el('label', { text: 'Tus horas/semana' }), horasSemana,
    el('label', { text: 'Número de pagas' }), numeroPagas,
    el('label', { text: 'Día de cobro' }), diaCobro,
    el('label', { text: 'Tipo de contrato' }), contrato,
    el('label', { text: 'Nómina activa desde' }), activoDesde,
    el('label', { text: 'Edad' }), edad,
    el('label', { text: 'Número de hijos' }), numHijos,
    el('label', { text: 'De ellos, menores de 3 años' }), hijosMenores3,
    el('label', { text: 'Discapacidad' }), discapacidad,
    el('label', { class: 'checkbox-label' }, [movilidadReducida, document.createTextNode(' Movilidad reducida')]),
    el('button', { type: 'submit', class: 'btn-primary', text: 'Guardar' }),
  ]);
  abrirModal('Configuración del salario', form);
}
