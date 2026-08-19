# Mis Finanzas

Gestor personal de cuentas, divisiones de dinero, presupuestos y salario. Web app en español, sin build ni npm, pensada para instalarse como PWA en el móvil. Todos los datos se guardan solo en el propio dispositivo (`localStorage`); la app no tiene backend ni hace peticiones de red.

Ver `planificacion-app-finanzas.md` para el diseño completo y la hoja de ruta.

## Desarrollo local

La app usa módulos ES (`import`/`export`), que los navegadores bloquean si abres `index.html` con doble clic (protocolo `file://`). Hay que servirla por HTTP:

```bash
python3 -m http.server 8000
# y abres http://localhost:8000
```

No hace falta instalar nada más: sin `npm`, sin `node_modules`, sin paso de compilación.

## Estructura

```
index.html, manifest.json, styles.css   → shell de la app y PWA
vendor/chart.umd.min.js                 → Chart.js guardado en local
src/main.js                             → arranque y navegación
src/store/                              → localStorage, estado en memoria, backup
src/domain/                             → cuentas, divisiones, movimientos, traspasos,
                                           presupuestos, interés, salario y motor fiscal
src/ui/                                 → las cinco pantallas y componentes reutilizables
src/util/                               → fechas y generación de ids
```
