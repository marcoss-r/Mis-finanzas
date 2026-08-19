import { el, tarjeta, barra } from './componentes.js';
import { euros } from './formato.js';
import { update } from '../store/state.js';
import { movimientosDelMes } from '../domain/movimientos.js';
import { presupuestosVigentes, gastadoEnCategoria } from '../domain/presupuestos.js';
import { generarMeses, mesActual, mesesEntre } from '../util/fechas.js';

let mesSeleccionado = mesActual();
let grafico = null;

const COLORES = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'];

export function renderEstadisticas(contenedor, state) {
  contenedor.append(
    tarjeta([
      el('label', { text: 'Mes' }),
      selectorMeses(),
    ]),
  );

  const movs = movimientosDelMes(state, mesSeleccionado);
  const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((t, m) => t + m.importe, 0);
  const gastos = movs.filter((m) => m.tipo === 'gasto').reduce((t, m) => t + m.importe, 0);
  const ahorro = ingresos - gastos;

  contenedor.append(
    tarjeta([
      el('div', { class: 'summary-grid' }, [
        resumenItem('Ingresos', ingresos, 'income'),
        resumenItem('Gastos', gastos, 'expense'),
        resumenItem('Ahorro', ahorro, ahorro >= 0 ? 'income' : 'expense'),
      ]),
    ]),
  );

  const porCategoria = agrupar(movs.filter((m) => m.tipo === 'gasto'), 'categoria');
  contenedor.append(
    tarjeta([
      el('h2', { text: 'Gastos por categoría' }),
      Object.keys(porCategoria).length
        ? el('div', { class: 'chart-box' }, [(() => { const c = document.createElement('canvas'); c.id = 'grafico-categorias'; return c; })()])
        : el('p', { class: 'empty-state', text: 'No hay gastos registrados este mes.' }),
    ]),
  );

  const porDivision = agrupar(movs.filter((m) => m.tipo === 'gasto' && m.divisionId), 'divisionId');
  if (Object.keys(porDivision).length) {
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Gastos por división' }),
        el('div', {}, Object.entries(porDivision).map(([divisionId, importe]) => {
          const division = state.divisiones.find((d) => d.id === divisionId);
          return el('div', { class: 'breakdown-row' }, [
            el('span', { text: division?.nombre || divisionId }),
            el('span', { text: euros(importe) }),
          ]);
        })),
      ]),
    );
  }

  const presupuestos = presupuestosVigentes(state, mesSeleccionado);
  if (presupuestos.length) {
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Progreso de presupuestos' }),
        el('div', {}, presupuestos.map((p) => {
          const gastado = gastadoEnCategoria(state, p.categoria, mesSeleccionado);
          const pct = p.limite > 0 ? (gastado / p.limite) * 100 : 0;
          const clase = pct >= 100 ? 'limit-over' : pct >= 70 ? 'limit-warning' : '';
          return el('div', { class: 'goal-item' }, [
            el('div', { class: 'division-top' }, [el('span', { text: p.categoria }), el('span', { text: `${euros(gastado)} / ${euros(p.limite)}` })]),
            barra(pct, clase),
          ]);
        })),
      ]),
    );
  }

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Evolución del patrimonio' }),
      el('div', {}, ultimosMeses(mesSeleccionado, 6).map((mes) => el('div', { class: 'breakdown-row' }, [
        el('span', { text: mes }),
        el('span', { text: euros(patrimonioHasta(state, `${mes}-31`)) }),
      ]))),
    ]),
  );

  if (Object.keys(porCategoria).length) {
    requestAnimationFrame(() => pintarGrafico(porCategoria));
  }
}

function selectorMeses() {
  const select = el('select', { onChange: (e) => { mesSeleccionado = e.target.value; update(() => {}); } },
    generarMeses(18).map((m) => el('option', { value: m.value, text: m.label })));
  select.value = mesSeleccionado;
  return select;
}

function resumenItem(etiqueta, valor, clase) {
  return el('div', { class: 'summary-item' }, [
    el('span', { class: 'summary-label', text: etiqueta }),
    el('span', { class: `summary-value ${clase}`, text: euros(valor) }),
  ]);
}

function agrupar(movs, campo) {
  const totales = {};
  movs.forEach((m) => {
    const clave = m[campo];
    totales[clave] = (totales[clave] || 0) + m.importe;
  });
  return totales;
}

function ultimosMeses(mesFinal, cantidad) {
  const [anio, mes] = mesFinal.split('-').map(Number);
  const inicio = new Date(anio, mes - 1 - (cantidad - 1), 1);
  const desde = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`;
  return mesesEntre(desde, mesFinal);
}

function patrimonioHasta(state, fechaISO) {
  let total = 0;
  state.cuentas.forEach((c) => {
    let saldo = c.saldoInicial;
    state.movimientos.forEach((m) => {
      if (m.cuentaId === c.id && m.fecha <= fechaISO) saldo += m.tipo === 'ingreso' ? m.importe : -m.importe;
    });
    state.traspasos.forEach((t) => {
      if (t.fecha > fechaISO) return;
      if (t.cuentaDestino === c.id) saldo += t.importe;
      if (t.cuentaOrigen === c.id) saldo -= t.importe;
    });
    total += saldo;
  });
  return Math.round(total * 100) / 100;
}

function pintarGrafico(datos) {
  const canvas = document.getElementById('grafico-categorias');
  if (!canvas || typeof Chart === 'undefined') return;
  const etiquetas = Object.keys(datos);
  const valores = Object.values(datos);
  if (grafico) grafico.destroy();
  grafico = new Chart(canvas, {
    type: 'pie',
    data: { labels: etiquetas, datasets: [{ data: valores, backgroundColor: etiquetas.map((_, i) => COLORES[i % COLORES.length]) }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#ffffff' } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const pct = total > 0 ? (ctx.parsed / total) * 100 : 0;
              return `${ctx.label}: ${ctx.parsed.toFixed(2)} € (${pct.toFixed(0)}%)`;
            },
          },
        },
      },
    },
  });
}
