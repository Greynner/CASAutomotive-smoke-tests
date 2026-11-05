# Plan de pruebas basado en riesgos

## Objetivo y oráculo

Detectar discrepancias observables antes de producción, con pocos hallazgos priorizados y reproducibles. El Help Center (`/help`) es la especificación pública de negocio: búsqueda por todas las palabras, precio por opción, descuentos sobre precio original, marketing opt-in y consentimiento recordado durante 12 meses. Los enlaces y recargos mostrados en la UI completan esos contratos.

No hay acceso al código del marketplace ni a sus requisitos internos. No atribuir causas raíz sin confirmación del equipo.

## Cobertura implementada

| Riesgo                         | Pruebas                                                                                                   | Alcance                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Acceso y navegación            | Rutas HTTP, 404 de producto inexistente, términos, CTA, ficha                                             | Invitado                                     |
| Encontrar productos            | Búsqueda positiva y sin resultados, ordenación asc/desc, rango de precios, paginación                     | Primera página / transición a segunda        |
| Información comercial engañosa | Cálculo de descuentos en centavos, cambio de variante +$10                                                | Productos semilla públicos                   |
| Disponibilidad y compra        | Producto agotado deshabilitado, cantidad mínima, carrito invitado                                         | Sin envío de compra                          |
| Privacidad                     | Marketing no premarcado, términos no premarcados, aceptar/rechazar y persistencia, secciones de políticas | Sin registrar cuentas                        |
| Móvil                          | Overflow horizontal en home, CTA y filtros de ofertas                                                     | iPhone 13/WebKit y Pixel 5/Chromium emulados |
| Compatibilidad                 | Tests UI compartidos                                                                                      | Chromium, Firefox y WebKit                   |

La matriz pública contiene 17 checks HTTP/acceso + 37 UI × 3 motores + 2 móviles × 2 perfiles = 132 ejecuciones. Además existen dos journeys autenticados opt-in, excluidos de CI y de la matriz predeterminada; ver [account-tests.md](account-tests.md). Se añadió axe en cinco páginas, registro negativo cliente, búsqueda/categoría/stock/frontera de precio y observación de red/almacenamiento.

## Triage de resultados

1. Reproducir en un contexto limpio con el comando del hallazgo.
2. Separar fallo de producto, fallo del test, cambio de datos semilla y error de infraestructura.
3. Comprobar esperado frente a `/help` o contrato visible; no inventar requisitos.
4. Adjuntar solo evidencia sanitizada. Agrupar variantes de una misma discrepancia (por ejemplo, asc/desc) en un hallazgo.
5. Priorizar impacto y riesgo; no convertir cada navegador o producto afectado en una incidencia distinta.
6. Tras una corrección del marketplace, ejecutar el test vinculado y después la matriz completa. No cambiar el esperado para aceptar el defecto.

## Pendiente antes de un ciclo completo / go-live

- Limpieza manual del perfil sintético retenido por CAS-007. Se autorizó una cuenta `@example.com`; no crear más mientras falle el borrado.
- Recuperación sin enumeración y validación completa de contraseñas. Login/logout y rechazo de contraseña incorrecta cubiertos en el journey; registro ejercido en creación exploratoria.
- Carrito autenticado: ampliar a variantes, límites de stock concurrente y más fronteras de cupones. Cubiertos cantidad 1→2→1, subtotal, WELCOME10, SAVE20/TAKE5, código inválido, impuesto y envío. Se confirmó que SAVE20 no se retira al perder elegibilidad (CAS-013).
- Checkout: pagos rechazados e idempotencia requieren autorización adicional de sandbox. **No enviar pagos ni pedidos**, por límite explícito del usuario. El impuesto y la navegación se comprobaron sin enviar el formulario.
- Pedidos/cancelación/devoluciones y permisos comprador/vendedor entre dos cuentas controladas.
- Venta: borradores no públicos, comisiones y métricas que excluyen cancelados.
- Smoke técnico de privacidad autenticada: rectificación y preferencia/retirada de marketing persistidas y reflejadas en exportación, con restauración. Exportación con dirección guardada y revocación de login tras borrado fallan (CAS-009 y CAS-007). Pendiente aislamiento entre cuentas, anonimización y backend/logs/backups. No se valida cumplimiento integral RGPD ni se presta asesoría jurídica; ver [privacy-smoke.md](privacy-smoke.md).
- Ampliar la observación de cookies/tráfico a más recorridos, eventos retrasados y tracking personalizado. Ya se hizo smoke antes de consentir, tras rechazar y tras aceptar en tres rutas y motores, sin trackers reconocibles en la muestra. La desaparición del banner o ausencia de patrones conocidos no prueba ausencia de tracking.
- Ampliar accesibilidad con lector de pantalla real, revisión humana, zoom/reflow y dispositivos físicos. Muestra de teclado/responsive completada; axe en cinco páginas detectó contraste insuficiente (CAS-014), además de los umbrales sin nombre accesible (CAS-011). Ver [manual-checks.md](manual-checks.md).
- Pruebas de rendimiento y seguridad específicas, únicamente con alcance y límites acordados.

## Manejo de datos y RGPD

- La suite pública no registra usuarios ni introduce datos personales, contraseñas o pagos. Solo modifica estado del navegador (consentimiento, filtros, opciones).
- Los journeys autenticados, explícitamente autorizados y opt-in, utilizan una cuenta y dirección sintéticas; dejan marketing desactivado y no envían pedidos. Retira carrito/dirección y verifica el borrado; ante fallo conserva un ledger privado para limpieza manual. No usar esta capacidad con cuentas ajenas.
- No utilizar cuentas de personas reales ni copiar credenciales del repo de referencia.
- Exportaciones, cookies, sesiones, traces y vídeos deben tratarse como potencialmente sensibles. No enviar a servicios IA ni a repositorios públicos.
- Para issues públicos: reproducir con datos sintéticos, recortar/redactar evidencia y revisar peticiones/cabeceras.
- Conservar evidencias locales solo el tiempo necesario; borrar `test-results/` y `playwright-report/` al terminar. Artefactos CI: opt-in y 7 días.
- El marketing premarcado es una discrepancia con la política publicada y un riesgo de consentimiento; requiere revisión de privacidad, no es por sí solo una conclusión jurídica sobre toda la aplicación.

## Criterio propuesto de salida

No recomendar producción hasta resolver o aceptar explícitamente los riesgos altos, verificar los flujos autenticados críticos y completar revisión de privacidad. Una suite parcial verde nunca sustituye estos criterios. Prioridades y decisión final corresponden al equipo de producto/QA.
