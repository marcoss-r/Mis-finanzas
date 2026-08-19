import { el, abrirModal, cerrarModal } from './componentes.js';
import { update } from '../store/state.js';
import { TABLAS_POR_DEFECTO, obtenerTablasFiscales } from '../domain/fiscal/tablas.js';

function leerRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function escribirRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  let actual = obj;
  partes.slice(0, -1).forEach((k) => {
    if (typeof actual[k] !== 'object' || actual[k] === null) actual[k] = {};
    actual = actual[k];
  });
  actual[partes[partes.length - 1]] = valor;
}

function seccionNumeros(titulo, campos, tablas, registro) {
  return el('div', {}, [
    el('h3', { class: 'section-title', text: titulo }),
    ...campos.flatMap(([ruta, etiqueta, paso]) => {
      const input = el('input', { type: 'number', step: paso || '0.01', value: leerRuta(tablas, ruta) });
      registro.push({ ruta, input, tipo: 'numero' });
      return [el('label', { text: etiqueta }), input];
    }),
  ]);
}

function seccionEscala(titulo, clave, tramosIniciales, registroEscalas) {
  const filas = tramosIniciales.map((t) => ({ ...t }));
  const contenedorFilas = el('div', {});

  function pintar() {
    contenedorFilas.innerHTML = '';
    filas.forEach((tramo, i) => {
      const hasta = el('input', { type: 'number', step: '0.01', placeholder: 'sin límite', value: tramo.hasta === null ? '' : tramo.hasta });
      const tipo = el('input', { type: 'number', step: '0.01', value: tramo.tipo });
      hasta.addEventListener('input', () => { tramo.hasta = hasta.value === '' ? null : parseFloat(hasta.value); });
      tipo.addEventListener('input', () => { tramo.tipo = parseFloat(tipo.value) || 0; });
      const eliminar = el('button', { type: 'button', text: '×', 'aria-label': 'Eliminar tramo', onClick: () => { filas.splice(i, 1); pintar(); } });
      contenedorFilas.append(el('div', { class: 'split-row' }, [
        el('div', {}, [el('label', { text: 'Hasta (€)' }), hasta]),
        el('div', {}, [el('label', { text: 'Tipo (%)' }), tipo]),
        eliminar,
      ]));
    });
  }
  pintar();

  registroEscalas.push({ clave, filas });

  return el('div', {}, [
    el('h3', { class: 'section-title', text: titulo }),
    contenedorFilas,
    el('button', { type: 'button', class: 'btn-secondary', text: '+ Tramo', onClick: () => { filas.push({ hasta: null, tipo: 0 }); pintar(); } }),
  ]);
}

export function abrirAjustesFiscales(state) {
  const tablas = obtenerTablasFiscales(state);
  const campos = [];
  const escalas = [];

  const contenido = el('div', {}, [
    el('p', { class: 'hint-text', text: 'Estos valores son estimaciones y cambian cada año (revisa la sección 9 de la planificación). Contrástalos con tu nómina real cuando la tengas.' }),

    seccionNumeros('Seguridad Social — tipos trabajador (%)', [
      ['ss.contingenciasComunes', 'Contingencias comunes'],
      ['ss.desempleoIndefinido', 'Desempleo (indefinido)'],
      ['ss.desempleoTemporal', 'Desempleo (temporal)'],
      ['ss.formacionProfesional', 'Formación profesional'],
      ['ss.mei', 'MEI'],
    ], tablas, campos),

    seccionNumeros('Base de cotización (€/mes)', [
      ['baseCotizacionMinima', 'Base mínima'],
      ['baseCotizacionMaxima', 'Base máxima'],
    ], tablas, campos),

    seccionEscala('Escala de retenciones (nómina mensual)', 'escalaRetenciones', tablas.escalaRetenciones, escalas),
    seccionEscala('Escala estatal (cuota anual real)', 'escalaEstatal', tablas.escalaEstatal, escalas),
    seccionEscala('Escala autonómica — Comunidad de Madrid', 'escalaMadrid', tablas.escalaMadrid, escalas),

    seccionNumeros('Mínimo personal y familiar (€/año)', [
      ['minimos.contribuyente', 'Contribuyente'],
      ['minimos.mayor65', 'Adicional ≥65 años'],
      ['minimos.mayor75', 'Adicional ≥75 años'],
      ['minimos.hijo1', '1er hijo'],
      ['minimos.hijo2', '2º hijo'],
      ['minimos.hijo3', '3er hijo'],
      ['minimos.hijo4', '4º hijo y siguientes'],
      ['minimos.hijoMenor3', 'Adicional por hijo <3 años'],
      ['minimos.ascendiente', 'Ascendiente a cargo'],
      ['minimos.ascendienteMayor75', 'Adicional ascendiente ≥75'],
      ['minimos.discapacidad33', 'Discapacidad 33%'],
      ['minimos.discapacidad65', 'Discapacidad 65%'],
      ['minimos.movilidadReducida', 'Movilidad reducida'],
    ], tablas, campos),

    seccionNumeros('Retribución flexible', [
      ['retribucionFlexible.comidaPorDia', 'Comida (€/día laborable)'],
      ['retribucionFlexible.transporteMes', 'Transporte (€/mes)'],
      ['retribucionFlexible.transporteAnio', 'Transporte (€/año)'],
      ['retribucionFlexible.seguroMedicoAnio', 'Seguro médico (€/año)'],
      ['retribucionFlexible.seguroMedicoAnioDiscapacidad', 'Seguro médico con discapacidad (€/año)'],
      ['retribucionFlexible.topePorcentaje', 'Tope general (% del bruto mensual)'],
    ], tablas, campos),

    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Restablecer valores por defecto', onClick: () => {
        if (!confirm('¿Borrar tus valores personalizados y volver a los de fábrica?')) return;
        update((s) => { s.ajustes.tablasFiscales = {}; });
        cerrarModal();
      } }),
      el('button', { type: 'button', class: 'btn-primary', text: 'Guardar', onClick: () => {
        const overrides = {};
        campos.forEach(({ ruta, input }) => {
          const valor = parseFloat(input.value);
          escribirRuta(overrides, ruta, Number.isNaN(valor) ? leerRuta(TABLAS_POR_DEFECTO, ruta) : valor);
        });
        escalas.forEach(({ clave, filas }) => { overrides[clave] = filas.map((t) => ({ hasta: t.hasta, tipo: t.tipo })); });
        update((s) => { s.ajustes.tablasFiscales = overrides; });
        cerrarModal();
      } }),
    ]),
  ]);

  abrirModal('Tablas fiscales (avanzado)', contenido);
}
