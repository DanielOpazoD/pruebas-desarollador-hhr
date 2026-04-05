# `src/features/analytics`

## Propósito

Feature autónoma para indicadores MINSAL/DEIS, tendencias y exportación analítica del hospital.

## Alcance

- Renderiza el dashboard de estadísticas desde una ruta propia del shell: `/statistics`.
- Consume datos históricos del censo para calcular KPIs, tendencias y desgloses.
- Mantiene separados los contratos de visualización analítica de la UI operativa del censo diario.

## Entry points públicos

- `index.ts`: entrypoint principal para lazy-loading del módulo.
- `public.ts`: superficie pública mínima para consumo explícito de `AnalyticsView`.

## Invariantes

- El módulo de analytics no debe renderizarse desde `CensusView`; se monta como módulo/ruta propia.
- Los cálculos y labels analíticos deben salir de controllers y hooks del feature, no de componentes del censo.
- Los links de vuelta al censo deben navegar a una fecha concreta sin reintroducir acoplamiento estructural con `census`.

## Validación recomendada

- `npx vitest run src/tests/features/analytics/AnalyticsView.test.tsx`
- `npm run typecheck`
