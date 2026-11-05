# Smoke técnico: acceso, formularios, rendimiento y endurecimiento

## Acceso sin sesión

Ocho checks de integración correctos: cuenta/exportación/direcciones/carrito retornaron 401 a invitados, y cuenta/direcciones/privacidad/pedidos redirigieron a login. No se hicieron enumeración masiva, escaneos de vulnerabilidades, accesos a IDs ajenos ni pruebas de explotación. No equivale a una auditoría de seguridad ni prueba autorización entre dos cuentas autenticadas.

## Registro y autenticación

- Login/logout, contraseña incorrecta rechazada y acceso invitado restringido: journey con la cuenta propia sintética.
- Quince ejecuciones públicas de registro negativo: formulario vacío, nombre vacío, confirmación vacía, falta de aceptación de términos y confirmación diferente. Los cinco casos se ejecutaron en tres motores.
- El endpoint de creación se bloquea durante esas pruebas negativas y se comprueba que el frontend no intenta enviarlo. **Solo demuestra validación cliente de esos casos**, no validación del servidor.
- En exploración, passwords débiles no vacíos y un email malformado se remitían al backend; las peticiones se abortaron por seguridad. No se concluyó si el servidor los acepta o rechaza ni se abrieron bugs sobre ello. La fuerza de contraseña backend y recuperación efectiva por email siguen sin validarse.
- No se crearon más perfiles ante el fallo de borrado. No se enviaron emails de recuperación, pagos o pedidos.

## Catálogo y cupones

Ampliación: búsquedas con mayúsculas, orden invertido, espacios repetidos y nombre de tienda; categoría y persistencia al recargar; filtro de stock; máximo de precio exacto. El catálogo es compartido y no se fijan conteos globales.

Con la cuenta sintética se comprobó código inválido rechazado, SAVE20 rechazado a $50 y aceptado a $100, aplicación de TAKE5 y retirada manual de cupones. SAVE20 no se elimina al reducir de $100 a $50 (CAS-013). Se limpia el carrito al terminar. No se confirmó el cálculo/cobro final de un pedido.

## Línea base de navegación, no prueba de carga

Comando: `bun run test:baseline`. Chromium, nueve navegaciones secuenciales, tres contextos nuevos por ruta, un único cliente. Escrituras bloqueadas; observación realizada el **2026-11-05 02:02 UTC**. Todas las respuestas fueron HTTP 200, sin timeouts de 30 s.

| Ruta        | TTFB observado, min–max | Tiempo hasta load, min–max |
| ----------- | ----------------------- | -------------------------- |
| `/`         | 717–781 ms              | 814–952 ms                 |
| `/products` | 692–2106 ms             | 795–2215 ms                |
| `/help`     | 2829–4094 ms            | 2945–4204 ms               |

Son mediciones de este equipo/red/horario; no un benchmark repetible bajo carga, Core Web Vitals de usuarios reales ni aprobación de SLA. No se definió un umbral de rendimiento. Variación de red y carga del QA pueden afectar estos resultados.

Los resultados completos se guardan en `test-results/baseline.json` (ignorado por Git). El comando es opt-in, no genera carga concurrente ni se añade a CI.

## Cabeceras observadas

En las respuestas muestreadas no se observaron `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` ni `Referrer-Policy`. Se recomienda revisar el endurecimiento del despliegue antes de producción. **No se demostró una vulnerabilidad explotable ni se reporta cada cabecera ausente como un bug independiente.** No se evaluaron las cabeceras de todas las rutas/recursos ni configuraciones internas del proxy.

## Estabilidad de la automatización

La ampliación pública tuvo dos fallos intermitentes de navegación (carrito invitado Firefox y CTA WebKit). Ambos escenarios pasaron dos veces por motor al repetir: 12/12. Esto no demuestra estabilidad total.

En las pruebas autenticadas se observaron acciones sobre HTML SSR antes de que estuvieran conectados los handlers y esperas `load` innecesarias. Se usa `domcontentloaded` más un marcador observable de montaje cliente, dentro de contextos que no seleccionan consentimiento. La validación final completó ambos journeys y llegó a sus limpiezas; falló únicamente por discrepancias de producto conocidas.

No se aumentaron reintentos para ocultar errores ni se declararon los bugs como `expected failure`.
