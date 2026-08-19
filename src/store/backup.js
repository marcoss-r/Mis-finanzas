import { estadoVacio } from './storage.js';
import { replaceState } from './state.js';

export function exportarBackup(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `mis-finanzas-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function importarBackup(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const datos = JSON.parse(lector.result);
        const nuevoEstado = { ...estadoVacio(), ...datos, version: 2 };
        replaceState(nuevoEstado);
        resolve(nuevoEstado);
      } catch (error) {
        reject(error);
      }
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsText(archivo);
  });
}
