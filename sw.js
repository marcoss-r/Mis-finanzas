// Service worker del "app shell": cachea todo lo necesario para abrir la app sin conexión
// y cargarla al instante. CACHE_VERSION es el control de versión de caché: súbela cada vez
// que cambies algún archivo listado aquí abajo para que los usuarios reciban la versión nueva
// en vez de quedarse con la cacheada.
const CACHE_VERSION = 'v6';
const CACHE_NAME = `mis-finanzas-${CACHE_VERSION}`;

const ARCHIVOS_PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'vendor/chart.umd.min.js',
  'src/main.js',
  'src/store/storage.js',
  'src/store/state.js',
  'src/store/backup.js',
  'src/util/id.js',
  'src/util/fechas.js',
  'src/domain/cuentas.js',
  'src/domain/divisiones.js',
  'src/domain/movimientos.js',
  'src/domain/traspasos.js',
  'src/domain/suscripciones.js',
  'src/domain/presupuestos.js',
  'src/domain/interes.js',
  'src/domain/salario.js',
  'src/domain/fiscal/tablas.js',
  'src/domain/fiscal/seguridadSocial.js',
  'src/domain/fiscal/irpf.js',
  'src/domain/fiscal/retribucionFlexible.js',
  'src/ui/formato.js',
  'src/ui/componentes.js',
  'src/ui/inicio.js',
  'src/ui/cuentasView.js',
  'src/ui/movimientosView.js',
  'src/ui/salarioView.js',
  'src/ui/estadisticasView.js',
  'src/ui/ajustesView.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE_NAME).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

// Cache-first con actualización en segundo plano: responde rápido desde caché y, si hay
// red, refresca la copia cacheada para la próxima vez. Solo intercepta peticiones GET al
// propio origen (la CSP ya bloquea cualquier red externa, esto es solo por claridad).
self.addEventListener('fetch', (event) => {
  const peticion = event.request;
  if (peticion.method !== 'GET' || new URL(peticion.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(peticion).then((cacheada) => {
      const enRed = fetch(peticion)
        .then((respuesta) => {
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => cacheada);
      return cacheada || enRed;
    }),
  );
});
