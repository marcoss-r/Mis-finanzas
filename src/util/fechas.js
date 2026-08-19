export const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function mesActual() {
  return hoyISO().slice(0, 7);
}

export function generarMeses(cantidad = 12, finalMes) {
  const base = finalMes ? new Date(`${finalMes}-01T00:00:00`) : new Date();
  const meses = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ value, label: `${NOMBRES_MESES[fecha.getMonth()]} ${fecha.getFullYear()}` });
  }
  return meses;
}

export function mesesEntre(desde, hasta) {
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

export function formatearMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return `${NOMBRES_MESES[mes - 1]} ${anio}`;
}

// Festivos nacionales + de la Comunidad/ciudad de Madrid. Cambian cada año por decreto;
// esta lista es una estimación y conviene revisarla en enero (ver planificación, sección 9).
const FESTIVOS_MADRID = {
  2025: ['2025-01-01', '2025-01-06', '2025-04-17', '2025-04-18', '2025-05-01', '2025-05-02', '2025-05-15', '2025-08-15', '2025-11-01', '2025-11-10', '2025-12-06', '2025-12-08', '2025-12-09', '2025-12-25'],
  2026: ['2026-01-01', '2026-01-06', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-02', '2026-05-15', '2026-08-15', '2026-11-02', '2026-11-09', '2026-12-07', '2026-12-08', '2026-12-25'],
  2027: ['2027-01-01', '2027-01-06', '2027-03-25', '2027-03-26', '2027-05-01', '2027-05-03', '2027-05-15', '2027-08-15', '2027-11-01', '2027-11-08', '2027-12-06', '2027-12-08', '2027-12-25'],
};

export function esFestivoMadrid(fechaISO) {
  const anio = Number(fechaISO.slice(0, 4));
  return (FESTIVOS_MADRID[anio] || []).includes(fechaISO);
}

export function esFinDeSemana(fechaISO) {
  const dia = new Date(`${fechaISO}T00:00:00`).getDay();
  return dia === 0 || dia === 6;
}

export function diaHabilAnterior(fechaISO) {
  let fecha = new Date(`${fechaISO}T00:00:00`);
  let iso = fechaISO;
  while (esFinDeSemana(iso) || esFestivoMadrid(iso)) {
    fecha.setDate(fecha.getDate() - 1);
    iso = fecha.toISOString().slice(0, 10);
  }
  return iso;
}

export function ultimoDiaDelMes(mesKey) {
  const [anio, mes] = mesKey.split('-').map(Number);
  return new Date(anio, mes, 0).getDate();
}

export function edadDesdeFecha(fechaISO) {
  if (!fechaISO) return 99;
  const hoy = new Date();
  const nacimiento = new Date(fechaISO);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad;
}
