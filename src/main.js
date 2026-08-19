import { getState, subscribe, update } from './store/state.js';
import { exportarDatosV1, borrarDatosV1 } from './store/storage.js';
import { generarCargosPendientes } from './domain/suscripciones.js';
import { abonarInteresesPendientes } from './domain/interes.js';
import { generarNominasPendientes } from './domain/salario.js';
import { el, abrirModal, cerrarModal } from './ui/componentes.js';
import { renderInicio } from './ui/inicio.js';
import { renderCuentas } from './ui/cuentasView.js';
import { renderMovimientos } from './ui/movimientosView.js';
import { renderSalario } from './ui/salarioView.js';
import { renderEstadisticas } from './ui/estadisticasView.js';

mostrarBienvenidaV1SiHaceFalta();

function mostrarBienvenidaV1SiHaceFalta() {
  if (localStorage.getItem('finanzas:v2')) return;
  const datosV1 = exportarDatosV1();
  if (!datosV1) return;

  const continuar = () => {
    borrarDatosV1();
    cerrarModal();
  };

  const exportar = () => {
    const blob = new Blob([JSON.stringify(datosV1, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'mis-finanzas-v1.json';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const contenido = el('div', {}, [
    el('p', { class: 'hint-text', text: 'Esta versión reestructura la app como gestor de cuentas, divisiones, presupuestos y salario, y empieza con datos nuevos. Antes de continuar puedes exportar tus movimientos, categorías y suscripciones antiguos a un archivo.' }),
    el('div', { class: 'action-row' }, [
      el('button', { type: 'button', class: 'btn-secondary', text: 'Exportar datos antiguos', onClick: exportar }),
      el('button', { type: 'button', class: 'btn-primary', text: 'Continuar', onClick: continuar }),
    ]),
  ]);

  abrirModal('Bienvenido a la nueva Mis Finanzas', contenido);
}

const VISTAS = {
  inicio: renderInicio,
  cuentas: renderCuentas,
  movimientos: renderMovimientos,
  salario: renderSalario,
  estadisticas: renderEstadisticas,
};

let vistaActual = 'inicio';
const contenedor = document.getElementById('vista');
const botones = document.querySelectorAll('.nav-button');

function render() {
  contenedor.innerHTML = '';
  VISTAS[vistaActual](contenedor, getState());
  botones.forEach((b) => {
    const activo = b.dataset.vista === vistaActual;
    b.classList.toggle('active', activo);
    if (activo) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

botones.forEach((btn) => {
  btn.addEventListener('click', () => {
    vistaActual = btn.dataset.vista;
    render();
  });
});

subscribe(render);

update((state) => {
  generarCargosPendientes(state);
  abonarInteresesPendientes(state);
  generarNominasPendientes(state);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
