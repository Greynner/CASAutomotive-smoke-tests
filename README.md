# CASAutomotive · MarketNest QA automation

Suite de regresión basada en riesgos para <https://qa-marketplace-app-b9mpo.ondigitalocean.app/>.
Replica la arquitectura de `Creai-homepage-smoke-tests`, adaptando los contratos al marketplace real: **Bun + TypeScript + Playwright + Page Objects + Biome + GitHub Actions**.

**No es una suite que deba pasar a cualquier precio:** las discrepancias confirmadas permanecen como fallos, sin `skip`, `fixme` ni aserciones que acepten el bug.

## Inicio

```bash
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
cp .env.example .env  # opcional: el entorno QA ya es el predeterminado
bun run lint
bun run typecheck
bun run test:smoke
bun run report
```

En Linux/CI: `bunx playwright install --with-deps chromium firefox webkit`.

| Comando                    | Alcance                                                  |
| -------------------------- | -------------------------------------------------------- |
| `bun run test`             | Matriz pública, 67 ejecuciones; sin crear cuentas        |
| `bun run test:smoke`       | HTTP + escritorio Chromium                               |
| `bun run test:integration` | Rutas públicas y códigos HTTP                            |
| `bun run test:frontend`    | Tres motores de escritorio + dos móviles                 |
| `bun run test:headed`      | Navegadores visibles                                     |
| `bun run test:ui`          | Exploración interactiva de tests                         |
| `bun run report`           | Reporte HTML local                                       |
| `bun run format`           | Formato y correcciones seguras de Biome                  |
| `bun run test:account`     | Journey autenticado opt-in, solo cuenta sintética propia |
| `bun run report:account`   | Reporte autenticado separado                             |

Ejecutar un hallazgo:

```bash
bunx playwright test --project=frontend-chromium --grep 'marketing is opt-in'
bunx playwright test --project=frontend-chromium --grep '@pricing'
bunx playwright test --project=integration --grep '@legal'
```

Para otra URL: `BASE_URL=https://tu-entorno.example bun run test:smoke`. El entorno debe conservar los productos semilla indicados en `support/marketplace.ts`; cambiar solo la URL no adapta los contratos de negocio a otra aplicación.

## Arquitectura

```text
src/e2e-tests/
  pages/                  # HomePage, CatalogPage, ProductPage, CartPage
  support/marketplace.ts  # Rutas, productos semilla y conversión USD a centavos
  support/synthetic-account.ts # Propiedad de cuenta, guardas y verificación del borrado
  tests/
    integration/          # HTTP real, sin mocks
    ui/                   # Navegación, catálogo, producto, privacidad
    mobile/               # Layout y filtros táctiles
    account/              # Journey autenticado opt-in; nunca envía pagos/pedidos
playwright.config.ts      # Proyectos, concurrencia, evidencias y reporteros
.github/workflows/        # Instalación reproducible, lint, typecheck y ejecución
.github/ISSUE_TEMPLATE/   # Reportes con prioridad, reproducción y evidencia sanitizada
docs/                     # Plan de pruebas y hallazgos reproducidos
```

Se conservan las capas y convenciones del repo de referencia, **no** su `.env`, dependencias instaladas, artefactos, selectores Webflow ni expectativas de Creai. El proyecto iPhone usa WebKit; Android usa Chromium. Son emulaciones, no dispositivos físicos.

La integración opcional Passmark/IA del original **no se incorpora en esta primera versión**: no es necesaria para reproducir estos fallos y enviaría contenido a terceros. No se copiaron claves ni se configuraron proveedores externos. Puede agregarse después con consentimiento y una política de datos explícita.

## Aislamiento, evidencias y CI

- Suite pública: contexto nuevo por test; sin cuentas ni escrituras de negocio. Journey autenticado: cuenta sintética propia, explícitamente autorizado, reutilizada para evitar cuentas huérfanas; ver [docs/account-tests.md](docs/account-tests.md).
- No se envían pagos ni pedidos. El proyecto autenticado bloquea escrituras fuera de auth, carrito y cuenta/direcciones; no se ejecuta por defecto ni en CI.
- Dos workers por defecto; `WORKERS=1` reduce presión sobre este QA compartido.
- Sin esperas fijas, `networkidle`, clicks forzados ni mocks que oculten el comportamiento real. Las mutaciones del carrito esperan la respuesta y recargan para verificar estado persistido.
- Reportes HTML y JSON; screenshot, vídeo y trace retenidos en fallos de la suite pública. En autenticación se desactivan por privacidad y se usa un directorio de reportes separado.
- CI ejecuta toda la matriz pública, con un reintento y detección de `test.only`. Un bug real produce CI rojo deliberadamente.
- Los artefactos **no se publican automáticamente**. En ejecución manual se pueden subir por 7 días con `upload_evidence`, tras revisar visibilidad y contenido.

**RGPD:** revisar [docs/test-plan.md](docs/test-plan.md) y [docs/account-tests.md](docs/account-tests.md) antes de ejecutar o ampliar autenticación. Trazas y vídeos pueden contener cookies, reseñas y otros datos personales, incluso navegando como invitado. No subirlos a issues públicos. `.env`, `.auth/`, reportes y resultados están ignorados por Git. La automatización no certifica cumplimiento legal.

## Resultados y límites

Resumen ejecutivo y pendientes: [docs/final-report.md](docs/final-report.md).

Consultar [docs/findings.md](docs/findings.md): once defectos reproducidos, priorizados y publicados como [issues #1–#11](https://github.com/Greynner/CASAutomotive-smoke-tests/issues). La ejecución completa y las comprobaciones aisladas están documentadas por separado; no se confunden fallos transitorios con bugs confirmados.

Esto no es un ciclo QA completo ni autorización de salida a producción. Se comprobaron login/logout, carrito, preview de checkout, exportación con una dirección sintética y borrado. **El borrado falla: la cuenta sintética sigue existiendo y requiere limpieza manual del propietario del entorno.** Pagos, pedidos, autorización entre usuarios y verificación RGPD más amplia permanecen pendientes.
