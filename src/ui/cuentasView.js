import { el, tarjeta, barra, abrirModal, cerrarModal } from './componentes.js';
import { euros } from './formato.js';
import { update } from '../store/state.js';
import { crearCuenta, editarCuenta, archivarCuenta, cuentasActivas, saldoCuenta, ajustarSaldo } from '../domain/cuentas.js';
import { crearDivision, editarDivision, eliminarDivision, divisionesDeCuenta, saldoDivision, sinAsignar, repartirPorPorcentaje, repartirPorImporte, ahorroMensualNecesario } from '../domain/divisiones.js';
import { crearTraspaso } from '../domain/traspasos.js';
import { hoyISO } from '../util/fechas.js';

let cuentaSeleccionadaId = null;

export function renderCuentas(contenedor, state) {
  const cuentas = cuentasActivas(state);
  if (cuentaSeleccionadaId && !cuentas.some((c) => c.id === cuentaSeleccionadaId)) {
    cuentaSeleccionadaId = null;
  }

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Tus cuentas' }),
      cuentas.length
        ? el('div', {}, cuentas.map((c) => filaCuenta(state, c)))
        : el('p', { class: 'empty-state', text: 'Todavía no has creado ninguna cuenta.' }),
      el('div', { class: 'action-row' }, [
        el('button', { type: 'button', class: 'btn-primary', text: '+ Nueva cuenta', onClick: () => abrirFormularioCuenta(state) }),
        el('button', { type: 'button', class: 'btn-secondary', text: '⇄ Traspaso', onClick: () => abrirFormularioTraspaso(state) }),
      ]),
    ]),
  );

  const cuenta = cuentas.find((c) => c.id === cuentaSeleccionadaId);
  if (cuenta) contenedor.append(detalleCuenta(state, cuenta));
}

function filaCuenta(state, c) {
  return el('div', { class: 'account-card', onClick: () => { cuentaSeleccionadaId = c.id; update(() => {}); } }, [
    el('span', { class: 'account-dot', style: `background-color:${c.color}` }),
    el('div', { class: 'account-info' }, [
      el('div', { class: 'account-name', text: c.nombre }),
      el('div', { class: 'account-meta', text: c.tipo === 'ahorro' ? `Ahorro · TAE ${c.tae}%` : 'Corriente' }),
    ]),
    el('span', { class: 'account-balance', text: euros(saldoCuenta(state, c.id)) }),
  ]);
}

function detalleCuenta(state, cuenta) {
  const divisiones = divisionesDeCuenta(state, cuenta.id);
  const sinAsignarValor = sinAsignar(state, cuenta.id);

  return tarjeta([
    el('div', { class: 'division-top' }, [
      el('h2', { text: cuenta.nombre }),
      el('span', { class: 'account-balance', text: euros(saldoCuenta(state, cuenta.id)) }),
    ]),
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Editar', onClick: () => abrirFormularioCuenta(state, cuenta) }),
      el('button', { type: 'button', class: 'btn-secondary', text: 'Ajustar saldo', onClick: () => abrirFormularioAjuste(state, cuenta) }),
      el('button', { type: 'button', class: 'btn-secondary', text: 'Archivar', onClick: () => archivar(cuenta) }),
    ]),
    el('h2', { text: 'Divisiones', class: 'section-title' }),
    el('div', {}, [
      ...divisiones.map((d) => filaDivision(state, cuenta, d)),
      el('div', { class: 'division-item' }, [
        el('div', { class: 'division-top' }, [
          el('span', { text: 'Sin asignar' }),
          el('span', { class: sinAsignarValor < 0 ? 'division-balance negative' : '', text: euros(sinAsignarValor) }),
        ]),
      ]),
    ]),
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: '+ División', onClick: () => abrirFormularioDivision(state, cuenta) }),
      el('button', { type: 'button', class: 'btn-secondary', text: 'Repartir', onClick: () => abrirFormularioReparto(state, cuenta) }),
    ]),
  ]);
}

function filaDivision(state, cuenta, d) {
  const saldo = saldoDivision(state, d.id);
  const pct = d.objetivo ? Math.min(100, (saldo / d.objetivo) * 100) : null;
  const necesario = ahorroMensualNecesario(state, d.id);
  return el('div', { class: 'division-item' }, [
    el('div', { class: 'division-top' }, [
      el('span', { class: 'division-name', text: d.nombre }),
      el('span', { class: saldo < 0 ? 'division-balance negative' : '', text: euros(saldo) }),
    ]),
    d.objetivo ? barra(pct) : null,
    d.objetivo ? el('div', { class: 'division-goal-text', text: `Objetivo ${euros(d.objetivo)}${necesario ? ` · faltan ${euros(necesario)}/mes` : ''}` }) : null,
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Editar', onClick: () => abrirFormularioDivision(state, cuenta, d) }),
      el('button', { type: 'button', class: 'btn-secondary', text: 'Eliminar', onClick: () => eliminarDivisionUI(d) }),
    ]),
  ]);
}

function archivar(cuenta) {
  if (!confirm(`¿Archivar la cuenta "${cuenta.nombre}"? Podrás seguir consultando su historial.`)) return;
  update((state) => archivarCuenta(state, cuenta.id, true));
  cuentaSeleccionadaId = null;
}

function eliminarDivisionUI(division) {
  if (!confirm(`¿Eliminar la división "${division.nombre}"? Su saldo pasará a "Sin asignar".`)) return;
  update((state) => eliminarDivision(state, division.id));
}

function abrirFormularioCuenta(state, cuenta) {
  const esEdicion = Boolean(cuenta);
  const nombre = el('input', { type: 'text', value: cuenta?.nombre || '', placeholder: 'Cuenta nómina' });
  const tipo = el('select', {}, [
    el('option', { value: 'corriente', text: 'Corriente' }),
    el('option', { value: 'ahorro', text: 'Ahorro' }),
  ]);
  tipo.value = cuenta?.tipo || 'corriente';
  const saldoInicial = el('input', { type: 'number', step: '0.01', value: cuenta?.saldoInicial ?? '0' });
  const tae = el('input', { type: 'number', step: '0.01', value: cuenta?.tae ?? '0' });
  const grupoTae = el('div', { class: 'form-group' }, [el('label', { text: 'TAE (%)' }), tae]);
  const color = el('input', { type: 'color', value: cuenta?.color || '#3987e5' });

  function actualizarVisibilidadTae() {
    grupoTae.classList.toggle('hidden', tipo.value !== 'ahorro');
  }
  tipo.addEventListener('change', actualizarVisibilidadTae);
  actualizarVisibilidadTae();

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const datos = { nombre: nombre.value.trim(), tipo: tipo.value, saldoInicial: parseFloat(saldoInicial.value) || 0, tae: parseFloat(tae.value) || 0, color: color.value };
      if (!datos.nombre) return;
      update((s) => {
        if (esEdicion) editarCuenta(s, cuenta.id, datos);
        else crearCuenta(s, datos);
      });
      cerrarModal();
    },
  }, [
    el('label', { text: 'Nombre' }), nombre,
    el('label', { text: 'Tipo' }), tipo,
    el('label', { text: esEdicion ? 'Saldo inicial' : 'Saldo inicial (€)' }), saldoInicial,
    grupoTae,
    el('label', { text: 'Color' }), color,
    el('button', { type: 'submit', class: 'btn-primary', text: esEdicion ? 'Guardar cambios' : 'Crear cuenta' }),
  ]);

  abrirModal(esEdicion ? 'Editar cuenta' : 'Nueva cuenta', form);
}

function abrirFormularioAjuste(state, cuenta) {
  const saldoActual = saldoCuenta(state, cuenta.id);
  const input = el('input', { type: 'number', step: '0.01', value: saldoActual });
  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const valor = parseFloat(input.value);
      if (Number.isNaN(valor)) return;
      update((s) => ajustarSaldo(s, cuenta.id, valor, hoyISO()));
      cerrarModal();
    },
  }, [
    el('p', { class: 'hint-text', text: `Saldo calculado: ${euros(saldoActual)}. Si tu banco dice otra cosa, escribe el saldo real y se apuntará un movimiento de ajuste.` }),
    el('label', { text: 'Saldo real (€)' }), input,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Ajustar' }),
  ]);
  abrirModal('Ajustar saldo', form);
}

function abrirFormularioDivision(state, cuenta, division) {
  const esEdicion = Boolean(division);
  const nombre = el('input', { type: 'text', value: division?.nombre || '', placeholder: 'Viajes' });
  const objetivo = el('input', { type: 'number', step: '0.01', value: division?.objetivo ?? '' });
  const objetivoFecha = el('input', { type: 'date', value: division?.objetivoFecha || '' });
  const color = el('input', { type: 'color', value: division?.color || '#199e70' });

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      if (!nombre.value.trim()) return;
      const datos = {
        cuentaId: cuenta.id,
        nombre: nombre.value.trim(),
        objetivo: objetivo.value ? parseFloat(objetivo.value) : null,
        objetivoFecha: objetivoFecha.value || null,
        color: color.value,
      };
      update((s) => {
        if (esEdicion) editarDivision(s, division.id, datos);
        else crearDivision(s, datos);
      });
      cerrarModal();
    },
  }, [
    el('label', { text: 'Nombre' }), nombre,
    el('label', { text: 'Objetivo (€, opcional)' }), objetivo,
    el('label', { text: 'Fecha objetivo (opcional)' }), objetivoFecha,
    el('label', { text: 'Color' }), color,
    el('button', { type: 'submit', class: 'btn-primary', text: esEdicion ? 'Guardar cambios' : 'Crear división' }),
  ]);

  abrirModal(esEdicion ? 'Editar división' : 'Nueva división', form);
}

function abrirFormularioReparto(state, cuenta) {
  const divisiones = divisionesDeCuenta(state, cuenta.id);
  const disponible = sinAsignar(state, cuenta.id);
  if (!divisiones.length) {
    alert('Crea al menos una división antes de repartir.');
    return;
  }

  let modo = 'importe';
  const inputs = divisiones.map((d) => ({ division: d, input: el('input', { type: 'number', step: '0.01', value: '0', min: '0' }) }));
  const labels = inputs.map(({ division }) => el('label', { text: `${division.nombre} (€)` }));

  function aplicarModo() {
    inputs.forEach(({ input }, i) => {
      labels[i].textContent = `${inputs[i].division.nombre} (${modo === 'importe' ? '€' : '%'})`;
      input.step = modo === 'importe' ? '0.01' : '0.1';
      if (modo === 'porcentaje') input.max = '100'; else input.removeAttribute('max');
    });
    botonImporte.classList.toggle('btn-primary', modo === 'importe');
    botonImporte.classList.toggle('btn-secondary', modo !== 'importe');
    botonPorcentaje.classList.toggle('btn-primary', modo === 'porcentaje');
    botonPorcentaje.classList.toggle('btn-secondary', modo !== 'porcentaje');
  }

  const botonImporte = el('button', { type: 'button', text: 'Importe (€)', onClick: () => { modo = 'importe'; aplicarModo(); } });
  const botonPorcentaje = el('button', { type: 'button', text: 'Porcentaje (%)', onClick: () => { modo = 'porcentaje'; aplicarModo(); } });

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      try {
        if (modo === 'importe') {
          const reparto = inputs.map(({ division, input }) => ({ divisionId: division.id, importe: parseFloat(input.value) || 0 }));
          update((s) => repartirPorImporte(s, cuenta.id, reparto, hoyISO()));
        } else {
          const reparto = inputs.map(({ division, input }) => ({ divisionId: division.id, porcentaje: parseFloat(input.value) || 0 }));
          update((s) => repartirPorPorcentaje(s, cuenta.id, reparto, hoyISO()));
        }
        cerrarModal();
      } catch (err) {
        alert(err.message);
      }
    },
  }, [
    el('p', { class: 'hint-text', text: `Repartiendo el "Sin asignar" actual: ${euros(disponible)}.` }),
    el('div', { class: 'action-row' }, [botonImporte, botonPorcentaje]),
    ...inputs.flatMap(({ input }, i) => [labels[i], input]),
    el('button', { type: 'submit', class: 'btn-primary', text: 'Repartir' }),
  ]);

  aplicarModo();
  abrirModal('Repartir "Sin asignar"', form);
}

function abrirFormularioTraspaso(state) {
  const cuentas = cuentasActivas(state);
  if (cuentas.length < 1) {
    alert('Crea al menos una cuenta primero.');
    return;
  }

  const cuentaOrigen = selectCuentas(cuentas, cuentas[0].id);
  const divisionOrigen = el('select', {});
  const cuentaDestino = selectCuentas(cuentas, cuentas[0].id);
  const divisionDestino = el('select', {});
  const importe = el('input', { type: 'number', step: '0.01', min: '0.01' });
  const nota = el('input', { type: 'text', placeholder: 'Aporte mensual al colchón' });

  function actualizarDivisiones(select, cuentaId) {
    select.innerHTML = '';
    select.append(el('option', { value: '', text: 'Sin asignar' }));
    divisionesDeCuenta(state, cuentaId).forEach((d) => select.append(el('option', { value: d.id, text: d.nombre })));
  }
  actualizarDivisiones(divisionOrigen, cuentaOrigen.value);
  actualizarDivisiones(divisionDestino, cuentaDestino.value);
  cuentaOrigen.addEventListener('change', () => actualizarDivisiones(divisionOrigen, cuentaOrigen.value));
  cuentaDestino.addEventListener('change', () => actualizarDivisiones(divisionDestino, cuentaDestino.value));

  const form = el('form', {
    onSubmit: (e) => {
      e.preventDefault();
      const valor = parseFloat(importe.value);
      if (!(valor > 0)) return;
      update((s) => crearTraspaso(s, {
        fecha: hoyISO(),
        importe: valor,
        cuentaOrigen: cuentaOrigen.value,
        divisionOrigen: divisionOrigen.value || null,
        cuentaDestino: cuentaDestino.value,
        divisionDestino: divisionDestino.value || null,
        nota: nota.value,
      }));
      cerrarModal();
    },
  }, [
    el('label', { text: 'Desde cuenta' }), cuentaOrigen,
    el('label', { text: 'Desde división' }), divisionOrigen,
    el('label', { text: 'A cuenta' }), cuentaDestino,
    el('label', { text: 'A división' }), divisionDestino,
    el('label', { text: 'Importe (€)' }), importe,
    el('label', { text: 'Nota (opcional)' }), nota,
    el('button', { type: 'submit', class: 'btn-primary', text: 'Traspasar' }),
  ]);

  abrirModal('Intercambio de dinero', form);
}

function selectCuentas(cuentas, valorActual) {
  const select = el('select', {}, cuentas.map((c) => el('option', { value: c.id, text: c.nombre })));
  select.value = valorActual;
  return select;
}
