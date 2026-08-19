export function el(tag, attrs = {}, hijos = []) {
  const nodo = document.createElement(tag);
  Object.entries(attrs).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === false) return;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'text') nodo.textContent = valor;
    else if (clave === 'html') nodo.innerHTML = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    else if (clave === 'value') nodo.value = valor;
    else if (clave === 'checked') nodo.checked = valor;
    else nodo.setAttribute(clave, valor);
  });
  (Array.isArray(hijos) ? hijos : [hijos]).forEach((hijo) => {
    if (hijo === null || hijo === undefined || hijo === false) return;
    nodo.append(hijo);
  });
  return nodo;
}

export function tarjeta(hijos = []) {
  return el('div', { class: 'card' }, hijos);
}

export function barra(pct, extra = '') {
  const clamped = Math.max(0, Math.min(100, pct));
  const relleno = el('div', { class: `limit-bar-fill ${extra}`.trim() });
  relleno.style.width = `${clamped}%`;
  return el('div', { class: 'limit-bar' }, [relleno]);
}

let overlayActual = null;

export function abrirModal(titulo, contenido) {
  cerrarModal();
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' }, [
    el('div', { class: 'modal-header' }, [
      el('h2', { text: titulo }),
      el('button', { type: 'button', class: 'modal-close', text: '×', 'aria-label': 'Cerrar', onClick: cerrarModal }),
    ]),
    contenido,
  ]);
  overlay.append(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrarModal();
  });
  document.body.append(overlay);
  overlayActual = overlay;
  return overlay;
}

export function cerrarModal() {
  if (overlayActual) {
    overlayActual.remove();
    overlayActual = null;
  }
}
