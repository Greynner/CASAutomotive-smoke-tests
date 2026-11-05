# Informe ejecutivo QA · MarketNest

**Fecha:** 2026-11-05 UTC. **Entorno:** QA de DigitalOcean. **Repositorio privado:** Greynner/CASAutomotive-smoke-tests.

## Recomendación

**No recomendar salida a producción en el estado observado.** Hay discrepancias altas de borrado/exportación de datos, consentimiento y cálculos de precios/impuestos. La decisión final corresponde al equipo; esta recomendación no constituye certificación legal ni una auditoría completa.

## Entrega

- Arquitectura basada en Creai: Bun, TypeScript, Playwright, Page Objects, Biome, reportes y GitHub Actions.
- 67 ejecuciones en la matriz pública: HTTP, Chromium, Firefox, WebKit y dos perfiles móviles.
- Un journey autenticado adicional, opt-in, con cuenta propia sintética, guardas de escritura y limpieza verificable.
- [11 bugs publicados en GitHub](https://github.com/Greynner/CASAutomotive-smoke-tests/issues), con reproducción, impacto, esperado/actual y límites. Sin datos reales ni credenciales en issues.
- Código, plan y guías de reproducción en la rama `main` del repositorio de entrega. Revisión pública de UI documentada en [manual-checks.md](manual-checks.md); borrador de envío en [delivery-email.md](delivery-email.md).

## Resultados

| Ejecución                   | Resultado                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Matriz pública inicial      | 64: 43 correctas, 21 fallidas; 19 fallos asociados a seis defectos y dos transitorios                                       |
| Repetición de transitorios  | 6/6 correctas con dos workers; causa intermitente no confirmada                                                             |
| Smoke final HTTP + Chromium | 26: 19 correctas, 7 fallidas, todas por defectos conocidos                                                                  |
| Matriz pública de cierre    | 67: 43 correctas, 24 fallidas; 22 fallos por siete defectos públicos, dos intermitentes que pasaron 3/3 al repetir cada uno |
| Journey autenticado final   | Falla por cuatro discrepancias confirmadas; se alcanzó el paso final de limpieza/borrado                                    |
| Calidad estática            | Biome y TypeScript correctos; instalación con lockfile congelado correcta                                                   |

No sumar estas ejecuciones como casos independientes ni interpretar los fallos conocidos como errores que deban ocultarse para obtener CI verde. La matriz de cierre se ejecutó a las 01:25 UTC y duró 227.0 s. CI puede quedar rojo por defectos del sitio; no se marcaron como omitidos o esperados para simular éxito.

## Hallazgos prioritarios

1. **[#7: borrado inefectivo](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7):** tras DELETE exitoso, las mismas credenciales siguen autenticando.
2. **[#9: exportación incompleta](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/9):** omite una dirección guardada existente.
3. **[#1: marketing premarcado](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/1):** contradice el opt-in publicado.
4. **[#10: impuesto antes del descuento](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/10):** con WELCOME10 calcula $4.00 en vez de $3.60.
5. **[#2: precio por variante no actualiza](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/2):** opción +$10 mantiene el precio base.

Otros hallazgos: porcentaje de descuentos inflado (#3), rechazo de cookies no recordado (#4), términos 404 (#5), ordenación inconsistente (#6) envío cobrado exactamente a $50 (#8) y nombres accesibles indistinguibles en filtros de estrellas (#11). Detalle en [findings.md](findings.md).

## Datos, seguridad y limpieza

- Una única cuenta y dirección sintéticas, sin marketing. Sin acceso a cuentas ajenas.
- No se enviaron pagos ni pedidos, conforme al límite explícito del usuario.
- Carrito y dirección se retiraron; descarga de exportación borrada.
- **La cuenta sigue pendiente de limpieza manual por el propietario del entorno**, porque el borrado del producto no revoca el login. Credenciales solo en `.auth/owned-account.json`, ignorado por Git y con permisos restringidos.
- No se publicaron trazas, vídeos, capturas autenticadas ni exportaciones. El proyecto autenticado desactiva capturas y no entra en CI automático.

## Pendientes para completar el ciclo

- Resolver/aceptar formalmente los once defectos y verificar las correcciones con sus tests.
- Limpiar el perfil sintético retenido y confirmar que no puede volver a iniciar sesión.
- Completar variantes/stock/cupones adicionales, permisos entre dos cuentas, rectificación y retirada de marketing, seguimiento de cookies/tráfico y auditoría de accesibilidad más amplia. Se revisaron cinco páginas en dos viewports y teclado de forma acotada; no se afirma conformidad WCAG.
- Investigar inestabilidad intermitente de navegación inicial y filtro móvil. La repetición aislada correcta no demuestra ausencia de flakiness.
- Pedidos, pagos, cancelaciones y vendedor siguen pendientes; requieren autorización adicional. El hecho de que checkout muestre tarjetas de demo no amplía el permiso recibido.
- Ejecutar matriz completa sobre las correcciones y acordar criterios de salida con producto/QA.
- Conceder acceso de lectura al evaluador y enviar el informe. El repositorio permanece privado; no se invitó a terceros ni se enviaron correos sin destinatario/canal autorizado.

## Reproducir

```bash
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
bun run lint
bun run typecheck
bun run test:smoke
bun run report
# Solo con la cuenta sintética propia y autorización descrita en account-tests.md:
bun run test:account
bun run report:account
```

Para explicar los hallazgos en entrevista: distinguir siempre comportamiento observado, regla publicada, impacto, hipótesis de causa y límites de lo que no se probó.
