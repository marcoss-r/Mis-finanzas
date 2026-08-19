export function euros(valor) {
  const n = Number(valor) || 0;
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function porcentaje(valor) {
  return `${Number(valor).toFixed(1)} %`;
}

export function fechaLarga(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
