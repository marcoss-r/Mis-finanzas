# 📋 Planificación — Gestor de finanzas personales (v2)

> Documento de diseño y hoja de ruta. Sustituye al plan original de la v1 (registro de movimientos + estadísticas).
> La v2 convierte la app en un **gestor de cuentas, divisiones de dinero, presupuestos y salario**.

---

## 1. Qué es la v2

La v1 era un cuaderno de movimientos: apuntabas gastos e ingresos y la app calculaba un "ahorro acumulado" a partir de esas sumas.

La v2 da la vuelta al modelo: **el dinero vive en cuentas**. Cada cuenta tiene un saldo real, y ese saldo se puede **fragmentar en divisiones** (viajes, gasolina, colchón de emergencia...). Los movimientos ya no *son* el dinero: son operaciones que mueven el dinero de un sitio a otro.

Encima de eso se añaden dos herramientas nuevas:

- **Presupuestos**: cuánto me dejo gastar al mes por categoría.
- **Gestor de salario**: del bruto anual al neto mensual (IRPF Madrid + Seguridad Social), repartido automáticamente entre cuentas y divisiones.

Sigue siendo una web en euros, oscura, que se abre en el móvil como una app y guarda todo en el propio dispositivo.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Tecnología | **Vanilla JS con módulos ES**, sin build ni npm |
| Divisiones | **Particionan el saldo**; el resto se ve como "Sin asignar" |
| Modelo de ahorro | **Los saldos de cuenta mandan**; desaparece la "hucha" calculada |
| Interés de cuentas de ahorro | **TAE anual, abono mensual** (`saldo × TAE/12`) |
| Salario: jornada | Bruto anual **a jornada completa**, prorrateado por horas/semana |
| Salario: pagas | **Configurable 12 o 14**, por defecto 12 |
| Salario: fiscalidad | **Tramos + circunstancias personales**, tablas editables |
| Retribución flexible | **Reduce base imponible**, con avisos de límites legales |
| Presupuestos | **Distintos de las divisiones**: tope de gasto por categoría y mes |
| Navegación | **5 pestañas**: Inicio · Cuentas · Movimientos · Salario · Estadísticas |
| Datos de la v1 | **Empezar de cero** (con exportación previa opcional) |
| Nóminas | **Automáticas** el día de cobro, **editables** después |

---

## 3. Modelo de datos

Todo se guarda en `localStorage` como JSON, bajo **una única clave** (`finanzas:v2`) con número de versión, en vez de las cinco claves sueltas de la v1. Eso permite migrar el formato en el futuro sin perder datos.

```json
{
  "version": 2,
  "cuentas": [],
  "divisiones": [],
  "movimientos": [],
  "traspasos": [],
  "suscripciones": [],
  "presupuestos": [],
  "categorias": [],
  "salario": {},
  "repartos": [],
  "nominas": [],
  "ajustes": {}
}
```

### 3.1. Cuentas

```json
{
  "id": "cta_1",
  "nombre": "Cuenta nómina",
  "tipo": "corriente",          // "corriente" | "ahorro"
  "saldoInicial": 3200.00,
  "tae": 0,                     // solo cuentas de ahorro: % anual, p.ej. 2.75
  "divisionInteres": null,      // división donde se abona el interés (null = Sin asignar)
  "color": "#3987e5",
  "archivada": false,
  "creada": "2026-08-01"
}
```

El **saldo actual** no se guarda: se calcula. Así nunca hay dos verdades sobre el mismo dinero.

```
saldo(cuenta) = saldoInicial
              + ingresos de la cuenta
              − gastos de la cuenta
              + traspasos recibidos
              − traspasos enviados
              + intereses abonados
```

### 3.2. Divisiones (fragmentaciones)

Cada división pertenece a **una** cuenta. Son bolsas dentro del saldo.

```json
{
  "id": "div_1",
  "cuentaId": "cta_1",
  "nombre": "Viajes",
  "objetivo": 60000,            // meta de saldo, null si no tiene
  "objetivoFecha": "2030-12-31",// opcional, para calcular cuánto ahorrar al mes
  "color": "#199e70",
  "orden": 1
}
```

**Regla de oro:** la suma de las divisiones de una cuenta **nunca supera su saldo**. Lo que sobra es la división virtual **"Sin asignar"**, que no se guarda porque se calcula:

```
sinAsignar(cuenta) = saldo(cuenta) − Σ saldo(divisiones de la cuenta)
```

El saldo de cada división también es calculado (sumando los movimientos y asignaciones que la tocan), nunca un número editado a mano suelto.

**Reparto inicial por porcentajes:** al crear divisiones se puede repartir el saldo existente indicando un % para cada una (p. ej. 40% Viajes, 20% Gasolina, 40% Sin asignar). La app genera las asignaciones correspondientes y valida que no se pase del 100%.

### 3.3. Movimientos

```json
{
  "id": "mov_1",
  "tipo": "gasto",              // "gasto" | "ingreso"
  "cuentaId": "cta_1",
  "divisionId": "div_2",        // null → sale de "Sin asignar"
  "categoria": "Gasolina",
  "nombre": "Repsol A-6",
  "importe": 62.40,
  "fecha": "2026-08-14",
  "origen": "manual"            // "manual" | "suscripcion" | "nomina" | "interes"
}
```

Un gasto **baja el saldo total de la cuenta y el de su división** a la vez, tal y como pediste. Si la división se queda en negativo, la app lo marca en rojo pero **no lo impide** (a veces la vida es así; ya lo recolocarás).

### 3.4. Traspasos (intercambio de dinero)

Un traspaso es un objeto único, no dos movimientos sueltos, para que nunca se descuadre.

```json
{
  "id": "tra_1",
  "fecha": "2026-08-14",
  "importe": 500.00,
  "cuentaOrigen": "cta_1",
  "divisionOrigen": null,
  "cuentaDestino": "cta_2",
  "divisionDestino": "div_5",
  "nota": "Aporte mensual al colchón"
}
```

Sirve para tres casos con la misma pieza:
- **Entre cuentas** (origen ≠ destino).
- **Entre divisiones de la misma cuenta** (misma cuenta, distinta división): recolocar dinero sin que cambie el saldo total.
- **Asignar / desasignar**: de "Sin asignar" a una división y viceversa.

### 3.5. Presupuestos

```json
{
  "id": "pre_1",
  "categoria": "Comida",
  "limite": 300,
  "desde": "2026-08",           // aplica desde ese mes en adelante
  "hasta": null                 // null = sigue vigente
}
```

Se comparan contra los gastos de esa categoría en el mes, con barra verde/naranja/roja. Es independiente de los objetivos de las divisiones: **el presupuesto controla el flujo (gasto mensual), la división controla el stock (dinero acumulado)**.

### 3.6. Suscripciones

Se mantienen de la v1, pero ahora indican **de qué cuenta y división salen**:

```json
{
  "id": "sus_1",
  "nombre": "Netflix",
  "importe": 12.99,
  "categoria": "Ocio",
  "cuentaId": "cta_1",
  "divisionId": null,
  "diaCobro": 3,
  "activa": true,
  "desde": "2026-01"
}
```

### 3.7. Configuración del salario

```json
{
  "brutoAnual": 34000,
  "jornadaCompletaHoras": 40,
  "horasSemana": 40,
  "numeroPagas": 12,            // 12 o 14
  "mesesPagaExtra": [6, 12],    // solo si son 14
  "diaCobro": 28,
  "ajusteDiaNoHabil": "anterior",
  "contrato": "indefinido",     // afecta al % de desempleo
  "situacion": {
    "edad": 30,
    "estadoCivil": "soltero",
    "hijos": [],                // [{ "nacimiento": "2022-05-10", "exclusiva": true }]
    "ascendientes": [],
    "discapacidad": 0,          // 0 | 33 | 65
    "movilidadReducida": false
  },
  "retribucionFlexible": [
    { "concepto": "comida", "importeMensual": 220, "diasMes": 20 },
    { "concepto": "transporte", "importeMensual": 100 }
  ]
}
```

**Bruto efectivo** = `brutoAnual × (horasSemana / jornadaCompletaHoras)`.

### 3.8. Reparto de la nómina

Los porcentajes de reparto se guardan **por mes**, para poder cambiarlos antes de cada cobro:

```json
{
  "mes": "2026-09",
  "destinos": [
    { "cuentaId": "cta_1", "divisionId": null,    "porcentaje": 50 },
    { "cuentaId": "cta_2", "divisionId": "div_5", "porcentaje": 30 },
    { "cuentaId": "cta_2", "divisionId": "div_1", "porcentaje": 20 }
  ]
}
```

Si un mes no tiene reparto propio, se usa el del último mes definido (plantilla heredada). La suma debe dar 100%; la app avisa si no cuadra.

La **retribución flexible** no entra en este reparto: va íntegra a la cuenta que se le asigne en su configuración (la tarjeta de comida, por ejemplo).

### 3.9. Nóminas generadas

Cada nómina calculada se guarda con su desglose, para poder consultarla y editarla:

```json
{
  "mes": "2026-08",
  "brutoMes": 2833.33,
  "retribucionFlexible": 320,
  "baseCotizacion": 2833.33,
  "seguridadSocial": 179.95,
  "irpf": 425.00,
  "tipoRetencion": 15.0,
  "neto": 2228.38,
  "confirmada": true,
  "editadaManualmente": false,
  "movimientosGenerados": ["mov_88", "mov_89"]
}
```

---

## 4. El gestor de salario, paso a paso

Esta es la parte con más chicha. El cálculo va en este orden:

**1. Bruto anual efectivo**
`brutoAnual × horasSemana / jornadaCompletaHoras`

**2. Restar la retribución flexible exenta**
Los importes exentos (comida, transporte...) **no tributan y no cotizan**. Se restan del bruto antes de todo lo demás. La app avisa si te pasas de los límites legales:

| Concepto | Límite de exención (por revisar cada año) |
|---|---|
| Comida (tarjeta restaurante) | 11 €/día laborable efectivamente trabajado |
| Transporte público | 136,36 €/mes, máx. 1.500 €/año |
| Seguro médico | 500 €/año por persona (1.500 € si discapacidad) |
| Guardería (hijos < 3 años) | Exento sin límite |
| Formación | Exento |

También existe el tope general del **30%** de la retribución total en especie: la app lo comprueba y avisa.

**3. Cotización a la Seguridad Social (trabajador)**
Sobre la base de cotización (bruto mensual prorrateado, acotado entre base mínima y máxima):

| Concepto | Tipo trabajador |
|---|---|
| Contingencias comunes | 4,70 % |
| Desempleo (indefinido) | 1,55 % |
| Desempleo (temporal) | 1,60 % |
| Formación profesional | 0,10 % |
| MEI | 0,15 % |

> ⚠️ Estos tipos y las bases máxima/mínima cambian **cada año**. Van en una tabla editable en Ajustes, con los valores actuales precargados y un aviso para revisarlos en enero.

**4. Base imponible del IRPF**
```
rendimiento íntegro
  − cotizaciones a la Seguridad Social
  − 2.000 € de otros gastos
  − reducción por obtención de rendimientos del trabajo (si el bruto es bajo)
= rendimiento neto
  − mínimo personal y familiar
= base sobre la que aplicar la escala
```

**Mínimos** (también editables):
- Contribuyente: 5.550 € (+1.150 si ≥65, +1.400 más si ≥75)
- Hijos: 2.400 / 2.700 / 4.000 / 4.500 € (1º, 2º, 3º, 4º y siguientes), +2.800 € por hijo menor de 3 años
- Ascendientes: 1.150 € (+1.400 si ≥75)
- Discapacidad: 3.000 € (33%) / 9.000 € (65%), +3.000 € si movilidad reducida

**5. Escala e IRPF**

Aquí hay un matiz que conviene entender, porque afecta a qué número ves:

- La **retención de la nómina** (lo que de verdad te descuentan cada mes) se calcula con la **escala estatal de retenciones**, que es la misma en toda España: 19 % / 24 % / 30 % / 37 % / 45 % / 47 % por tramos.
- La **cuota real** de tu declaración sí depende de Madrid, que tiene su propia escala autonómica (más baja que la media). Por eso mucha gente en Madrid **sale a devolver**.

La app hará las dos cosas:
- **Neto mensual** → con la escala de retenciones (es el dinero que entra de verdad en la cuenta).
- **Estimación anual Madrid** → con escala estatal + autonómica de Madrid, mostrando la diferencia como "te saldrá a devolver / a pagar ~X €".

**6. Neto y reparto**
`neto = bruto efectivo mensual − Seguridad Social − retención IRPF`

El día de cobro configurado (adelantado al día hábil anterior si cae en sábado, domingo o festivo de Madrid) la app genera:
- Un **ingreso por cada destino** del reparto de ese mes.
- Un **ingreso aparte** por la retribución flexible, a su cuenta destinada.

Todo editable después, por si tu nómina real difiere de la estimación.

---

## 5. Las cinco pestañas

### 🏠 Inicio
- **Patrimonio total**: suma de todos los saldos, número grande.
- Tarjetas por cuenta con saldo y, si es de ahorro, la TAE.
- **Objetivos activos**: barras de progreso de las divisiones con meta.
- Presupuestos del mes en curso, en rojo los que se están pasando.
- Próxima nómina: cuándo llega y cuánto se espera.

### 🏦 Cuentas
- Lista de cuentas → tocar una entra a su detalle.
- **Detalle de cuenta**: saldo, tipo, TAE, lista de divisiones con su saldo, objetivo y barra de progreso, y el bloque "Sin asignar".
- Crear/editar/archivar cuentas y divisiones.
- **Botón de intercambio** (⇄): traspaso entre cuentas, entre divisiones o desde/hacia "Sin asignar".
- **Reparto por porcentajes**: repartir el saldo actual entre las divisiones de golpe.
- **Ajustar saldo**: si el banco dice otra cosa, se apunta un movimiento de ajuste (no se sobrescribe el histórico).

### 📝 Movimientos
- Formulario de gasto/ingreso: importe, cuenta, división, categoría, nombre, fecha.
- Lista del mes con filtros por cuenta y categoría, editar y borrar.
- Gestión de categorías y de suscripciones.
- Gestión de presupuestos por categoría.

### 💼 Salario
- Configuración: bruto anual, jornada, pagas, día de cobro, contrato.
- Circunstancias personales (para el mínimo personal y familiar).
- **Desglose visible**: bruto → SS → base → IRPF → neto, con los tramos aplicados a la vista.
- Retribución flexible por conceptos, con avisos de límites.
- **Reparto del próximo mes**: porcentajes por cuenta/división, con validación del 100%.
- Historial de nóminas generadas.

### 📊 Estadísticas
- Selector de mes.
- Gastos por categoría (gráfico circular, ya existe).
- **Nuevo**: gastos por división y evolución del patrimonio mes a mes.
- Ingresos, gastos y ahorro del mes.
- Progreso de presupuestos.

---

## 6. Estructura de archivos

```
Mis-finanzas/
├── index.html
├── manifest.json
├── styles.css
├── vendor/
│   └── chart.umd.min.js
└── src/
    ├── main.js                  → arranque y navegación entre pestañas
    ├── store/
    │   ├── storage.js           → leer/escribir localStorage, versionado
    │   ├── state.js             → estado en memoria y avisos de cambio
    │   └── backup.js            → exportar / importar JSON
    ├── domain/
    │   ├── cuentas.js           → saldos, creación, ajustes
    │   ├── divisiones.js        → bolsas, Sin asignar, objetivos, reparto por %
    │   ├── movimientos.js
    │   ├── traspasos.js
    │   ├── suscripciones.js
    │   ├── presupuestos.js
    │   ├── interes.js           → abono mensual de la TAE
    │   ├── salario.js           → bruto → neto → reparto
    │   └── fiscal/
    │       ├── irpf.js
    │       ├── seguridadSocial.js
    │       ├── retribucionFlexible.js
    │       └── tablas.js        → tipos, tramos y mínimos (editables)
    ├── ui/
    │   ├── inicio.js
    │   ├── cuentasView.js
    │   ├── movimientosView.js
    │   ├── salarioView.js
    │   ├── estadisticasView.js
    │   ├── componentes.js       → tarjetas, barras, modales, menús
    │   └── formato.js           → euros, fechas, porcentajes
    └── util/
        ├── fechas.js            → meses, días hábiles, festivos de Madrid
        └── id.js
```

> ⚠️ **Nota técnica:** los módulos ES (`import`/`export`) **no funcionan abriendo `index.html` con doble clic** (protocolo `file://`); el navegador los bloquea por seguridad. Como la app ya se usa servida (la PWA se instala desde una URL), no es problema. Para probar en local basta con `python3 -m http.server` en la carpeta y abrir `http://localhost:8000`. Si en algún momento necesitas el doble clic, se puede volver a scripts clásicos con varias etiquetas `<script>` en orden.

La **CSP se mantiene igual de estricta**: nada de red (`connect-src 'none'`), solo scripts propios. Los datos siguen sin salir del dispositivo.

---

## 7. Qué queda por hacer (roadmap)

Cada fase deja la app **funcionando**. Nada de "está a medias hasta la fase 9".

### Fase 0 — Preparar el terreno
- [ ] Pantalla de bienvenida con **exportar los datos de la v1** antes de empezar de cero.
- [ ] Nuevo `storage.js` con clave única versionada y borrado limpio de las claves antiguas.
- [ ] Mover `chart.umd.min.js` a `vendor/` y pasar `index.html` a `type="module"`.

### Fase 1 — Cuentas
- [ ] Modelo de cuentas y cálculo de saldo.
- [ ] Pestaña Cuentas: crear, editar, archivar; corriente vs ahorro con TAE.
- [ ] Ajuste manual de saldo mediante movimiento de ajuste.

### Fase 2 — Traspasos
- [ ] Modelo de traspaso y botón ⇄.
- [ ] Traspaso entre cuentas, con validación de saldo.

### Fase 3 — Divisiones
- [ ] Modelo de divisiones + cálculo de "Sin asignar".
- [ ] Detalle de cuenta con sus divisiones y saldos.
- [ ] Reparto inicial por porcentajes.
- [ ] Traspasos entre divisiones y desde/hacia "Sin asignar".
- [ ] Objetivos con barra de progreso y "cuánto me falta al mes" si hay fecha meta.

### Fase 4 — Movimientos sobre el nuevo modelo
- [ ] Formulario con cuenta + división.
- [ ] Los gastos descuentan del total y de la división.
- [ ] Suscripciones con cuenta/división y día de cobro.
- [ ] Reescribir la pestaña Movimientos.

### Fase 5 — Presupuestos
- [ ] Modelo de presupuesto por categoría y mes.
- [ ] Barras de progreso y avisos al pasarse.
- [ ] Retirada del "límite mensual global" de la v1, sustituido por esto.

### Fase 6 — Interés de las cuentas de ahorro
- [ ] Abono mensual `saldo × TAE/12` como movimiento con `origen: "interes"`.
- [ ] Idempotencia: que no se abone dos veces el mismo mes aunque abras la app diez veces.

### Fase 7 — Motor fiscal
- [ ] `tablas.js` con tramos de retención, escala autonómica de Madrid, tipos de SS, bases y mínimos personales.
- [ ] `seguridadSocial.js` con topes de base.
- [ ] `irpf.js`: rendimiento neto, mínimo personal y familiar, escala, tipo de retención.
- [ ] `retribucionFlexible.js` con los límites de exención y el tope del 30%.
- [ ] Pantalla de tablas editables en Ajustes.

### Fase 8 — Gestor de salario
- [ ] Configuración: bruto, jornada, pagas 12/14, día de cobro, contrato.
- [ ] Circunstancias personales.
- [ ] Desglose bruto → neto con los tramos a la vista.
- [ ] Estimación anual Madrid (a devolver / a pagar).

### Fase 9 — Reparto y generación de nóminas
- [ ] Reparto por porcentajes hacia cuentas y divisiones, editable por mes.
- [ ] Herencia del reparto del mes anterior.
- [ ] Generación automática el día de cobro, con ajuste a día hábil (festivos de Madrid incluidos).
- [ ] Historial de nóminas, edición manual del importe real.

### Fase 10 — Inicio y estadísticas
- [ ] Pestaña Inicio con patrimonio, objetivos y próxima nómina.
- [ ] Gastos por división y evolución del patrimonio.

### Fase 11 — Pulido
- [ ] Navegación inferior de 5 pestañas, cómoda a una mano en iPhone.
- [ ] Exportar/importar adaptado al nuevo formato.
- [ ] Repaso de accesibilidad y de la CSP.

---

## 8. Decisiones pequeñas ya tomadas (por si te preguntas por qué)

1. **Saldos calculados, no guardados.** Guardar el saldo y los movimientos por separado acaba siempre en descuadres.
2. **Traspaso como objeto único**, no como dos movimientos: imposible que se quede uno huérfano.
3. **Divisiones en negativo permitidas** pero marcadas en rojo: la app avisa, no te bloquea.
4. **Nóminas automáticas y editables**: la estimación fiscal nunca clava el céntimo, así que corriges y listo.
5. **Tablas fiscales editables**: los tipos cambian cada enero y no quiero que la app se quede obsoleta.
6. **Interés a "Sin asignar"** salvo que elijas una división destino.

## 9. Puntos a revisar contigo cuando lleguemos ahí

- Los **valores fiscales concretos** (tramos, bases máximas, MEI, reducciones) los precargo con los que tengo, pero conviene **contrastarlos con tu última nómina** en la fase 8: si el neto que calcula la app coincide con el real, el motor está bien.
- **Festivos de Madrid**: van en una lista editable. Habrá que actualizarla cada año.
- Si tu empresa aplica alguna particularidad (convenio con complementos, pluses no cotizables), lo vemos al comparar con la nómina real.

---

## 10. Mini-glosario nuevo

- **División / fragmentación:** una bolsa de dinero dentro de una cuenta. El dinero sigue en la misma cuenta del banco; es una separación mental que la app hace real.
- **Sin asignar:** el dinero de la cuenta que no está en ninguna división.
- **TAE:** tipo anual equivalente. El % que rinde una cuenta de ahorro en un año.
- **Base de cotización:** el importe sobre el que se calculan las cuotas de la Seguridad Social, con un mínimo y un máximo legales.
- **Mínimo personal y familiar:** la parte de tu renta que no tributa, mayor cuantos más hijos o cargas tengas.
- **Tipo de retención:** el % de IRPF que la empresa te descuenta cada mes a cuenta de la declaración.
- **Retribución flexible:** parte del salario que cobras en servicios (comida, transporte, seguro) y que no tributa hasta ciertos límites.
