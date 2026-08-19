import { el, tarjeta, barra } from './componentes.js';
import { euros, fechaLarga } from './formato.js';
import { cuentasActivas, saldoCuenta, patrimonioTotal } from '../domain/cuentas.js';
import { saldoDivision, ahorroMensualNecesario } from '../domain/divisiones.js';
import { presupuestosVigentes, gastadoEnCategoria } from '../domain/presupuestos.js';
import { fechaDeCobro } from '../domain/salario.js';
import { mesActual, formatearMes } from '../util/fechas.js';
import { getState } from '../store/state.js';
import { exportarBackup, importarBackup } from '../store/backup.js';

export function renderInicio(contenedor, state) {
  const mes = mesActual();

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Patrimonio total' }),
      el('div', { class: 'networth-value', text: euros(patrimonioTotal(state)) }),
    ]),
  );

  const cuentas = cuentasActivas(state);
  contenedor.append(
    tarjeta([
      el('h2', { text: 'Tus cuentas' }),
      cuentas.length
        ? el('div', {}, cuentas.map((c) => el('div', { class: 'account-card' }, [
            el('span', { class: 'account-dot', style: `background-color:${c.color}` }),
            el('div', { class: 'account-info' }, [
              el('div', { class: 'account-name', text: c.nombre }),
              el('div', { class: 'account-meta', text: c.tipo === 'ahorro' ? `Ahorro · TAE ${c.tae}%` : 'Corriente' }),
            ]),
            el('span', { class: 'account-balance', text: euros(saldoCuenta(state, c.id)) }),
          ])))
        : el('p', { class: 'empty-state', text: 'Todavía no has creado ninguna cuenta. Ve a la pestaña Cuentas.' }),
    ]),
  );

  const objetivos = state.divisiones.filter((d) => d.objetivo);
  if (objetivos.length) {
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Objetivos activos' }),
        el('div', {}, objetivos.map((d) => {
          const saldo = saldoDivision(state, d.id);
          const pct = d.objetivo > 0 ? (saldo / d.objetivo) * 100 : 0;
          const necesario = ahorroMensualNecesario(state, d.id);
          return el('div', { class: 'goal-item' }, [
            el('div', { class: 'division-top' }, [
              el('span', { text: d.nombre }),
              el('span', { text: `${euros(saldo)} / ${euros(d.objetivo)}` }),
            ]),
            barra(pct),
            necesario !== null
              ? el('div', { class: 'division-goal-text', text: `Necesitas ahorrar ${euros(necesario)}/mes para llegar el ${d.objetivoFecha}.` })
              : null,
          ]);
        })),
      ]),
    );
  }

  const presupuestos = presupuestosVigentes(state, mes);
  if (presupuestos.length) {
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Presupuestos de este mes' }),
        el('div', {}, presupuestos.map((p) => {
          const gastado = gastadoEnCategoria(state, p.categoria, mes);
          const pct = p.limite > 0 ? (gastado / p.limite) * 100 : 0;
          const clase = pct >= 100 ? 'limit-over' : pct >= 70 ? 'limit-warning' : '';
          return el('div', { class: 'goal-item' }, [
            el('div', { class: 'division-top' }, [
              el('span', { text: p.categoria }),
              el('span', { text: `${euros(gastado)} / ${euros(p.limite)}` }),
            ]),
            barra(pct, clase),
          ]);
        })),
      ]),
    );
  }

  if (state.salario) {
    const proximoMes = fechaDeCobro(state.salario, mes) >= new Date().toISOString().slice(0, 10) ? mes : mesSiguiente(mes);
    const fecha = fechaDeCobro(state.salario, proximoMes);
    contenedor.append(
      tarjeta([
        el('h2', { text: 'Próxima nómina' }),
        el('p', { text: `Llega el ${fechaLarga(fecha)} (${formatearMes(proximoMes)}).` }),
      ]),
    );
  }

  contenedor.append(
    tarjeta([
      el('h2', { text: 'Copia de seguridad' }),
      el('p', { class: 'hint-text', text: 'Tus datos solo viven en este navegador. Exporta un archivo de vez en cuando por si acaso.' }),
      el('div', { class: 'backup-actions' }, [
        el('button', { type: 'button', class: 'btn-secondary', text: 'Exportar datos', onClick: () => exportarBackup(getState()) }),
        el('button', { type: 'button', class: 'btn-secondary', text: 'Importar datos', onClick: () => seleccionarArchivoImportar() }),
      ]),
    ]),
  );
}

function seleccionarArchivoImportar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', () => {
    const archivo = input.files[0];
    if (!archivo) return;
    if (!confirm('Esto reemplazará todos tus datos actuales por los del archivo importado. ¿Seguro que quieres continuar?')) return;
    importarBackup(archivo)
      .then(() => alert('Datos importados correctamente.'))
      .catch(() => alert('Ese archivo no se puede leer. Comprueba que es una copia de seguridad exportada desde esta misma app.'));
  });
  input.click();
}

function mesSiguiente(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const fecha = new Date(anio, m, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}
