# Informe ejecutivo QA · MarketNest

**Fecha:** 2026-11-05 UTC. **Entorno:** QA de DigitalOcean. **Repositorio privado:** [Greynner/CASAutomotive-smoke-tests](https://github.com/Greynner/CASAutomotive-smoke-tests).

## Conclusión

**No recomendar salida a producción en el estado observado.** Se identificaron discrepancias de borrado/exportación de datos, consentimiento, precios, impuestos, cupones y accesibilidad. La decisión final de salida corresponde al equipo de producto/QA.

**Se realizó un smoke técnico de privacidad. No se validó cumplimiento integral del RGPD ni se prestó asesoría jurídica.** Se informa de controles observados, defectos y límites; no se afirma certificación legal ni un ciclo QA exhaustivo.

## Entrega

- Bun, TypeScript, Playwright, Page Objects, Biome, axe y GitHub Actions.
- **132 ejecuciones públicas**: 17 checks HTTP/acceso, 37 tests UI × tres motores y dos tests × dos perfiles móviles.
- **Dos journeys autenticados opt-in**, solo sobre una cuenta sintética propia: autenticación, perfil, marketing, carrito, cupones, preview de checkout, exportación y borrado.
- **[14 hallazgos en GitHub Issues](https://github.com/Greynner/CASAutomotive-smoke-tests/issues)**, agrupados y priorizados, con reproducción y esperado/actual. No se publican credenciales ni datos exportados.
- [Hallazgos detallados](findings.md), [plan](test-plan.md), [smoke de privacidad](privacy-smoke.md), [smoke técnico](technical-smoke.md), [revisión UI](manual-checks.md) y [borrador de correo](delivery-email.md).

## Resultados de la ampliación final

| Ejecución                            | Resultado                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Matriz pública, 01:52 UTC            | **132: 90 correctas y 42 fallidas**, 412.6 s. Cuarenta fallos reproducen nueve defectos públicos; dos son intermitentes de navegación |
| Repetición de navegación             | Dos escenarios × tres motores × dos repeticiones: **12/12 correctas**; la causa intermitente no se considera resuelta                 |
| Dos journeys autenticados, 02:09 UTC | Ambos alcanzan sus pasos y limpiezas; fallan por **cinco discrepancias**: CAS-007–CAS-010 y CAS-013. Duración 285.0 s                 |
| Acceso invitado                      | Ocho checks correctos: cuatro endpoints protegidos y cuatro redirecciones a login                                                     |
| Smoke de privacidad de red           | Nueve escenarios correctos, con límites de detección explícitos                                                                       |
| Registro negativo cliente            | Quince ejecuciones correctas; backend de creación bloqueado por seguridad                                                             |
| Axe, cinco páginas × tres motores    | Quince ejecuciones detectan contraste insuficiente, agrupadas en CAS-014                                                              |
| Línea base, nueve navegaciones       | Nueve HTTP 200, sin timeout de 30 s; no equivale a prueba de carga ni aprobación de SLA                                               |
| Calidad estática                     | Biome, TypeScript e instalación con lockfile congelado correctos                                                                      |

Las filas describen subconjuntos o ejecuciones distintas: **no sumarlas como casos independientes**. Las ejecuciones anteriores se conservan como historia en [findings.md](findings.md). Los tests no se omiten ni aceptan el defecto para simular CI verde; el sitio tiene bugs y CI puede quedar rojo.

## Prioridad propuesta

1. **[#7: borrado inefectivo](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7):** después de DELETE exitoso, las credenciales siguen autenticando.
2. **[#9: exportación incompleta](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/9):** omite una dirección guardada existente.
3. **[#1: marketing premarcado](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/1):** contradice el opt-in publicado.
4. **[#10: impuesto antes del descuento](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/10):** $4.00 en vez de $3.60 en el ejemplo WELCOME10.
5. **[#2: precio de variante no actualiza](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/2):** opción +$10 mantiene el precio base.
6. **[#13: cupón no elegible persiste](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/13):** SAVE20 continúa activo tras bajar de $100 a $50.

Otros hallazgos: descuentos porcentuales inflados (#3), rechazo de cookies no recordado (#4), términos 404 (#5), ordenación (#6), envío cobrado exactamente a $50 (#8), nombres accesibles de estrellas (#11), máximo de precio exclusivo (#12, confirmar interpretación inclusiva con producto) y contraste insuficiente (#14).

## Smoke de privacidad: qué se pudo comprobar

- Muestreo de cookies, claves de storage y tráfico reconocible antes de elegir, tras rechazar y tras aceptar, en home/productos/ayuda y tres motores. No se reconocieron trackers analíticos en esa muestra; esto no demuestra su ausencia absoluta.
- Activación y retirada de marketing en la cuenta sintética: UI y exportación reflejaron el cambio; se dejó desactivado. No se probó el envío real de campañas.
- Rectificación de perfil y reflejo en exportación: correctos en la muestra, con restauración posterior.
- Exportación con dirección existente y revocación de acceso tras borrar: **fallan**, documentadas en #9 y #7.
- Invitados sin acceso a cuatro endpoints y cuatro rutas protegidas; no equivale a aislamiento entre dos usuarios autenticados.

No se revisaron jurídicamente bases legales, contratos, transferencias, retención o textos de políticas. Tampoco se accedió a backend, logs o backups. Véase [privacy-smoke.md](privacy-smoke.md).

## Datos, seguridad y limpieza

- Una única cuenta sintética autorizada, reutilizada; no se crearon más perfiles durante esta ampliación.
- Perfil restaurado, marketing desactivado, carrito y dirección retirados, descarga borrada.
- **La cuenta requiere limpieza manual del propietario del entorno por el bug #7.** Ledger local `.auth/owned-account.json`, ignorado por Git y con permisos restringidos.
- Sin acceso a cuentas ajenas, sin pagos ni pedidos. El bloqueo de escrituras y el alcance de la cuenta se conservan.
- Sin publicación de sesiones, credenciales, exportaciones, trazas, vídeos o capturas autenticadas. El proyecto de cuenta no entra en CI automático.

## Pendientes y límites de cierre

- Corregir o aceptar formalmente los 14 hallazgos, limpiar el perfil retenido, hacer retesting y ejecutar regresión sobre el despliegue corregido.
- Pagos, pedidos, cancelaciones/devoluciones y vendedor requieren un escenario posterior autorizado; no se ejecutan por el límite explícito del usuario.
- Aislamiento entre dos cuentas, validación backend de contraseñas, recuperación efectiva por email, sesiones en otros dispositivos, stock concurrente y cupones adicionales no quedan aprobados.
- La accesibilidad combina muestra de teclado/responsive y axe; siguen pendientes lector de pantalla real, revisión humana de resultados incompletos y dispositivos físicos. No se afirma conformidad WCAG.
- Rendimiento observado sin carga concurrente ni SLA. Se recomienda revisar endurecimiento de cabeceras ausentes; no se demostró explotación ni una auditoría de seguridad completa.
- Investigar fallos intermitentes públicos; las repeticiones correctas no certifican estabilidad.
- Conceder acceso al evaluador y enviar el informe. El repositorio es privado; no se enviaron correos ni invitaciones a terceros sin destinatario autorizado.

## Reproducir

```bash
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
bun run lint
bun run typecheck
bun run test
bun run report
# Opt-in: cuenta propia, sin pagos/pedidos; ver account-tests.md
bun run test:account
bun run report:account
# Observación secuencial, sin carga concurrente
bun run test:baseline
```

En entrevista, distinguir observación, regla publicada, impacto, hipótesis de causa y límites. No presentar esta entrega como una auditoría legal ni como aprobación integral de producción.
