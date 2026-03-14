# CI Gates and Failure Runbooks

## Objetivo

Definir una ruta corta para desarrollo diario y una ruta blocking para merge/release sin duplicar checks caros.

## Gates activos

### `ci:inner-loop`

Usar cuando el cambio todavía está en iteración local.

Incluye:

- `npm run typecheck`
- `npm run lint -- --max-warnings 0`
- `npm run check:quality`
- `npm run test:unit:critical`

Salida esperada:

- feedback rápido sobre tipado, lint, guardrails estructurales y riesgos unitarios críticos.

### `ci:merge-gate`

Usar antes de merge o cuando una change toca código clínico, almacenamiento, auth, bundle o lazy loading.

Incluye:

- `npm run typecheck`
- `npm run lint -- --max-warnings 0`
- `npm run check:quality`
- `npm run test:ci:unit`
- `npm run check:critical-coverage`
- `npm run build`
- `npm run check:bundle-budget`

Salida esperada:

- cobertura crítica instrumentada sin regresión;
- build productivo válido;
- budgets de bundle dentro de los límites vigentes.

### `ci:release-gate`

Usar antes de release o para validar cambios con impacto en Firestore, emuladores, reglas o E2E críticos.

Incluye:

- `npm run ci:merge-gate`
- `npm run test:firestore:release:ci`

Salida esperada:

- merge-gate verde;
- reglas, emulador sync/ui y E2E críticos verdes en la misma corrida.

## Qué hacer cuando falla

### Falla `check:bundle-budget`

1. correr `npm run build`
2. revisar el warning de `scripts/check-bundle-budget.mjs` y el tamaño real en `dist/assets`
3. identificar si el crecimiento viene del entry principal, de un chunk lazy o de un vendor pesado
4. preferir:
   - cortar imports cruzados;
   - mover librerías pesadas fuera del camino inicial;
   - dividir use cases/UI por flujo
5. no subir el threshold como primera respuesta

### Falla `check:critical-coverage`

1. correr `npm run test:coverage:critical`
2. revisar [reports/critical-coverage.md](./../reports/critical-coverage.md)
3. ubicar la zona degradada en `scripts/config/critical-coverage-thresholds.json`
4. decidir si la regresión es:
   - pérdida real de cobertura/invariante;
   - archivo nuevo sin tests;
   - refactor que movió líneas entre zonas
5. primero corregir tests o mapping de zona; solo después actualizar baseline si la nueva medición quedó validada a propósito

### Falla `test:firestore:release:ci`

1. distinguir si falla `rules`, `emulator:sync`, `emulator:ui` o `e2e:critical`
2. si falla `rules`, validar contratos de schema y paths Firestore antes de tocar tests
3. si falla `emulator:sync/ui`, revisar sync queue, repositorios, IndexedDB o adapters Firestore
4. regenerar snapshots/reportes operativos si el cambio modificó budgets o recovery policies

### Falla `test:e2e:critical`

1. validar primero que no sea un locator frágil o contrato de pantalla roto
2. preferir `data-testid`, estados visibles y señales de readiness estables
3. si el problema es rendimiento, revisar bundle por flujo antes de relajar el test
4. si el cambio es intencional, actualizar el spec con el nuevo contrato explícito

## Regla práctica

- cambio local chico: `ci:inner-loop`
- cambio funcional o refactor con impacto real: `ci:merge-gate`
- cambio de release, Firebase o UX crítica: `ci:release-gate`
