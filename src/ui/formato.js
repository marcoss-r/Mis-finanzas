export function euros(valor) {
  const n = Number(valor) || 0;
  // En español el separador de miles no se pone con 4 cifras ("1933,33"); lo forzamos para
  // que todos los importes se lean igual ("1.933,33" junto a "12.797,06").
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
}

export function porcentaje(valor) {
  return `${Number(valor).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export function fechaLarga(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
