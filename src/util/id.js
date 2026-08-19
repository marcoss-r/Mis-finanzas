let contador = 0;

export function generarId(prefijo) {
  contador += 1;
  return `${prefijo}_${Date.now().toString(36)}${contador.toString(36)}`;
}
