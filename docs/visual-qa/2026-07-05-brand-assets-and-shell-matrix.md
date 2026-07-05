# Visual QA Matrix: Brand Assets And Shell Surfaces

- Date: 2026-07-05
- Scope: LogoMark static assets plus desktop shell smoke coverage for marketing, auth, and workbench.
- Command: `pnpm --filter @ash/web build && pnpm --filter @ash/web visual:qa`
- Viewport: 1440 x 960, device scale factor 1.
- Runtime note: the visual QA script starts `next start`, launches headless Chrome, and uses a tiny local praxis mock for `/v1/tasks` and `/v1/skills` so the protected workbench home can render without private backend services.

## Matrix

| Surface | Theme | Route | Screenshot | Result |
|---------|-------|-------|------------|--------|
| Marketing home | Light | `/zh` | [marketing-light.png](./artifacts/2026-07-05/marketing-light.png) | Pass |
| Marketing home | Dark | `/zh` | [marketing-dark.png](./artifacts/2026-07-05/marketing-dark.png) | Pass |
| Auth login | Light | `/login` | [auth-light.png](./artifacts/2026-07-05/auth-light.png) | Pass |
| Auth login | Dark | `/login` | [auth-dark.png](./artifacts/2026-07-05/auth-dark.png) | Pass |
| Workbench home | Light | `/app` | [workbench-light.png](./artifacts/2026-07-05/workbench-light.png) | Pass |
| Workbench home | Dark | `/app` | [workbench-dark.png](./artifacts/2026-07-05/workbench-dark.png) | Pass |

Raw run output: [visual-qa-results.json](./artifacts/2026-07-05/visual-qa-results.json).

## Asset Checks

| Asset | Path | Expected content type | Result |
|-------|------|-----------------------|--------|
| Browser icon | `/icon.svg` | `image/svg+xml` | Pass |
| Web manifest | `/manifest.webmanifest` | `application/manifest+json` | Pass |
| App icon | `/ash-icon.svg` | `image/svg+xml` | Pass |
| Maskable app icon | `/ash-maskable-icon.svg` | `image/svg+xml` | Pass |

## Observations

- LogoMark is visible in the marketing header, auth lockup, workbench sidebar, and workbench home composer.
- Dark theme applies on all three covered surfaces.
- Workbench coverage uses an authenticated visual-QA browser shim and an empty-task praxis mock; it verifies shell rendering, brand placement, and theme treatment, not live task execution.
- No visual regressions were found in this matrix.
