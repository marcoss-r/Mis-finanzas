import { el, tarjeta, barra, abrirModal, cerrarModal } from './componentes.js';
import { euros } from './formato.js';
import { update } from '../store/state.js';
import { cuentasActivas } from '../domain/cuentas.js';
import { divisionesDeCuenta } from '../domain/divisiones.js';
import { crearMovimiento, editarMovimiento, eliminarMovimiento, movimientosDelMes } from '../domain/movimientos.js';
import { crearSuscripcion, alternarActiva, eliminarSuscripcion } from '../domain/suscripciones.js';
import { crearPresupuesto, eliminarPresupuesto, presupuestosVigentes, gastadoEnCategoria } from '../domain/presupuestos.js';
import { generarMeses, mesActual, hoyISO } from '../util/fechas.js';

let mesSeleccionado = mesActual();

export function renderMovimientos(contenedor, state) {
  contenedor.append(
    tarjeta([
      el('label', { text: 'Mes' }),
      selectorMeses(),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Añadir movimiento' }),
      formularioMovimiento(state),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Categorías' }),
      el('ul', { class: 'category-list' }, state.categorias.map((cat) => el('li', { class: 'category-chip' }, [
        el('span', { text: cat }),
        el('button', { type: 'button', text: '×', 'aria-label': `Eliminar ${cat}`, onClick: () => eliminarCategoriaUI(state, cat) }),
      ]))),
      el('div', { class: 'add-category' }, [
        (() => { const i = el('input', { type: 'text', placeholder: 'Nueva categoría' }); i.id = 'nueva-categoria-input'; return i; })(),
        el('button', { type: 'button', class: 'btn-secondary', text: 'Añadir', onClick: () => añadirCategoriaUI() }),
      ]),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Suscripciones' }),
      el('ul', { class: 'movement-list' }, state.suscripciones.filter((s) => s.desde <= mesSeleccionado).map((s) => filaSuscripcion(state, s))),
      el('button', { type: 'button', class: 'btn-secondary', text: '+ Suscripción', onClick: () => abrirFormularioSuscripcion(state) }),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Presupuestos' }),
      el('div', {}, presupuestosVigentes(state, mesSeleccionado).map((p) => filaPresupuesto(state, p))),
      el('button', { type: 'button', class: 'btn-secondary', text: '+ Presupuesto', onClick: () => abrirFormularioPresupuesto(state) }),
    ]),
  );

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Movimientos de este mes' }),
      el('ul', { class: 'movement-list' }, movimientosDelMes(state, mesSeleccionado).map((m) => filaMovimiento(state, m))),
    ]),
  );
}

function selectorMeses() {
  const select = el('select', {
    onChange: (e) => { mesSeleccionado = e.target.value; update(() => {}); },
  }, generarMeses(18).map((m) => el('option', { value: m.value, text: m.label })));
  select.value = mesSeleccionado;
  return select;
}

function selectCuentasYDivisiones(state, cuentaValor, divisionValor) {
  const cuentas = cuentasActivas(state);
  const selectCuenta = el('select', {}, cuentas.map((c) => el('option', { value: c.id, text: c.nombre })));
  selectCuenta.value = cuentaValor || cuentas[0]?.id || '';
  const selectDivision = el('select', {});

  function actualizarDivisiones() {
    selectDivision.innerHTML = '';
    selectDivision.append(el('option', { value: '', text: 'Sin asignar' }));
    divisionesDeCuenta(state, selectCuenta.value).forEach((d) => selectDivision.append(el('option', { value: d.id, text: d.nombre })));
    if (divisionValor) selectDivision.value = divisionValor;
  }
  selectCuenta.addEventListener('change', actualizarDivisiones);
  actualizarDivisiones();

  return { selectCuenta, selectDivision };
}

function formularioMovimiento(state) {
  if (!cuentasActivas(state).length) {
    return el('p', { class: 'empty-state', text: 'Crea una cuenta antes de registrar movimientos.' });
  }

  const tipo = el('select', {}, [
    el('option', { value: 'gasto', text: 'Gasto' }),
    el('option', { value: 'ingreso', text: 'Ingreso' }),
  ]);
  const categoria = el('select', {}, state.categorias.map((c) => el('option', { value: c, text: c })));
  const nombre = el('input', { type: 'text', placeholder: 'Ej: Cena con amigos' });
  const importe = el('input', { type: 'number', step: '0.01', min: '0', placeholder: '0.00' });
  const fecha = el('input', { type: 'date', value: hoyISO(), required: '' });
  const { selectCuenta, selectDivision } = selectCuentasYDivisiones(state);

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const valor = parseFloat(importe.value);
      if (!(valor > 0) || !nombre.value.trim()) return;
      update((s) => crearMovimiento(s, {
        tipo: tipo.value,
        cuentaId: selectCuenta.value,
        divisionId: selectDivision.value || null,
        categoria: categoria.value,
        nombre: nombre.value.trim(),
        importe: valor,
        fecha: fecha.value,
      }));
      nombre.value = '';
      importe.value = '';
    },
  }, [
    el('label', { text: 'Tipo' }), tipo,
    el('label', { text: 'Cuenta' }), selectCuenta,
    el('label', { text: 'División' }), selectDivision,
    el('label', { text: 'Categoría' }), categoria,
    el('label', { text: 'Nombre' }), nombre,
    el('label', { text: 'Importe (€)' }), importe,
    el('label', { text: 'Fecha' }), fecha,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Añadir' }),
  ]);
  return form;
}

function filaMovimiento(state, mov) {
  const cuenta = state.cuentas.find((c) => c.id === mov.cuentaId);
  const esGasto = mov.tipo === 'gasto';
  return el('li', { class: 'movement-item' }, [
    el('span', { class: 'movement-name', text: mov.nombre }),
    el('span', { class: 'movement-category', text: `${mov.categoria} · ${cuenta?.nombre || ''}` }),
    el('span', { class: `movement-amount ${esGasto ? 'expense' : 'income'}`, text: `${esGasto ? '-' : '+'}${euros(mov.importe)}` }),
    el('div', { class: 'movement-menu' }, [
      el('button', { type: 'button', class: 'movement-menu-btn', text: '⋮', onClick: (e) => alternarMenu(e) }),
      el('div', { class: 'movement-menu-dropdown hidden' }, [
        el('button', { type: 'button', text: 'Editar', onClick: () => abrirFormularioEditarMovimiento(state, mov) }),
        el('button', { type: 'button', text: 'Eliminar', onClick: () => { if (confirm('¿Eliminar este movimiento?')) update((s) => eliminarMovimiento(s, mov.id)); } }),
      ]),
    ]),
  ]);
}

function alternarMenu(e) {
  e.stopPropagation();
  document.querySelectorAll('.movement-menu-dropdown').forEach((d) => d.classList.add('hidden'));
  e.currentTarget.nextElementSibling.classList.remove('hidden');
}
document.addEventListener('click', () => document.querySelectorAll('.movement-menu-dropdown').forEach((d) => d.classList.add('hidden')));

function abrirFormularioEditarMovimiento(state, mov) {
  const nombre = el('input', { type: 'text', value: mov.nombre });
  const importe = el('input', { type: 'number', step: '0.01', value: mov.importe });
  const fecha = el('input', { type: 'date', value: mov.fecha });
  const categoria = el('select', {}, state.categorias.map((c) => el('option', { value: c, text: c })));
  categoria.value = mov.categoria;
  const { selectCuenta, selectDivision } = selectCuentasYDivisiones(state, mov.cuentaId, mov.divisionId);

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      update((s) => editarMovimiento(s, mov.id, {
        nombre: nombre.value.trim(),
        importe: parseFloat(importe.value) || mov.importe,
        fecha: fecha.value,
        categoria: categoria.value,
        cuentaId: selectCuenta.value,
        divisionId: selectDivision.value || null,
      }));
      cerrarModal();
    },
  }, [
    el('label', { text: 'Nombre' }), nombre,
    el('label', { text: 'Importe (€)' }), importe,
    el('label', { text: 'Fecha' }), fecha,
    el('label', { text: 'Categoría' }), categoria,
    el('label', { text: 'Cuenta' }), selectCuenta,
    el('label', { text: 'División' }), selectDivision,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Guardar cambios' }),
  ]);
  abrirModal('Editar movimiento', form);
}

function añadirCategoriaUI() {
  const input = document.getElementById('nueva-categoria-input');
  const nombre = input.value.trim();
  if (!nombre) return;
  update((s) => {
    if (!s.categorias.some((c) => c.toLowerCase() === nombre.toLowerCase())) s.categorias.push(nombre);
  });
}

function eliminarCategoriaUI(state, nombre) {
  if (state.categorias.length === 1) {
    alert('No puedes eliminar la única categoría que tienes.');
    return;
  }
  if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
  update((s) => { s.categorias = s.categorias.filter((c) => c !== nombre); });
}

function filaSuscripcion(state, sus) {
  const cuenta = state.cuentas.find((c) => c.id === sus.cuentaId);
  return el('li', { class: 'movement-item movement-item--subscription' }, [
    el('span', { class: 'movement-name', text: sus.nombre }),
    el('span', { class: 'movement-category', text: `${sus.categoria} · ${cuenta?.nombre || ''} · día ${sus.diaCobro} · ${sus.activa ? 'Activa' : 'Inactiva'}` }),
    el('span', { class: 'movement-amount expense', text: `-${euros(sus.importe)}` }),
    el('div', { class: 'movement-menu' }, [
      el('button', { type: 'button', class: 'movement-menu-btn', text: '⋮', onClick: (e) => alternarMenu(e) }),
      el('div', { class: 'movement-menu-dropdown hidden' }, [
        el('button', { type: 'button', text: sus.activa ? 'Desactivar' : 'Activar', onClick: () => update((s) => alternarActiva(s, sus.id)) }),
        el('button', { type: 'button', text: 'Eliminar', onClick: () => { if (confirm('¿Eliminar esta suscripción?')) update((s) => eliminarSuscripcion(s, sus.id)); } }),
      ]),
    ]),
  ]);
}

function abrirFormularioSuscripcion(state) {
  if (!cuentasActivas(state).length) {
    alert('Crea una cuenta primero.');
    return;
  }
  const nombre = el('input', { type: 'text', placeholder: 'Netflix' });
  const importe = el('input', { type: 'number', step: '0.01', min: '0' });
  const categoria = el('select', {}, state.categorias.map((c) => el('option', { value: c, text: c })));
  const diaCobro = el('input', { type: 'number', min: '1', max: '28', value: '1' });
  const { selectCuenta, selectDivision } = selectCuentasYDivisiones(state);

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      if (!nombre.value.trim() || !(parseFloat(importe.value) > 0)) return;
      update((s) => crearSuscripcion(s, {
        nombre: nombre.value.trim(),
        importe: parseFloat(importe.value),
        categoria: categoria.value,
        cuentaId: selectCuenta.value,
        divisionId: selectDivision.value || null,
        diaCobro: diaCobro.value,
        desde: mesSeleccionado,
      }));
      cerrarModal();
    },
  }, [
    el('label', { text: 'Nombre' }), nombre,
    el('label', { text: 'Importe (€/mes)' }), importe,
    el('label', { text: 'Categoría' }), categoria,
    el('label', { text: 'Cuenta' }), selectCuenta,
    el('label', { text: 'División' }), selectDivision,
    el('label', { text: 'Día de cobro' }), diaCobro,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Crear suscripción' }),
  ]);
  abrirModal('Nueva suscripción', form);
}

function filaPresupuesto(state, p) {
  const gastado = gastadoEnCategoria(state, p.categoria, mesSeleccionado);
  const pct = p.limite > 0 ? (gastado / p.limite) * 100 : 0;
  const clase = pct >= 100 ? 'limit-over' : pct >= 70 ? 'limit-warning' : '';
  return el('div', { class: 'goal-item' }, [
    el('div', { class: 'division-top' }, [
      el('span', { text: p.categoria }),
      el('span', { text: `${euros(gastado)} / ${euros(p.limite)}` }),
    ]),
    barra(pct, clase),
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Eliminar', onClick: () => update((s) => eliminarPresupuesto(s, p.id)) }),
    ]),
  ]);
}

function abrirFormularioPresupuesto(state) {
  const categoria = el('select', {}, state.categorias.map((c) => el('option', { value: c, text: c })));
  const limite = el('input', { type: 'number', step: '0.01', min: '0' });

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      if (!(parseFloat(limite.value) > 0)) return;
      update((s) => crearPresupuesto(s, { categoria: categoria.value, limite: parseFloat(limite.value), desde: mesSeleccionado }));
      cerrarModal();
    },
  }, [
    el('label', { text: 'Categoría' }), categoria,
    el('label', { text: 'Límite mensual (€)' }), limite,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Crear presupuesto' }),
  ]);
  abrirModal('Nuevo presupuesto', form);
}
