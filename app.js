// Clave con la que guardamos los movimientos dentro de localStorage
const STORAGE_KEY = 'movimientos';
const STORAGE_KEY_CATEGORIAS = 'categorias';
const STORAGE_KEY_SUSCRIPCIONES = 'suscripciones';
const STORAGE_KEY_LIMITE = 'limiteMensual';
const LIMITE_POR_DEFECTO = 1000;
const CATEGORIAS_POR_DEFECTO = ['Comida', 'Salidas', 'Ocio', 'Transporte'];

// Referencias a los elementos del HTML que vamos a usar
const form = document.getElementById('form-movimiento');
const lista = document.getElementById('movement-list');
const selectCategoria = document.getElementById('categoria');
const inputNuevaCategoria = document.getElementById('nueva-categoria');
const btnAddCategoria = document.getElementById('btn-add-categoria');
const listaCategorias = document.getElementById('lista-categorias');
const selectorMes = document.getElementById('selector-mes');
const btnSubmitMovimiento = document.getElementById('btn-submit-movimiento');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const tipoSelect = document.getElementById('tipo');
const grupoFecha = document.getElementById('grupo-fecha');
const grupoExtraordinario = document.getElementById('grupo-extraordinario');
const listaSuscripciones = document.getElementById('subscription-list');
const btnRegistrar = document.getElementById('btn-registrar');
const btnEstadisticas = document.getElementById('btn-estadisticas');
const tabRegistrar = document.getElementById('tab-registrar');
const tabEstadisticas = document.getElementById('tab-estadisticas');
const selectorMesStats = document.getElementById('selector-mes-stats');
const statsIngresos = document.getElementById('stats-ingresos');
const statsGastos = document.getElementById('stats-gastos');
const statsAhorro = document.getElementById('stats-ahorro');
const graficoCanvas = document.getElementById('grafico-categorias');
const graficoSinDatos = document.getElementById('stats-sin-datos');
const inputLimite = document.getElementById('limite');
const limitBarFill = document.getElementById('limit-bar-fill');
const limitText = document.getElementById('limit-text');
const statsAhorroAcumulado = document.getElementById('stats-ahorro-acumulado');
const statsExtraMes = document.getElementById('stats-extra-mes');
const btnExportar = document.getElementById('btn-exportar');
const btnImportar = document.getElementById('btn-importar');
const inputImportar = document.getElementById('input-importar');

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Genera una lista de meses (el actual y los `cantidad - 1` anteriores) con el formato:
// { value: "2026-07", label: "Julio 2026" }
// `value` es el que usamos internamente para comparar/filtrar; `label` es lo que ve el usuario.
function generarMeses(cantidad = 12) {
  const hoy = new Date();
  const meses = [];

  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const year = fecha.getFullYear();
    const mes = fecha.getMonth(); // 0 = enero, 11 = diciembre
    const value = `${year}-${String(mes + 1).padStart(2, '0')}`;
    meses.push({ value, label: `${NOMBRES_MESES[mes]} ${year}` });
  }

  return meses;
}

// Mes que se está viendo/editando ahora mismo. Empieza siendo el mes actual.
let mesSeleccionado = generarMeses(1)[0].value;

// Rellena el desplegable de meses y deja seleccionado `mesSeleccionado`
function renderSelectorMes() {
  selectorMes.innerHTML = '';
  generarMeses().forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    selectorMes.appendChild(option);
  });
  selectorMes.value = mesSeleccionado;
}

// Cuando cambias de mes en el desplegable, actualizamos el estado y repintamos la lista
selectorMes.addEventListener('change', () => {
  mesSeleccionado = selectorMes.value;
  renderSuscripciones();
  renderMovimientos();
});

// Igual que el selector de mes de Registrar, pero para la pestaña Estadísticas.
// Van por separado a propósito: puedes estar registrando datos de un mes mientras
// consultas las estadísticas de otro.
let mesSeleccionadoStats = generarMeses(1)[0].value;

function renderSelectorMesStats() {
  selectorMesStats.innerHTML = '';
  generarMeses().forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    selectorMesStats.appendChild(option);
  });
  selectorMesStats.value = mesSeleccionadoStats;
}

selectorMesStats.addEventListener('change', () => {
  mesSeleccionadoStats = selectorMesStats.value;
  renderEstadisticas();
});

// Las suscripciones no tienen fecha concreta ni son "extraordinarias": son un gasto fijo
// que se repite cada mes. Por eso ocultamos esos dos campos cuando se elige "Suscripción".
function actualizarCamposSegunTipo() {
  const esSuscripcion = tipoSelect.value === 'suscripcion';

  grupoFecha.classList.toggle('hidden', esSuscripcion);
  grupoExtraordinario.classList.toggle('hidden', esSuscripcion);

  // Si el campo fecha está oculto, quitamos "required" o el navegador impediría enviar el formulario
  document.getElementById('fecha').required = !esSuscripcion;
}

tipoSelect.addEventListener('change', actualizarCamposSegunTipo);

// Cambia entre las dos pestañas moviendo la clase "active" (la que hace que
// .tab-content sea visible, ver styles.css) tanto en los botones como en las secciones.
function cambiarPestana(mostrarEstadisticas) {
  btnRegistrar.classList.toggle('active', !mostrarEstadisticas);
  btnEstadisticas.classList.toggle('active', mostrarEstadisticas);
  tabRegistrar.classList.toggle('active', !mostrarEstadisticas);
  tabEstadisticas.classList.toggle('active', mostrarEstadisticas);

  // El gráfico se pinta aquí, no al cargar la página: Chart.js necesita que el
  // <canvas> ya sea visible para medirlo bien, y al principio la pestaña está oculta.
  if (mostrarEstadisticas) {
    renderEstadisticas();
  }
}

btnRegistrar.addEventListener('click', () => cambiarPestana(false));
btnEstadisticas.addEventListener('click', () => cambiarPestana(true));

// Cargamos los movimientos guardados al abrir la página.
// localStorage solo guarda texto, por eso usamos JSON.parse para convertirlo de vuelta en un array.
// Si todavía no hay nada guardado (primera vez), devolvemos un array vacío.
function cargarMovimientos() {
  const datos = localStorage.getItem(STORAGE_KEY);
  return datos ? JSON.parse(datos) : [];
}

// Guardamos el array de movimientos en localStorage.
// JSON.stringify hace lo contrario a JSON.parse: convierte el array en texto para poder guardarlo.
function guardarMovimientos(movimientos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movimientos));
}

// Array en memoria con todos los movimientos. Se carga una vez al arrancar la app.
let movimientos = cargarMovimientos();

// Si tiene un valor, el formulario está "editando" ese movimiento en vez de crear uno nuevo.
let editandoId = null;

// Igual que con los movimientos, pero para las categorías.
// Si nunca se ha guardado nada, empezamos con las categorías por defecto del plan.
function cargarCategorias() {
  const datos = localStorage.getItem(STORAGE_KEY_CATEGORIAS);
  return datos ? JSON.parse(datos) : [...CATEGORIAS_POR_DEFECTO];
}

function guardarCategorias(categorias) {
  localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(categorias));
}

let categorias = cargarCategorias();

// El límite es un único número global (sección 4.3 del plan), no una lista, así que
// no hace falta JSON.parse/stringify: localStorage ya lo guarda bien como texto.
function cargarLimiteMensual() {
  const datos = localStorage.getItem(STORAGE_KEY_LIMITE);
  return datos ? parseFloat(datos) : LIMITE_POR_DEFECTO;
}

function guardarLimiteMensual(valor) {
  localStorage.setItem(STORAGE_KEY_LIMITE, String(valor));
}

let limiteMensual = cargarLimiteMensual();
inputLimite.value = limiteMensual;

// Cuando el campo pierde el foco (o le das a Intro) guardamos el nuevo límite.
// No hace falta repintar nada aquí: la barra vive en la otra pestaña y se
// recalcula sola la próxima vez que se abra o se cambie de mes en Estadísticas.
inputLimite.addEventListener('change', () => {
  const valor = parseFloat(inputLimite.value);
  limiteMensual = Number.isNaN(valor) || valor < 0 ? 0 : valor;
  guardarLimiteMensual(limiteMensual);
});

// Repinta las <option> del desplegable de categorías y los chips con botón de eliminar,
// ambos a partir del array `categorias`. Mismo patrón "vaciar y repintar" que en renderMovimientos.
function renderCategorias() {
  selectCategoria.innerHTML = '';
  categorias.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    selectCategoria.appendChild(option);
  });

  listaCategorias.innerHTML = '';
  categorias.forEach((cat) => {
    const chip = document.createElement('li');
    chip.className = 'category-chip';

    const nombre = document.createElement('span');
    nombre.textContent = cat;

    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.textContent = '×';
    btnEliminar.setAttribute('aria-label', `Eliminar categoría ${cat}`);
    btnEliminar.addEventListener('click', () => eliminarCategoria(cat));

    chip.append(nombre, btnEliminar);
    listaCategorias.appendChild(chip);
  });
}

// Al pulsar "Añadir" junto al campo de nueva categoría...
btnAddCategoria.addEventListener('click', () => {
  const nombre = inputNuevaCategoria.value.trim(); // trim() quita espacios sobrantes al principio/final

  if (!nombre) return; // no dejamos añadir categorías vacías

  const yaExiste = categorias.some((cat) => cat.toLowerCase() === nombre.toLowerCase());
  if (yaExiste) {
    alert('Esa categoría ya existe');
    return;
  }

  categorias.push(nombre);
  guardarCategorias(categorias);
  renderCategorias();
  inputNuevaCategoria.value = '';
});

// Elimina una categoría de la lista. Los movimientos y suscripciones que ya la usaban
// NO se tocan (guardan el nombre como texto suelto, no una referencia), así que conservan
// su categoría aunque desaparezca de la lista de futuras opciones; por eso avisamos antes
// de borrar si hay algo que la está usando.
function eliminarCategoria(nombre) {
  if (categorias.length === 1) {
    alert('No puedes eliminar la única categoría que tienes. Añade otra antes de borrar esta.');
    return;
  }

  const usosEnMovimientos = movimientos.filter((mov) => mov.categoria === nombre).length;
  const usosEnSuscripciones = suscripciones.filter((sus) => sus.categoria === nombre).length;
  const usos = usosEnMovimientos + usosEnSuscripciones;

  const mensaje = usos > 0
    ? `"${nombre}" se usa en ${usos} movimiento(s)/suscripción(es). Seguirán existiendo con esa categoría, pero ya no podrás elegirla para nuevos movimientos. ¿Eliminarla igualmente?`
    : `¿Eliminar la categoría "${nombre}"?`;

  if (!confirm(mensaje)) return;

  categorias = categorias.filter((cat) => cat !== nombre);
  guardarCategorias(categorias);
  renderCategorias();

  if (usos > 0) {
    renderMovimientos();
    renderSuscripciones();
    if (tabEstadisticas.classList.contains('active')) {
      renderEstadisticas();
    }
  }
}

// Igual que con movimientos y categorías, pero para las suscripciones.
function cargarSuscripciones() {
  const datos = localStorage.getItem(STORAGE_KEY_SUSCRIPCIONES);
  return datos ? JSON.parse(datos) : [];
}

function guardarSuscripciones(suscripciones) {
  localStorage.setItem(STORAGE_KEY_SUSCRIPCIONES, JSON.stringify(suscripciones));
}

let suscripciones = cargarSuscripciones();

// Una suscripción "cuenta" en un mes si está activa y ese mes es igual o posterior a `desde`.
// Como ambos son strings tipo "2026-07", compararlos con <= funciona igual que con números.
function obtenerSuscripcionesDelMes(mes) {
  return suscripciones.filter((sus) => sus.activa && sus.desde <= mes);
}

// Calcula los números de un mes siguiendo la sección 5 del plan:
// - ingresos: todos los ingresos de ese mes.
// - gastosNormales: gastos NO extraordinarios + suscripciones activas (esto es lo que se resta
//   del ahorro del mes, y en lo que se basará más adelante el límite mensual).
// - gastosExtraordinarios: gastos marcados como tal (los usa calcularAhorroAcumulado
//   más abajo para "sacarlos" de la hucha sin que afecten al ahorro de su propio mes).
// - ahorro: ingresos - gastosNormales (los extraordinarios NO se restan aquí).
function calcularResumenMes(mes) {
  const movimientosDelMes = movimientos.filter((mov) => mov.fecha.slice(0, 7) === mes);

  const ingresos = movimientosDelMes
    .filter((mov) => mov.tipo === 'ingreso')
    .reduce((total, mov) => total + mov.importe, 0);

  const gastosPuntuales = movimientosDelMes
    .filter((mov) => mov.tipo === 'gasto' && !mov.extraordinario)
    .reduce((total, mov) => total + mov.importe, 0);

  const gastosExtraordinarios = movimientosDelMes
    .filter((mov) => mov.tipo === 'gasto' && mov.extraordinario)
    .reduce((total, mov) => total + mov.importe, 0);

  const gastosSuscripciones = obtenerSuscripcionesDelMes(mes)
    .reduce((total, sus) => total + sus.importe, 0);

  const gastosNormales = gastosPuntuales + gastosSuscripciones;

  return {
    ingresos,
    gastosNormales,
    gastosExtraordinarios,
    ahorro: ingresos - gastosNormales,
  };
}

// El mes más antiguo del que hay algún dato (un movimiento o el alta de una suscripción).
// Los strings "YYYY-MM" se pueden ordenar como si fueran texto normal porque el año va
// primero y el mes siempre tiene dos cifras: "2026-02" < "2026-07" alfabéticamente también.
function obtenerMesMasAntiguo() {
  const meses = [
    ...movimientos.map((mov) => mov.fecha.slice(0, 7)),
    ...suscripciones.map((sus) => sus.desde),
  ].filter(Boolean);

  if (meses.length === 0) return null;
  return meses.sort()[0];
}

// Genera la lista de meses entre `desde` y `hasta` (ambos incluidos), en orden.
function generarRangoMeses(desde, hasta) {
  const meses = [];
  let [anio, mes] = desde.split('-').map(Number);
  const [anioHasta, mesHasta] = hasta.split('-').map(Number);

  while (anio < anioHasta || (anio === anioHasta && mes <= mesHasta)) {
    meses.push(`${anio}-${String(mes).padStart(2, '0')}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }

  return meses;
}

// La hucha (sección 5 del plan): se suman los ahorros de cada mes desde que hay datos
// hasta `hastaMes`, y se restan los gastos extraordinarios de esos mismos meses.
// Por eso un gasto extraordinario "sale de la hucha" sin afectar al ahorro de su propio mes.
function calcularAhorroAcumulado(hastaMes) {
  const mesMasAntiguo = obtenerMesMasAntiguo();
  if (!mesMasAntiguo || mesMasAntiguo > hastaMes) return 0;

  return generarRangoMeses(mesMasAntiguo, hastaMes).reduce((total, mes) => {
    const resumen = calcularResumenMes(mes);
    return total + resumen.ahorro - resumen.gastosExtraordinarios;
  }, 0);
}

// Agrupa por categoría los gastos normales (no extraordinarios) de un mes, sumando también
// las suscripciones activas en su propia categoría (sección 12.2 del plan).
// Devuelve algo como { Comida: 120.5, Ocio: 12.99 }
function obtenerGastosPorCategoria(mes) {
  const totales = {};

  movimientos
    .filter((mov) => mov.tipo === 'gasto' && !mov.extraordinario && mov.fecha.slice(0, 7) === mes)
    .forEach((mov) => {
      totales[mov.categoria] = (totales[mov.categoria] || 0) + mov.importe;
    });

  obtenerSuscripcionesDelMes(mes).forEach((sus) => {
    totales[sus.categoria] = (totales[sus.categoria] || 0) + sus.importe;
  });

  return totales;
}

// Colores para el gráfico circular. El orden es fijo y se asigna según la posición de
// cada categoría en la lista `categorias`, no según el orden en que aparecen en el mes:
// así una categoría siempre tiene el mismo color, mire el mes que mire.
const COLORES_CATEGORIAS = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'];

function colorDeCategoria(nombreCategoria) {
  const posicion = categorias.indexOf(nombreCategoria);
  const indice = posicion === -1 ? 0 : posicion % COLORES_CATEGORIAS.length;
  return COLORES_CATEGORIAS[indice];
}

// Guardamos aquí el gráfico ya creado para poder destruirlo antes de redibujarlo:
// Chart.js no permite crear uno nuevo sobre el mismo <canvas> sin borrar el anterior.
let graficoCategorias = null;

function renderGraficoCategorias(mes) {
  const datos = obtenerGastosPorCategoria(mes);
  const etiquetas = Object.keys(datos);
  const valores = Object.values(datos);

  graficoSinDatos.classList.toggle('hidden', etiquetas.length > 0);
  graficoCanvas.classList.toggle('hidden', etiquetas.length === 0);

  if (graficoCategorias) {
    graficoCategorias.destroy();
  }

  if (etiquetas.length === 0) return;

  graficoCategorias = new Chart(graficoCanvas, {
    type: 'pie',
    data: {
      labels: etiquetas,
      datasets: [{
        data: valores,
        backgroundColor: etiquetas.map(colorDeCategoria),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#ffffff' },
        },
        tooltip: {
          // Por defecto Chart.js solo mostraría "Ocio: 5.99". Con este callback
          // añadimos el símbolo € y el porcentaje que representa sobre el total del mes.
          callbacks: {
            label: (contexto) => {
              const valor = contexto.parsed;
              const total = contexto.dataset.data.reduce((suma, v) => suma + v, 0);
              const porcentaje = total > 0 ? (valor / total) * 100 : 0;
              return `${contexto.label}: ${valor.toFixed(2)} € (${porcentaje.toFixed(0)}%)`;
            },
          },
        },
      },
    },
  });
}

// Compara los gastos normales del mes con el límite y pinta la barra: verde si vas
// holgado, naranja si te acercas y rojo si te has pasado (sección 5 del plan).
function renderLimite(resumen) {
  const porcentaje = limiteMensual > 0 ? (resumen.gastosNormales / limiteMensual) * 100 : 0;

  limitBarFill.style.width = `${Math.min(porcentaje, 100)}%`;
  limitBarFill.classList.toggle('limit-warning', porcentaje >= 70 && porcentaje < 100);
  limitBarFill.classList.toggle('limit-over', porcentaje >= 100);

  limitText.textContent = `${resumen.gastosNormales.toFixed(2)} € de ${limiteMensual.toFixed(2)} €`;
}

// Pinta el resumen del mes (ingresos/gastos/ahorro), la barra de límite, la hucha
// y el gráfico circular. Todo se recalcula desde cero cada vez porque los datos son pocos
// y así nos evitamos tener que ir actualizando números sueltos por separado.
function renderEstadisticas() {
  const resumen = calcularResumenMes(mesSeleccionadoStats);

  statsIngresos.textContent = `${resumen.ingresos.toFixed(2)} €`;
  statsGastos.textContent = `${resumen.gastosNormales.toFixed(2)} €`;
  statsAhorro.textContent = `${resumen.ahorro.toFixed(2)} €`;
  statsAhorro.classList.toggle('income', resumen.ahorro >= 0);
  statsAhorro.classList.toggle('expense', resumen.ahorro < 0);

  renderLimite(resumen);
  renderGraficoCategorias(mesSeleccionadoStats);

  const acumulado = calcularAhorroAcumulado(mesSeleccionadoStats);
  statsAhorroAcumulado.textContent = `${acumulado.toFixed(2)} €`;
  statsAhorroAcumulado.classList.toggle('income', acumulado >= 0);
  statsAhorroAcumulado.classList.toggle('expense', acumulado < 0);

  if (resumen.gastosExtraordinarios > 0) {
    statsExtraMes.textContent = `Este mes han salido ${resumen.gastosExtraordinarios.toFixed(2)} € de la hucha en gastos extraordinarios.`;
    statsExtraMes.classList.remove('hidden');
  } else {
    statsExtraMes.classList.add('hidden');
  }
}

// Construye el <li> de una suscripción. Se reutiliza tanto en la tarjeta "Suscripciones"
// (donde se gestionan todas) como dentro de "Movimientos de este mes" (solo las que aplican ese mes).
function crearElementoSuscripcion(sus) {
  const li = document.createElement('li');
  li.className = 'movement-item movement-item--subscription';

  const nombre = document.createElement('span');
  nombre.className = 'movement-name';
  nombre.textContent = sus.nombre;

  const categoria = document.createElement('span');
  categoria.className = 'movement-category';
  categoria.textContent = `${sus.categoria} · ${sus.activa ? 'Activa' : 'Inactiva'}`;

  const importe = document.createElement('span');
  importe.className = 'movement-amount expense';
  importe.textContent = `-${sus.importe.toFixed(2)} €`;

  li.append(nombre, categoria, importe, crearMenuSuscripcion(sus));
  return li;
}

function crearMenuSuscripcion(sus) {
  const wrapper = document.createElement('div');
  wrapper.className = 'movement-menu';

  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.className = 'movement-menu-btn';
  btnToggle.textContent = '⋮';
  btnToggle.setAttribute('aria-label', 'Opciones');

  const dropdown = document.createElement('div');
  dropdown.className = 'movement-menu-dropdown hidden';

  const btnActivar = document.createElement('button');
  btnActivar.type = 'button';
  btnActivar.textContent = sus.activa ? 'Desactivar' : 'Activar';
  btnActivar.addEventListener('click', () => {
    alternarActivaSuscripcion(sus.id);
    dropdown.classList.add('hidden');
  });

  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.textContent = 'Eliminar';
  btnEliminar.addEventListener('click', () => {
    eliminarSuscripcion(sus.id);
  });

  dropdown.append(btnActivar, btnEliminar);

  btnToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const estabaAbierto = !dropdown.classList.contains('hidden');
    cerrarMenusMovimiento();
    if (!estabaAbierto) dropdown.classList.remove('hidden');
  });

  wrapper.append(btnToggle, dropdown);
  return wrapper;
}

function alternarActivaSuscripcion(id) {
  suscripciones = suscripciones.map((sus) => (sus.id === id ? { ...sus, activa: !sus.activa } : sus));
  guardarSuscripciones(suscripciones);
  renderSuscripciones();
  renderMovimientos();
}

function eliminarSuscripcion(id) {
  suscripciones = suscripciones.filter((sus) => sus.id !== id);
  guardarSuscripciones(suscripciones);
  renderSuscripciones();
  renderMovimientos();
}

// Pinta la tarjeta "Suscripciones" con las suscripciones que ya existen a fecha de `mesSeleccionado`
// (activas e inactivas), pero sin mostrar las que se dieron de alta en un mes futuro:
// si estás viendo febrero, una suscripción contratada en julio no debería aparecer todavía.
function renderSuscripciones() {
  listaSuscripciones.innerHTML = '';
  suscripciones
    .filter((sus) => sus.desde <= mesSeleccionado)
    .forEach((sus) => {
      listaSuscripciones.appendChild(crearElementoSuscripcion(sus));
    });
}

// Construye el elemento <li> de un movimiento a partir de sus datos.
// Usamos textContent (en vez de innerHTML) para que lo que escriba el usuario
// se muestre siempre como texto plano, nunca como código.
function crearElementoMovimiento(mov) {
  const li = document.createElement('li');
  li.className = 'movement-item';

  const nombre = document.createElement('span');
  nombre.className = 'movement-name';
  nombre.textContent = mov.nombre;

  const categoria = document.createElement('span');
  categoria.className = 'movement-category';
  categoria.textContent = mov.tipo === 'ingreso' ? 'Ingreso' : mov.categoria;

  const importe = document.createElement('span');
  const esGasto = mov.tipo !== 'ingreso';
  importe.className = 'movement-amount ' + (esGasto ? 'expense' : 'income');
  const signo = esGasto ? '-' : '+';
  importe.textContent = `${signo}${mov.importe.toFixed(2)} €`;

  li.append(nombre, categoria, importe, crearMenuMovimiento(mov));
  return li;
}

// Crea el botón "⋮" y su desplegable con las opciones Editar / Eliminar para un movimiento.
function crearMenuMovimiento(mov) {
  const wrapper = document.createElement('div');
  wrapper.className = 'movement-menu';

  const btnToggle = document.createElement('button');
  btnToggle.type = 'button';
  btnToggle.className = 'movement-menu-btn';
  btnToggle.textContent = '⋮';
  btnToggle.setAttribute('aria-label', 'Opciones');

  const dropdown = document.createElement('div');
  dropdown.className = 'movement-menu-dropdown hidden';

  const btnEditar = document.createElement('button');
  btnEditar.type = 'button';
  btnEditar.textContent = 'Editar';
  btnEditar.addEventListener('click', () => {
    iniciarEdicion(mov.id);
    dropdown.classList.add('hidden');
  });

  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.textContent = 'Eliminar';
  btnEliminar.addEventListener('click', () => {
    eliminarMovimiento(mov.id);
  });

  dropdown.append(btnEditar, btnEliminar);

  // stopPropagation evita que este clic llegue al listener global que cierra los menús abiertos
  btnToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const estabaAbierto = !dropdown.classList.contains('hidden');
    cerrarMenusMovimiento();
    if (!estabaAbierto) dropdown.classList.remove('hidden');
  });

  wrapper.append(btnToggle, dropdown);
  return wrapper;
}

// Cierra cualquier menú de movimiento que estuviera abierto. Se llama al abrir otro
// menú distinto y al hacer clic en cualquier otra parte de la página.
function cerrarMenusMovimiento() {
  document.querySelectorAll('.movement-menu-dropdown').forEach((el) => el.classList.add('hidden'));
}

document.addEventListener('click', cerrarMenusMovimiento);

function eliminarMovimiento(id) {
  movimientos = movimientos.filter((mov) => mov.id !== id);
  guardarMovimientos(movimientos);
  renderMovimientos();
}

// Rellena el formulario con los datos del movimiento y lo deja en "modo edición",
// recordando qué movimiento se está editando en `editandoId`.
function iniciarEdicion(id) {
  const mov = movimientos.find((m) => m.id === id);
  if (!mov) return;

  editandoId = id;
  document.getElementById('tipo').value = mov.tipo;
  document.getElementById('categoria').value = mov.categoria;
  document.getElementById('nombre').value = mov.nombre;
  document.getElementById('importe').value = mov.importe;
  document.getElementById('fecha').value = mov.fecha;
  document.getElementById('extraordinario').checked = mov.extraordinario;
  actualizarCamposSegunTipo();

  btnSubmitMovimiento.textContent = 'Guardar cambios';
  btnCancelarEdicion.classList.remove('hidden');
}

// Saca el formulario del "modo edición" y lo deja como estaba para añadir uno nuevo.
function cancelarEdicion() {
  editandoId = null;
  form.reset();
  actualizarCamposSegunTipo();
  btnSubmitMovimiento.textContent = 'Añadir';
  btnCancelarEdicion.classList.add('hidden');
}

btnCancelarEdicion.addEventListener('click', cancelarEdicion);

// Vacía la lista del HTML y la vuelve a pintar entera, pero solo con los movimientos
// cuya fecha caiga dentro de `mesSeleccionado`. mov.fecha tiene formato "2026-07-04";
// con .slice(0, 7) nos quedamos solo con "2026-07" para compararlo con el mes elegido.
function renderMovimientos() {
  lista.innerHTML = '';

  movimientos
    .filter((mov) => mov.fecha.slice(0, 7) === mesSeleccionado)
    .forEach((mov) => {
      lista.appendChild(crearElementoMovimiento(mov));
    });

  // Las suscripciones no se guardan como movimiento cada mes: se calculan al vuelo aquí
  obtenerSuscripcionesDelMes(mesSeleccionado).forEach((sus) => {
    lista.appendChild(crearElementoSuscripcion(sus));
  });
}

// Cuando se envía el formulario (tanto para añadir como para guardar una edición)...
form.addEventListener('submit', (event) => {
  event.preventDefault(); // evita que la página se recargue, que es el comportamiento normal de un <form>

  const tipo = document.getElementById('tipo').value;

  // Las suscripciones son una "plantilla" (sección 4.2 del plan), no un movimiento normal,
  // así que se guardan y se pintan aparte.
  if (tipo === 'suscripcion') {
    suscripciones.push({
      id: crypto.randomUUID(),
      nombre: document.getElementById('nombre').value,
      importe: parseFloat(document.getElementById('importe').value),
      categoria: document.getElementById('categoria').value,
      activa: true,
      desde: mesSeleccionado,
    });
    guardarSuscripciones(suscripciones);
    renderSuscripciones();
    renderMovimientos();
    form.reset();
    actualizarCamposSegunTipo();
    return;
  }

  const datosFormulario = {
    tipo,
    categoria: document.getElementById('categoria').value,
    nombre: document.getElementById('nombre').value,
    importe: parseFloat(document.getElementById('importe').value),
    fecha: document.getElementById('fecha').value,
    extraordinario: document.getElementById('extraordinario').checked,
  };

  if (editandoId) {
    // Reemplazamos el movimiento existente por uno con los mismos id pero los datos nuevos
    movimientos = movimientos.map((mov) =>
      mov.id === editandoId ? { ...mov, ...datosFormulario } : mov
    );
  } else {
    movimientos.push({ id: crypto.randomUUID(), ...datosFormulario });
  }

  guardarMovimientos(movimientos);
  renderMovimientos();
  cancelarEdicion(); // reutilizamos esta función para limpiar el formulario y el botón, se edite o no
});

// Junta todos los datos de la app en un solo objeto y lo descarga como archivo .json.
// Blob es un objeto que representa un archivo en memoria; URL.createObjectURL() le da
// una dirección temporal a la que puede apuntar un <a download> para forzar la descarga.
btnExportar.addEventListener('click', () => {
  const datos = { movimientos, categorias, suscripciones, limiteMensual };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `mis-finanzas-${mesSeleccionado}.json`;
  enlace.click();

  URL.revokeObjectURL(url); // liberamos la dirección temporal, ya no hace falta
});

// El botón "Importar datos" solo abre el selector de archivos oculto
btnImportar.addEventListener('click', () => {
  inputImportar.click();
});

// Cuando eliges un archivo, lo leemos con FileReader (la única forma de leer
// un archivo local desde JavaScript en el navegador) y sustituimos todos los datos.
inputImportar.addEventListener('change', () => {
  const archivo = inputImportar.files[0];
  if (!archivo) return;

  const continuar = confirm(
    'Esto reemplazará todos tus datos actuales por los del archivo importado. ¿Seguro que quieres continuar?'
  );
  if (!continuar) {
    inputImportar.value = '';
    return;
  }

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);

      movimientos = Array.isArray(datos.movimientos) ? datos.movimientos : [];
      categorias = Array.isArray(datos.categorias) ? datos.categorias : [...CATEGORIAS_POR_DEFECTO];
      suscripciones = Array.isArray(datos.suscripciones) ? datos.suscripciones : [];
      limiteMensual = typeof datos.limiteMensual === 'number' ? datos.limiteMensual : LIMITE_POR_DEFECTO;

      guardarMovimientos(movimientos);
      guardarCategorias(categorias);
      guardarSuscripciones(suscripciones);
      guardarLimiteMensual(limiteMensual);

      inputLimite.value = limiteMensual;
      renderCategorias();
      renderSuscripciones();
      renderMovimientos();
      if (tabEstadisticas.classList.contains('active')) {
        renderEstadisticas();
      }

      alert('Datos importados correctamente.');
    } catch {
      alert('Ese archivo no se puede leer. Comprueba que es una copia de seguridad exportada desde esta misma app.');
    }

    inputImportar.value = ''; // para poder volver a elegir el mismo archivo si hace falta
  };
  lector.readAsText(archivo);
});

// Pintamos el desplegable de meses, las listas y el desplegable de categorías al cargar la página
renderSelectorMes();
renderSelectorMesStats();
renderCategorias();
renderSuscripciones();
renderMovimientos();
actualizarCamposSegunTipo();
// renderEstadisticas() NO se llama aquí: se llama la primera vez que se abre la pestaña
// Estadísticas (ver cambiarPestana), porque Chart.js necesita el <canvas> visible para pintar bien.
