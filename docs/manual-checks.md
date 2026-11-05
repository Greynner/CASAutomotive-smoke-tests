# Revisión pública de UI, responsive y accesibilidad básica

**Fecha:** 2026-11-05 UTC. **Método:** inspección con navegador automatizado y árbol de accesibilidad, sin enviar formularios ni acceder a cuentas. No sustituye una evaluación humana con tecnologías de asistencia.

## Muestra revisada

- Páginas: `/`, `/products`, `/login`, `/register`, `/help`.
- Chromium: escritorio 1440×900 y móvil 390×900; diez combinaciones página/viewport.
- Móvil: filtros expandidos y activación con teclado.

| Comprobación                                  | Resultado observado                              | Límite                                                             |
| --------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Overflow horizontal del documento             | No observado en las diez combinaciones           | No cubre todos los anchos, idiomas o contenidos                    |
| Filtros expandidos en móvil                   | Contenido dentro de 390px                        | No equivale a todos los dispositivos físicos                       |
| Landmark principal y título                   | Un `main` y un H1 descriptivo en cada página     | No audita toda la jerarquía semántica                              |
| Labels de login/registro y nombre de búsqueda | Asociaciones presentes                           | No se enviaron formularios en esta revisión                        |
| Primeros diez Tab stops por combinación       | Navegación y controles alcanzables               | No recorrido exhaustivo ni prueba de todas las trampas de foco     |
| Filters móvil con Enter                       | Abre y expone estado expandido                   | No prueba completa con lector de pantalla                          |
| Nombre accesible de umbrales de valoración    | **Falla: cuatro radios se anuncian como `& up`** | CAS-011 / issue #11; test automatizado reproducido en tres motores |

La ausencia de outline, por sí sola, no se registró como defecto: se observó cambio de borde en el foco de búsqueda. No se deduce conformidad de contraste ni de todos los estados de foco.

## Defecto nuevo

[CAS-011 / issue #11](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/11): los radios de valoración no indican 4, 3, 2 o 1 estrellas en su nombre accesible. Los SVG están ocultos al árbol accesible. Un lector de pantalla no puede distinguir los umbrales por sus nombres.

```bash
bunx playwright test --project=frontend-chromium --grep '@accessibility'
```

## No evaluado / no aprobado

- Lector de pantalla real, contraste medido, zoom/reflow al 200–400%, navegación de teclado exhaustiva y validación integral WCAG.
- Dispositivos físicos, más breakpoints, localización e interacción con pedidos/vendedor.
- No afirmar “accesibilidad aprobada” o “responsive completo” a partir de esta muestra.
