# Smoke técnico de privacidad y acceso

> **Se realizó un smoke técnico de privacidad. No se validó cumplimiento integral del RGPD ni se prestó asesoría jurídica.** Los resultados describen controles y discrepancias observables del despliegue QA.

## Alcance ejecutado

2026-11-05 UTC, Playwright 1.64.1. Sin datos personales reales, sin nuevas cuentas durante la ampliación, sin pagos ni pedidos. Se reutilizó una única cuenta sintética autorizada y no se accedió a datos de otras personas.

| Control técnico        | Evidencia observada                                                                | Resultado / límite                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Antes de consentir     | Home, productos y ayuda, contextos limpios, tres motores                           | No se reconocieron cookies, claves de storage ni endpoints analíticos según las heurísticas del test                                 |
| Tras rechazar          | Las mismas tres rutas y motores                                                    | No se reconocieron trackers; el rechazo no se recuerda al recargar (CAS-004)                                                         |
| Tras aceptar           | Las mismas rutas y motores                                                         | Cookie `mp_consent`; no claves local/sessionStorage ni trackers reconocibles en la muestra. No se exige que aceptar active analítica |
| Marketing en registro  | Estado inicial de la casilla                                                       | Premarcada, contradice el opt-in publicado (CAS-001)                                                                                 |
| Preferencia y retirada | Cuenta sintética: activar → recargar → exportar → desactivar → recargar → exportar | UI y exportación reflejaron ambos estados; quedó desactivada. No se probó una campaña o envío de email real                          |
| Rectificación          | Cambio del apellido sintético y comprobación tras recargar/exportar                | Correcto en la muestra; se restauró el valor inicial                                                                                 |
| Acceso/exportación     | Descarga propia con dirección sintética existente                                  | Perfil propio, sin contraseña literal; omite la dirección guardada (CAS-009). No se verificaron pedidos existentes                   |
| Borrado                | DELETE y nuevo login con cookies limpias                                           | Sigue autenticando (CAS-007); la redirección visual no se considera prueba de borrado                                                |
| Acceso invitado API    | GET de cuenta, exportación, direcciones y carrito                                  | Cuatro respuestas HTTP 401; no se interpretó como prueba de aislamiento entre dos usuarios autenticados                              |
| Acceso invitado UI     | Cuenta, direcciones, privacidad y pedidos                                          | Cuatro redirecciones a login                                                                                                         |

## Método y evidencia

- `tests/ui/privacy-network.spec.ts`: nueve ejecuciones correctas (tres elecciones × tres motores), observando navegación a `/`, `/products`, `/help`.
- Se inspeccionaron nombres de cookies y claves de almacenamiento, no sus valores. Se reconocen patrones comunes de Google Analytics/Tag Manager, Meta, Segment, Mixpanel, Hotjar, Amplitude y `/api/analytics`.
- Los adjuntos `sanitized-privacy-smoke.json` contienen solo nombres, dominios reconocidos, rutas muestreadas y límites. No payloads, query strings, cookies completas ni sesiones.
- `tests/account/extended.spec.ts`: corrección, preferencia de marketing y retirada; estado reflejado en exportación propia, sin publicar el JSON.
- `tests/account/journey.spec.ts`: exportación con datos sintéticos y borrado, con comprobación efectiva de credenciales después de DELETE.
- `tests/integration/access-control.spec.ts`: bloqueo a invitados en endpoints y rutas concretos.

## Qué NO demuestra este smoke

- Ausencia absoluta de tracking, fingerprinting, analytics personalizados, eventos retrasados, destinos no reconocidos o transferencia de datos. La observación es limitada al recorrido y periodo de ejecución, no una captura continua de toda la aplicación.
- Revocación de una sesión antigua en otro dispositivo, aislamiento entre dos cuentas, borrado en backend/logs/backups, retención legal, anonimización de pedidos/reseñas o respuesta completa a solicitudes de derechos.
- Cifrado en reposo, hashing seguro de contraseñas o controles internos no accesibles desde el navegador.
- Adecuación de textos legales, bases jurídicas, contratos con proveedores, transferencias internacionales, plazos de conservación o procedimientos de incidentes. No se evaluaron como cumplimiento jurídico.
- Una suite verde no certifica RGPD; una cookie no identificada tampoco demuestra por sí sola una infracción.

## Limpieza y acciones del equipo

Se restauró el perfil sintético, se retiró marketing y se vaciaron carrito y direcciones. La descarga se borró. **La cuenta permanece por el fallo de borrado y debe retirarla manualmente el propietario del entorno**; el ledger de recuperación solo está en `.auth/owned-account.json`, ignorado por Git.

Priorizar CAS-001, CAS-004, CAS-007 y CAS-009; verificar las correcciones mediante los tests y contrastar internamente la política publicada con los procesos reales. En la entrega se informa de un smoke técnico de privacidad, no de una validación legal o certificación de cumplimiento.
