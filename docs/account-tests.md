# Pruebas autenticadas: ejecución controlada

## Autorización y límites

El usuario autorizó crear cuentas sintéticas y probar registro/login/carrito, pero **no enviar pagos ni pedidos**. Este límite se conserva aunque checkout muestre instrucciones de tarjetas de demo.

La suite opt-in ejecuta un journey de Chromium con pasos y aserciones suaves:

1. Registrar una cuenta sintética si se autoriza explícitamente su creación inicial, o reutilizar la cuenta propia del ledger.
2. Login, logout, acceso invitado denegado, contraseña incorrecta rechazada y login válido.
3. Carrito vacío → producto de $50 → cantidad 2 → cantidad 1; sumas y umbral de envío.
4. Cupón `welcome10`, impuestos después de descuentos y total.
5. Abrir checkout y regresar, **sin rellenar pago ni pulsar Place order**.
6. Guardar una dirección ficticia, descargar JSON, comprobar perfil/dirección/secciones prometidas y borrar la descarga.
7. Retirar carrito y direcciones, solicitar borrado y comprobar que las credenciales ya no autentican desde una sesión limpia.

Las comprobaciones blandas permiten recoger varias discrepancias y llegar a la limpieza. Si falla una precondición de navegación/API, el test falla y el `finally` intenta limpiar. Esto no garantiza eliminación: se verifica expresamente y CAS-007 demuestra el fallo del producto.

## Ejecutar

```bash
bun run test:account
bun run report:account
```

Primera ejecución en otra máquina, **solo con permiso del propietario del entorno para crear datos QA**:

```bash
CREATE_SYNTHETIC_ACCOUNT=1 bun run test:account
```

No borrar el ledger para repetir una creación cuando ya existe una cuenta pendiente de limpieza. Reutilizarla evita acumular perfiles sintéticos ante el bug de borrado. Un registro interrumpido conserva el ledger para recuperación manual, en lugar de crear otro automáticamente.

## Protecciones

- Proyecto excluido de la ejecución predeterminada y de CI. Se activa con `RUN_ACCOUNT_TESTS=1`; el script selecciona solo `account-chromium`, un worker, sin retries.
- Origen de escritura fijado al QA autorizado. Cambiar `BASE_URL` no habilita mutaciones en otro sitio.
- Solo se aceptan cuentas con marcador de propiedad y email sintético `cas-qa-<UUID>@example.com`; no admite credenciales arbitrarias de personas reales.
- Contraseña aleatoria. Marketing desactivado explícitamente al registrar.
- Ledger `.auth/owned-account.json`, ignorado por Git, archivo 0600 y directorio local 0700. No se versiona storageState.
- Interceptación del navegador: por defecto bloquea escrituras salvo auth, carrito y cuenta/direcciones. No hay código que envíe checkout, pago o pedidos. No se ejecutan recuperación por email ni acciones de vendedor.
- Traces, vídeos y screenshots desactivados para este proyecto. Los reportes de aserciones/contexto también se consideran privados, aunque solo utilicen datos sintéticos.
- Resultados separados: `test-results-account/` y `playwright-report-account/`, sin reemplazar la evidencia pública inicial. No se suben automáticamente como artefactos.

## Estado de limpieza

**Pendiente por defecto del marketplace:** CAS-007 / [issue #7](https://github.com/Greynner/CASAutomotive-smoke-tests/issues/7).

La solicitud de borrado devuelve éxito, pero la cuenta vuelve a iniciar sesión. La automatización conserva el ledger con `cleanupStatus` fallido para que el propietario pueda localizar y retirar el perfil desde el backend. No contiene datos reales. Las direcciones sintéticas y el carrito se retiraron en la última ejecución completada.

Cuando el producto realmente rechace el login con HTTP 401 tras eliminar, el test retira el ledger automáticamente. No asumir que cerrar sesión o recibir HTTP 200 en DELETE implica haber borrado la cuenta.

## Límites de cobertura

Registro se ejerció en la creación exploratoria inicial; la última ejecución automatizada reutilizó esa única cuenta. No se probaron pedidos, pagos, devoluciones, vendedor ni anonimización de reseñas tras borrado. No se demuestra aislamiento entre dos cuentas ni exportación de pedidos existentes: requieren un escenario posterior autorizado. La dirección guardada sí permite demostrar que la exportación actual omite datos existentes.
