# 📋 Planificación — App de finanzas personales

> Documento de diseño y planificación. Guárdalo: lo usarás como guía mientras construyes la app con Claude Code, paso a paso.

---

## 1. Qué vamos a construir

Una **aplicación web sencilla** de finanzas personales, para uso propio, con dinero en **euros (€)**. Tendrá dos pestañas: una para **registrar movimientos** y otra para **ver estadísticas**. Estética oscura, tipografía blanca de grosor medio-alto y tamaño moderado.

No es una app "de la Play Store": es una página web que abres en el navegador (de tu ordenador o de tu móvil). Eso nos da gráficos bonitos, diseño a tu gusto y cero configuración complicada, que es justo lo ideal para tu primer proyecto.

---

## 2. Decisiones ya tomadas

| Pregunta | Tu decisión |
|---|---|
| Tipo de aplicación | **App web** (se abre en el navegador) |
| Suscripciones | **Automáticas**: se repiten solas cada mes |
| Ahorro | **Dos vistas**: el del mes + el acumulado |
| Límite de gasto | **Uno global al mes** |
| Gastos extraordinarios | Salen del **ahorro acumulado (la hucha)**, no del mes |
| Datos | En **un solo dispositivo** |

---

## 3. Tecnología elegida (y qué es cada cosa)

Para tu primera app vamos a lo más sencillo y lo que más te enseña los fundamentos. Nada de frameworks raros todavía.

- **HTML** → la *estructura* de la página (los botones, las pestañas, el formulario). Es como el esqueleto.
- **CSS** → el *aspecto* (colores oscuros, tipografía, tamaños, separación). Es la piel y la ropa.
- **JavaScript (JS)** → el *comportamiento* (guardar un gasto, calcular el ahorro, cambiar de mes). Es el cerebro.
- **Chart.js** → una *librería* (código ya hecho por otros) para dibujar los **gráficos circulares** fácilmente. La añadiremos con una línea.
- **localStorage** → un pequeño almacén que el navegador te da para **guardar tus datos en ese dispositivo**. Así, aunque cierres la página, tus movimientos siguen ahí.

Con esto **no necesitas instalar nada** para empezar: solo un editor de código y el navegador. Más adelante, si te apetece, podrás evolucionar a herramientas más potentes (React, una base de datos real…), pero eso es para el "nivel 2".

> ⚠️ **Aviso importante sobre localStorage:** los datos viven en *ese* navegador y dispositivo. Si borras los datos del navegador o cambias de móvil, se pierden. Por eso, en el plan incluimos una función de **copia de seguridad (exportar/importar un archivo)**. Es sencilla y te da tranquilidad.

---

## 4. Cómo se guardan y organizan los datos (modelo de datos)

Esta es la parte más importante de la planificación. Antes de programar nada, conviene decidir **cómo es cada dato**. Todo se guardará como **JSON** (un formato de texto para guardar datos ordenados).

Vamos a tener **tres tipos de "cosas" guardadas**:

### 4.1. Movimientos puntuales (ingresos y gastos)
Cada ingreso o gasto es un objeto con estos campos:

```json
{
  "id": "un identificador único",
  "tipo": "gasto",                 // "gasto" o "ingreso"
  "categoria": "comida",           // solo aplica a gastos: comida, salidas...
  "nombre": "Cena con amigos",
  "importe": 24.50,                // en euros
  "fecha": "2025-06-14",
  "extraordinario": false          // true si es de vacaciones, etc.
}
```

### 4.2. Suscripciones (recurrentes, se repiten solas)
Una suscripción **no es un movimiento normal**: es una *plantilla* que se aplica cada mes automáticamente. Por eso se guarda distinto:

```json
{
  "id": "un identificador único",
  "nombre": "Netflix",
  "importe": 12.99,
  "categoria": "ocio",
  "activa": true,                  // si la cancelas, la pones en false
  "desde": "2025-01"               // mes en que empezó a contar
}
```

Cuando la app calcule un mes, mirará qué suscripciones están **activas** y las sumará automáticamente a los gastos de ese mes. Así no las tienes que meter a mano cada vez.

### 4.3. Configuración
Cosas ajustables por el usuario:

```json
{
  "limiteMensual": 1000,
  "categorias": ["comida", "salidas", "ocio", "transporte"]
}
```

Las **categorías se pueden añadir desde la app** (esa lista crece cuando tú quieras).

---

## 5. La lógica de cálculo (importante, léela con calma)

Aquí está el "corazón" de la app. Definimos las cuentas con claridad para no liarnos al programar.

**Para un mes concreto (por ejemplo, junio):**

- **Ingresos del mes** = suma de todos los ingresos de junio.
- **Gastos normales del mes** = gastos de junio **que NO son extraordinarios** + suscripciones activas.
- **Gastos extraordinarios del mes** = gastos de junio marcados como extraordinarios (vacaciones, etc.).
- **Ahorro del mes** = `Ingresos del mes − Gastos normales del mes`
  *(¡ojo! los extraordinarios NO se restan aquí; el mes se ve "limpio").*

**Vista global (la hucha):**

- **Ahorro acumulado** = `suma de todos los ahorros mensuales − suma de todos los gastos extraordinarios de todos los meses`
  *(aquí sí bajan los extraordinarios: salen de la hucha).*

**Límite mensual:**

- Se compara el **límite global** con los **gastos normales del mes** (los extraordinarios quedan fuera del límite, coherente con que "no afectan al mes").
- En estadísticas mostramos una barra: cuánto llevas gastado vs. tu límite.

> 💡 Ejemplo: en junio ingresas 1.500 €, tienes 900 € de gastos normales y 600 € de vacaciones (extraordinario).
> → **Ahorro de junio = 1.500 − 900 = 600 €** (se ve bien).
> → Pero la **hucha** baja 600 € por las vacaciones, así que ese mes tu ahorro acumulado sube 600 y baja 600 → **queda igual**. Justo lo que querías.

---

## 6. Las dos pestañas (pantallas)

### 🟢 Pestaña 1 — Registrar
- Un **selector de mes** (abril, mayo, junio…) para saber en qué mes estás metiendo datos.
- Un **formulario** para añadir un movimiento con: tipo (suscripción / gasto / ingreso), categoría (si es gasto), nombre, importe (€), fecha y una casilla **"extraordinario"**.
- Un **botón para añadir categorías nuevas** (comida, salidas, transporte…).
- Una **lista de los movimientos del mes**, con opción de borrar/editar.
- Un sitio para **ajustar el límite mensual**.

### 🔵 Pestaña 2 — Estadísticas
- **Selector de mes** para ver meses anteriores.
- **Gráfico circular**: reparto de gastos por categoría.
- **Resumen del mes**: ingresos, gastos, y ahorro del mes.
- **Barra de límite**: gastado vs. límite (verde/naranja/rojo según te acerques).
- **Ahorro acumulado** (la hucha): número grande y, si te apetece, un pequeño gráfico de evolución mes a mes.

---

## 7. Estilo visual

Siguiendo lo que pediste: fondo oscuro, tipografía blanca de grosor medio-alto y tamaño moderado. Una propuesta concreta de partida (luego la retocas a gusto):

- **Fondos:** `#121212` (fondo general) y `#1e1e1e` (tarjetas/paneles).
- **Texto:** `#ffffff` (principal) y `#b0b0b0` (secundario/gris).
- **Acentos:** verde `#4ade80` (positivo/ahorro), rojo `#f87171` (gastos), naranja `#fbbf24` (aviso de límite).
- **Tipografía:** una fuente limpia tipo *Inter* o la del sistema, con **grosor 500–700** (medio a negrita) y tamaño normal (nada gigante).
- **Estilo general:** bordes suavemente redondeados, buen espacio entre elementos, minimalista.

---

## 8. Estructura de archivos del proyecto

Empezamos con muy poquitos archivos, que es lo mejor para aprender:

```
mi-app-finanzas/
├── index.html      → la estructura (pestañas, formulario, gráficos)
├── styles.css      → todo el diseño oscuro
└── app.js          → la lógica (guardar, calcular, dibujar gráficos)
```

Solo con esos tres archivos tienes una app funcional. Sin servidores ni instalaciones.

---

## 9. Plan por fases (roadmap para aprender paso a paso)

Aquí está la clave para no agobiarte: **no lo hagas todo de golpe**. Cada fase es un pequeño logro que funciona por sí solo. Ve una por una.

- **Fase 0 — Preparar el terreno:** instalar un editor de código, crear la carpeta y los tres archivos vacíos, aprender a abrir `index.html` en el navegador.
- **Fase 1 — Maqueta estática:** las dos pestañas y el diseño oscuro, sin funcionar todavía. Solo HTML + CSS. *(Aprendes: estructura y estilo.)*
- **Fase 2 — Añadir y guardar movimientos:** que el formulario guarde ingresos/gastos y los muestre en una lista, usando localStorage. *(Aprendes: JS básico y guardar datos.)*
- **Fase 3 — Categorías:** poder añadir categorías nuevas desde la app. *(Aprendes: listas dinámicas.)*
- **Fase 4 — Organizar por meses:** selector de mes y filtrar movimientos por mes. *(Aprendes: filtrar y organizar datos.)*
- **Fase 5 — Suscripciones automáticas:** que se sumen solas cada mes. *(Aprendes: datos recurrentes.)*
- **Fase 6 — Estadísticas y gráficos:** los cálculos de ahorro + el gráfico circular con Chart.js. *(Aprendes: cálculos y librerías externas.)*
- **Fase 7 — Límite y extraordinarios:** la barra de límite y la lógica de la "hucha". *(Aprendes: lógica un poco más fina.)*
- **Fase 8 — Copia de seguridad:** exportar/importar tus datos a un archivo. *(Aprendes: seguridad de datos.)*
- **Fase 9 — Pulido:** detalles visuales y, si quieres, "instalarla" en la pantalla de inicio del móvil (PWA).

---

## 10. Cómo usar Claude Code para APRENDER (no para que lo haga solo)

Como quieres entender lo que haces, aquí van pautas para trabajar con Claude Code sacándole partido *sin* que te lo dé todo masticado:

- **Ve fase por fase.** No pidas "hazme la app entera". Pide solo la fase en la que estás.
- **Pide explicaciones, no solo código.** Por ejemplo: *"Explícame qué hace este trozo línea por línea antes de que lo escriba."*
- **Pídele que comente el código** para que puedas releerlo y entenderlo.
- **Escribe tú algún trozo y pídele que lo revise.** Aprenderás más equivocándote y corrigiendo.
- **Cuando no entiendas algo, para y pregunta.** *"¿Por qué se usa esto y no otra cosa?"*
- **Pídele mini-retos.** *"Dame un pequeño ejercicio para practicar lo que acabamos de ver."*
- **Regla de oro:** no pegues código que no entiendas. Si no lo entiendes, pídele que te lo explique otra vez, más simple.

---

## 11. Mini-glosario (para no perderte)

- **Editor de código:** el programa donde escribes el código (por ejemplo, VS Code).
- **Navegador:** Chrome, Firefox, etc. Ahí abres y usas tu app.
- **Librería:** código ya hecho por otros que reutilizas (como Chart.js para los gráficos).
- **JSON:** un formato de texto para guardar datos ordenados.
- **localStorage:** el almacén del navegador donde guardas tus datos en ese dispositivo.
- **PWA:** truco para "instalar" una web en la pantalla de inicio del móvil, como si fuera una app.

---

## 12. Decisiones pequeñas que quedan por cerrar

No hace falta decidirlas ya; puedes hacerlo cuando llegues a esas fases:

1. **¿El límite mensual incluye las suscripciones?** Propuesta: sí (todo lo que sale del bolsillo cada mes cuenta para el límite, menos los extraordinarios). Se puede cambiar fácil.
2. **¿Las suscripciones aparecen en el gráfico circular como una categoría más?** Propuesta: sí, con su categoría (p. ej. "ocio"), pero podríamos separarlas si lo prefieres.

---

## 13. Tus próximos pasos

1. Instala un **editor de código** (VS Code es el más común y gratuito).
2. Crea la carpeta `mi-app-finanzas` con los tres archivos vacíos.
3. Empieza por la **Fase 1** (la maqueta con el diseño oscuro) y pídele a Claude Code que te la explique mientras la montáis juntos.

¡Y a disfrutarlo! La mejor forma de aprender a programar es construyendo algo que de verdad quieres usar. 🚀
