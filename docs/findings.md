# Hallazgos · MarketNest QA

## Evidencia de ejecución

- Entorno: `https://qa-marketplace-app-b9mpo.ondigitalocean.app`.
- Ejecución completa: **2026-11-05 00:30 UTC**, macOS arm64, Playwright 1.64.1, dos workers, sin retries locales.
- Comando: `bun run test`. Duración: 290.8 s. **64 ejecuciones: 43 pasaron y 21 fallaron**.
- De los 21 fallos, **19 corresponden a seis discrepancias de producto** agrupadas abajo; no son 19 bugs distintos.
- Otros dos resultados no confirmados: timeout HTTP de `/register` y navegación del filtro móvil Android. Reejecuciones aisladas: `/register` pasó (1/1) y filtro Android pasó (3/3). No se reportan como defectos confirmados; investigar estabilidad si reaparecen. La ejecución completa original no se reescribe como verde.
- Marketing, rechazo de cookies, descuentos, variantes y ordenación se reprodujeron en Chromium, Firefox y WebKit. `/terms` falló a nivel HTTP y también se observó como página 404 en exploración de navegador.
- `bun run lint` y `bun run typecheck`: correctos.

Evidencia local: `playwright-report/index.html`, `test-results/results.json` y carpetas de cada test fallido (captura, vídeo, trace para UI). No versionados por privacidad. El catálogo es compartido y puede cambiar; conservar fecha y evidencia de la ejecución, no asumir datos inmutables.

Las prioridades son propuestas. Ninguna causa raíz está confirmada: solo se observó la aplicación desplegada. Los catorce hallazgos se publicaron como [issues #1–#14](https://github.com/Greynner/CASAutomotive-smoke-tests/issues); el número de issue coincide con el sufijo CAS. No se publicaron artefactos ni credenciales.

### Ampliación autenticada

- Autorización del usuario: crear cuentas sintéticas; **no enviar pagos ni pedidos**.
- Se creó una única cuenta `@example.com`, sin marketing, y se reutilizó para no acumular cuentas ante el fallo de borrado.
- Ejecución `bun run test:account`: **2026-11-05 01:04 UTC**, Chromium, un worker, 118.3 s. Un journey con aserciones suaves reprodujo cuatro discrepancias adicionales (CAS-007–CAS-010). No se interpretan como un único bug por compartir test.
- Validación final del journey: **2026-11-05 01:13 UTC**, 143.6 s; reprodujo las mismas cuatro discrepancias, completó limpieza de carrito/dirección y volvió a demostrar login exitoso después del borrado. También verificó rechazo HTTP 401 con contraseña incorrecta.
- En una ejecución intermedia hubo timeout esperando `load` al recargar tras retirar la dirección. Se cambió esa espera por `domcontentloaded` más comprobación explícita de cero direcciones; la ejecución final alcanzó y completó el paso de borrado.
- Revalidación final de la suite pública en HTTP + Chromium: **26 ejecuciones, 19 correctas y 7 fallidas**, todas las fallidas vinculadas a CAS-001–CAS-006. No se repitió toda la matriz de tres motores tras esta ampliación; se conserva la ejecución inicial completa como referencia.
- Login, logout, cantidad 1→2→1, aplicación de `welcome10`, navegación a checkout y eliminación de carrito/dirección de prueba funcionaron. Registro se comprobó durante la exploración inicial; las ejecuciones posteriores reutilizan esa cuenta.
- El envío a $100 sí resultó gratuito; el fallo de umbral confirmado está en **exactamente $50**.
- La dirección sintética estaba guardada antes de exportar y fue retirada después. Se eliminó también el contenido del carrito. El perfil sintético continúa existiendo debido a CAS-007: requiere limpieza manual del equipo del marketplace.
- Credenciales de recuperación: solo `.auth/owned-account.json`, ignorado por Git y con permisos restringidos. Sin traces, vídeos ni screenshots autenticados. Reporte separado en `playwright-report-account/` y `test-results-account/results.json`.
- Repetición adicional de los dos escenarios transitorios: 3 ejecuciones de `/register` y 3 de filtro Android, con dos workers: **6/6 correctas**. La causa intermitente sigue sin confirmarse; no se cambió el esperado para ocultarla.

### Validación de cierre

- Matriz pública ampliada con CAS-011: **2026-11-05 01:25 UTC**, 227.0 s, **67 ejecuciones: 43 correctas y 24 fallidas**. No hubo tests omitidos ni retries locales.
- **22 fallos** corresponden a los siete defectos públicos CAS-001–CAS-006 y CAS-011 (los motores/sentidos de ordenación producen varias ejecuciones por defecto).
- Dos fallos adicionales fueron intermitentes: timeout de navegación de home en el test CTA de Chromium y falta de navegación tras filtro móvil iPhone. Ambos pasaron **3/3** al repetir con dos workers; no se afirma una causa raíz ni se oculta esta inestabilidad con aserciones permisivas. Son riesgos pendientes de estabilidad, distintos de los once defectos confirmados.
- CAS-011 se reprodujo automáticamente en Chromium, Firefox y WebKit. El journey autenticado permanece opt-in y conserva su validación final de 01:13 UTC; no se volvieron a crear cuentas ni enviar mutaciones durante este cierre.
- El reporte público local fue reemplazado por esta última ejecución; los resultados iniciales se mantienen aquí como registro histórico.

### Ampliación técnica final

- Matriz pública ampliada: **2026-11-05 01:52 UTC**, 412.6 s, **132 ejecuciones: 90 correctas y 42 fallidas**. De los fallos, 40 corresponden a nueve discrepancias públicas; dos fueron intermitentes de navegación (carrito invitado Firefox y CTA WebKit).
- Repetición de esos dos escenarios en los tres motores, dos veces cada uno: **12/12 correctas**. Se conserva el resultado intermitente original, sin afirmar que la estabilidad esté resuelta.
- Proyectos autenticados: **2026-11-05 02:09 UTC**, 285.0 s, dos journeys completados y fallidos por cinco discrepancias conocidas: CAS-007–CAS-010 y CAS-013. Se verificaron perfil/exportación corregidos, preferencia de marketing on→off, cupones y limpieza. No se crearon cuentas adicionales ni pedidos.
- Durante la ampliación se identificaron acciones antes de hidratación y esperas `load` poco apropiadas en pruebas autenticadas. Se añadió un marcador observable de montaje cliente (banner en contextos que no eligen consentimiento). La ejecución final completó ambos journeys sin esos timeouts. El oráculo de borrado es el rechazo de credenciales desde sesión limpia, no una redirección visual.
- **Smoke técnico de privacidad, no validación RGPD ni asesoría jurídica:** 9 escenarios (sin elección/rechazar/aceptar × 3 motores), sin trackers reconocibles en las rutas muestreadas. Ver [privacy-smoke.md](privacy-smoke.md) para lo observado y los límites.
- Axe en cinco páginas × tres motores reprodujo únicamente `color-contrast` entre las reglas seleccionadas (15 ejecuciones fallidas agrupadas en CAS-014). No es una auditoría WCAG completa.
- Registro negativo: 15 ejecuciones correctas con backend bloqueado por seguridad. Comprueba campos vacíos/acuerdo/confirmación, no demuestra validación de fuerza de contraseña o email en servidor. Las exploraciones de entradas no vacías débiles o malformadas se enviaban a backend; al bloquear ese envío no puede concluirse si el servidor las rechaza. No se reportó como bug confirmado.

## Resumen priorizado

| ID      | Prioridad | Discrepancia                                            | Impacto                                              |
| ------- | --------- | ------------------------------------------------------- | ---------------------------------------------------- |
| CAS-001 | P1 alta   | Marketing activado por defecto                          | Riesgo de consentimiento y contradicción de política |
| CAS-002 | P1 alta   | Recargo de variante no se refleja en precio             | Precio mostrado potencialmente engañoso              |
| CAS-003 | P2 media  | Descuentos porcentuales inflados                        | Información comercial incorrecta                     |
| CAS-004 | P2 media  | Rechazo de cookies no persiste                          | La elección de rechazo no se recuerda                |
| CAS-005 | P2 media  | Términos de servicio devuelven 404                      | Condiciones no disponibles antes del registro        |
| CAS-006 | P2 media  | Ordenación usa un orden distinto al precio mostrado     | Dificulta comparar y elegir productos                |
| CAS-007 | P1 alta   | Borrado de cuenta no impide volver a iniciar sesión     | Riesgo de retención y acceso tras borrado            |
| CAS-008 | P2 media  | Envío cobrado al alcanzar exactamente $50               | Total estimado superior al publicado                 |
| CAS-009 | P1 alta   | Exportación omite una dirección guardada                | Datos de acceso/portabilidad incompletos             |
| CAS-010 | P1 alta   | Impuesto calculado antes del descuento                  | Total estimado incorrecto en carrito y checkout      |
| CAS-011 | P2 media  | Umbrales de estrellas sin nombre accesible distinguible | Dificulta el uso con lector de pantalla              |
| CAS-012 | P2 media  | Precio máximo excluye el límite exacto                  | Omite productos dentro del presupuesto               |
| CAS-013 | P1 alta   | SAVE20 persiste por debajo de su mínimo                 | Cupón activo sin cumplir elegibilidad                |
| CAS-014 | P2 media  | Contraste insuficiente en controles compartidos         | Dificulta lectura con baja visión                    |

## CAS-001 · Marketing premarcado

1. Abrir `/register` en un contexto nuevo.
2. Observar “Email me offers and product news”, sin interactuar.

**Esperado:** casilla desmarcada; `/help#privacy` afirma que marketing es opt-in y solo se envía si el usuario marca la casilla.

**Actual:** `register-marketing` aparece marcada por defecto. `register-accept-terms` sí aparece desmarcada.

**Impacto:** el usuario puede continuar con marketing sin una selección afirmativa propia. No se creó una cuenta ni se verificó el envío efectivo de emails. Requiere revisión del equipo de privacidad.

**Repro automatizada:**

```bash
bunx playwright test --project=frontend-chromium --grep 'marketing is opt-in'
```

Test: `tests/ui/privacy.spec.ts`. Evidencia: aserción `Expected: not checked / Received: checked` y screenshot del fallo.

## CAS-002 · El precio no actualiza al elegir una variante con recargo

1. Abrir `/products/p105` (Mechanical Keyboard K87).
2. Seleccionar “Brown switches”: precio observado $109.00.
3. Seleccionar “Blue switches +$10.00”.

**Esperado:** opción seleccionada y precio $119.00; `/help#shopping` establece que el precio se actualiza cuando una opción cuesta más.

**Actual:** el radio de Blue switches queda seleccionado, pero `product-price` continúa en $109.00.

**Impacto:** no se muestra correctamente el coste de la opción. No se verificó qué precio se cobra en carrito/checkout; no afirmar que existe un cobro incorrecto sin esa prueba.

```bash
bunx playwright test --project=frontend-chromium --grep 'keyboard option'
```

Test: `tests/ui/product.spec.ts`. Evidencia: precio esperado 11900 centavos, recibido 10900, con selección comprobada.

## CAS-003 · Descuentos porcentuales mayores al ahorro real

1. Abrir `/products?onSale=1`.
2. Comparar precio actual, precio original tachado y badge de descuento.
3. Ejemplo: Aurora Wireless Earbuds, `/products/p101`: $79.99 frente a $99.99, badge de 25%.

**Esperado:** `round((original − actual) / original × 100)`, aproximadamente **20%** en ese ejemplo; coincide con la regla publicada en `/help#shopping`.

**Actual:** badge **25%**. Otros ejemplos de la ejecución: `/products/p115`, $95.00 frente a $140.00, muestra 47% cuando corresponde 32%; `/products/p112`, $89.00 frente a $119.00, muestra 34% cuando corresponde 25%.

**Impacto:** sobreestima el ahorro. Una sola incidencia agrupa los productos afectados, no una por badge.

```bash
bunx playwright test --project=frontend-chromium --grep 'sale badges'
```

Test: `tests/ui/catalog.spec.ts`; aserciones suaves conservan las discrepancias de los productos visibles.

## CAS-004 · Rechazar cookies no recuerda la elección

1. Abrir `/` en un contexto limpio.
2. Pulsar “Reject non-essential”; el banner desaparece.
3. Recargar.

**Esperado:** elección recordada durante 12 meses, como afirma `/help#cookies`; no volver a solicitarla al recargar.

**Actual:** reaparece el banner. La inspección del almacenamiento tras rechazar no encontró una elección persistida. Como control, “Accept all” sí crea `mp_consent=accepted`, con duración aproximada de un año, y supera el test de persistencia.

**Impacto:** no se respeta la persistencia prometida de la elección negativa. Esto **no demuestra** por sí solo que se activen cookies analíticas tras rechazar; ese análisis está pendiente.

```bash
bunx playwright test --project=frontend-chromium --grep 'cookie reject'
```

Test: `tests/ui/privacy.spec.ts`. Evidencia: banner visible tras reload.

## CAS-005 · Enlace a Terms of Service roto

1. Abrir el sitio y seguir “Terms of Service” del footer; también se enlaza desde registro.
2. La ruta destino es `/terms`.

**Esperado:** documento de términos accesible con HTTP 200, especialmente antes de aceptar condiciones de registro.

**Actual:** HTTP **404** y “This page could not be found”.

**Impacto:** no permite consultar las condiciones enlazadas. La incidencia no implica por sí sola una conclusión jurídica.

```bash
bunx playwright test --project=integration --grep '@legal'
```

Test: `tests/integration/routes.spec.ts`. Evidencia: `Expected: 200 / Received: 404`.

## CAS-006 · Orden de precios inconsistente con los importes visibles

1. Abrir `/products`.
2. Cambiar “Sort by” a “Price: high to low”.
3. Leer los precios de los primeros productos.

**Esperado:** secuencia no creciente de los precios que se muestran al comprador.

**Actual:** se observó `$239.00, $149.99, $199.00, $95.00, $129.00, …`; $199.00 queda después de $149.99. También falla “Price: low to high”. Los tres motores reprodujeron ambos sentidos.

**Impacto:** el comprador no obtiene el orden de comparación solicitado. No se confirmó si internamente se ordena por precio original u otro campo.

```bash
bunx playwright test --project=frontend-chromium --grep 'price sort'
```

Test: `tests/ui/catalog.spec.ts`. Evidencia: arrays de centavos recibidos frente al orden numérico esperado.

## CAS-007 · Borrado confirmado pero la cuenta sigue autenticando · P1 alta

1. Iniciar sesión con una cuenta sintética propia.
2. Ir a `/account/privacy`, abrir “Delete my account”, introducir su contraseña y `DELETE`.
3. Enviar la eliminación y observar HTTP 200 y redirección a home.
4. Borrar cookies e iniciar sesión de nuevo con las mismas credenciales.

**Esperado:** acceso rechazado (HTTP 401); `/help#privacy` promete que después del borrado no se puede iniciar sesión y los datos personales se eliminan.

**Actual:** `/api/auth/login` devuelve HTTP **200** y se puede abrir `/account`; el email previo sigue presente. Se reprodujo en exploración y en el journey automatizado. Una respuesta exitosa de borrado no prueba que se haya realizado.

**Impacto:** la promesa de borrado no se cumple; riesgo alto de retención y acceso a datos. Revisión de privacidad necesaria. No se tocaron cuentas ajenas.

**Reproducción:** `bun run test:account`, paso final “request erasure and verify login denial”. No usar credenciales de personas reales.

**Limpieza:** dirección y carrito sintéticos retirados; la cuenta no se puede considerar eliminada. El propietario del entorno debe retirarla manualmente. El ledger privado permite identificarla sin publicar su email.

## CAS-008 · Se cobra envío estándar con subtotal exactamente $50 · P2 media

1. Con la cuenta sintética y carrito vacío, añadir una unidad de Pour-Over Coffee Set (`/products/p108`, $50.00).
2. Revisar el resumen del carrito sin cupón.
3. Como control, aumentar a dos unidades ($100) y volver a una.

**Esperado:** a partir de $50.00 de mercancía tras descuentos, envío estándar gratis, según `/help#shipping`. Para una unidad: $50 + $4 de impuesto = **$54.00**.

**Actual:** a **$50.00** se cobra **$5.99** y el total es **$59.99**. A $100 sí se observó envío gratis. Sin afirmar una causa raíz, el comportamiento es consistente con un error de frontera.

**Impacto:** sobrecoste estimado contrario al umbral publicado. No se realizó una compra ni se verificó un cargo real.

**Reproducción:** `bun run test:account`, paso “free-shipping threshold at $50”.

## CAS-009 · Exportación omite una dirección guardada · P1 alta

1. Guardar una dirección exclusivamente sintética en `/account/addresses` y confirmar que aparece tras recargar.
2. Ir a `/account/privacy` y pulsar “Download my data”.
3. Revisar el JSON sin publicarlo.

**Esperado:** datos personales completos, incluidas direcciones guardadas, pedidos y reseñas, como promete `/help#privacy`.

**Actual:** JSON con claves `exportedAt`, `profile`, `marketingConsent`, `reviews`, `shop`; no contiene `addresses`, `orders` ni la dirección sintética guardada. La ausencia de la dirección existente demuestra datos omitidos; no se crearon pedidos, por lo que no se comprobó la exportación de pedidos existentes.

**Impacto:** la función publicada de acceso/portabilidad entrega datos incompletos. Requiere revisión de privacidad. No se adjuntó el JSON a GitHub.

**Reproducción:** `bun run test:account`, paso “export includes a saved synthetic address”. El test borra la descarga y retira la dirección después.

## CAS-010 · Impuesto se calcula antes del descuento · P1 alta

1. Añadir una unidad de `/products/p108` ($50.00) al carrito sintético.
2. Aplicar `welcome10`; se reconoce como WELCOME10 y descuenta $5.00.
3. Revisar impuesto y total en carrito y abrir checkout sin enviar el formulario.

**Esperado:** `/help#payments` establece 8% sobre mercancía después de descuentos. $45 × 8% = **$3.60**; con envío estándar de $5.99, total **$54.59**. El Help Center publica este mismo ejemplo.

**Actual:** carrito y checkout muestran impuesto **$4.00**; el carrito totaliza **$54.99**. Diferencia de $0.40. El cupón sí se aplica y el envío de $5.99 es correcto con subtotal descontado de $45.

**Impacto:** total mostrado mayor al definido en la regla fiscal publicada. No se verificó cobro real porque no se enviaron pedidos.

**Reproducción:** `bun run test:account`, pasos “tax on discounted merchandise” y “checkout preview”.

## CAS-011 · Los filtros de valoración no anuncian el umbral de estrellas · P2 media

1. Abrir `/products`; en móvil, expandir Filters.
2. Inspeccionar los nombres accesibles de los radios de valoración.

**Esperado:** nombres distinguibles que expresen el umbral, por ejemplo `4 stars & up`, `3 stars & up`, etc.

**Actual:** los cuatro radios se anuncian como `& up`; los SVG de estrellas tienen `aria-hidden="true"`, por lo que no comunican el valor 4, 3, 2 o 1.

**Impacto:** un usuario de lector de pantalla no puede elegir el umbral por el nombre del control. Confirmado en inspección de árbol accesible de escritorio/móvil y test en los tres motores; no es una auditoría WCAG completa.

**Reproducción:** `bunx playwright test --project=frontend-chromium --grep '@accessibility'`. Test: `tests/ui/accessibility.spec.ts`. Detalle de muestra y límites: [manual-checks.md](manual-checks.md).

## CAS-012 · Precio máximo excluye el valor exacto seleccionado · P2 media

1. Abrir `/products?min=50&max=51`: Pour-Over Coffee Set (`p108`, $50.00) está presente.
2. Abrir `/products?min=50&max=50` o `/products?min=49&max=50`.

**Esperado:** un máximo de $50 incluye el producto de $50. La expectativa interpreta “Maximum price” como límite inclusivo; confirmar esta interpretación con producto si el requisito interno difiere.

**Actual:** desaparece el producto de $50; el intervalo 50–50 no devuelve resultados. Reproducido dos veces en exploración y en tres motores en la suite.

**Impacto:** el filtro omite productos dentro del presupuesto indicado.

**Reproducción:** `bunx playwright test --project=frontend-chromium --grep 'maximum price'`. Test: `tests/ui/catalog-boundaries.spec.ts`.

## CAS-013 · SAVE20 no se retira al bajar del mínimo de $100 · P1 alta

1. Con la cuenta sintética y carrito vacío, añadir dos unidades de `/products/p108`: subtotal $100.
2. Aplicar `save20`; se aplica SAVE20 correctamente.
3. Reducir cantidad a una unidad: subtotal $50. Recargar para observar estado persistido.

**Esperado:** retirar el cupón al dejar de cumplir el mínimo. `/help#coupons` indica explícitamente que se elimina si el subtotal baja del mínimo.

**Actual:** el control de cupón activo `coupon-remove` continúa mostrando SAVE20 después de reducir el subtotal a $50 y recargar.

**Impacto:** el carrito conserva un descuento no elegible. No se envió checkout ni se confirmó un cobro o descuento efectivo en un pedido.

**Reproducción:** `bun run test:account --grep extended`. Test: `tests/account/extended.spec.ts`. Se reprodujo en la exploración automatizada inicial y la ejecución final; el test retira después el cupón y limpia el carrito.

## CAS-014 · Contraste insuficiente en controles y textos compartidos · P2 media

1. Abrir home y observar “Start shopping” y “Accept all”.
2. Ejecutar axe con reglas WCAG 2 A/AA y 2.1 A/AA.

**Esperado:** contraste mínimo 4.5:1 para el texto normal de estos controles.

**Actual:** axe 4.14 informa texto blanco `#ffffff` sobre verde `#009966`, ratio **3.65:1**, frente a 4.5:1 requerido. Ejemplos: `hero-shop-cta` (16px) y `cookie-accept` (14px). También detecta elementos de bajo contraste en catálogo, login, registro y ayuda.

**Impacto:** dificulta leer acciones e información para usuarios con baja visión. Se agrupa el patrón compartido en una incidencia, no una por nodo o navegador.

**Reproducción:** `bunx playwright test --project=frontend-chromium --grep 'automated accessibility'`. Test: `tests/ui/axe-smoke.spec.ts`. Quince ejecuciones (cinco páginas × tres motores) detectaron `color-contrast`; los resultados incompletos requieren revisión humana. No constituye certificación WCAG.

## Recomendación

Priorizar borrado de cuenta, exportación completa, consentimiento de marketing, cálculo de impuestos y consistencia del precio por variante; después frontera de envío, descuentos, persistencia del rechazo, términos y ordenación. Reejecutar los tests vinculados tras cada corrección y completar los flujos autenticados de [test-plan.md](test-plan.md) antes de recomendar un lanzamiento. Mantener este conjunto manejable para explicar impacto, evidencia y límites en la entrevista.
