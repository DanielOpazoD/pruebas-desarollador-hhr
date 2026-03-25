# Guardrail Governance

- Version: `1`
- Blocking tiers: `3`
- Report-only guards: `9`
- Quality aggregate checks: `45`

## Blocking Tiers

| Tier         | Script            | Required Scripts                                                                                                      | Purpose                                                                            |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Inner Loop   | `ci:inner-loop`   | `typecheck, lint, check:quality, test:unit:critical`                                                                  | Feedback local rapido sobre tipado, lint, boundaries y riesgos unitarios criticos. |
| Merge Gate   | `ci:merge-gate`   | `typecheck, lint, lint:strict:core, check:quality, test:ci:unit, check:critical-coverage, build, check:bundle-budget` | Proteccion blocking previa a merge para codigo clinico, auth, storage y bundle.    |
| Release Gate | `ci:release-gate` | `ci:merge-gate, test:firestore:release:ci`                                                                            | Validacion final con emuladores, reglas Firestore y E2E criticos.                  |

## Release Confidence

- Script: `test:release-confidence`
- Required scripts: `test:smoke:critical-runtime, test:rules:ci, test:emulator:sync:ci, check:critical-coverage, check:flow-performance-budget, test:e2e:critical:ci`
- Purpose: Pack blocking compacto para release confidence sin duplicar toda la suite unitaria.

## Report-Only Guards

| Id                        | Script                               | Artifact                                 |
| ------------------------- | ------------------------------------ | ---------------------------------------- |
| quality_metrics           | `report:quality-metrics`             | `reports/quality-metrics.md`             |
| operational_health        | `report:operational-health`          | `reports/operational-health.md`          |
| system_confidence         | `report:system-confidence`           | `reports/system-confidence.md`           |
| release_readiness         | `report:release-readiness-scorecard` | `reports/release-readiness-scorecard.md` |
| release_confidence_matrix | `report:release-confidence-matrix`   | `reports/release-confidence-matrix.md`   |
| runtime_contracts         | `report:runtime-contracts`           | `reports/runtime-contracts.md`           |
| guardrail_governance      | `report:guardrail-governance`        | `reports/guardrail-governance.md`        |
| technical_ownership       | `report:technical-ownership-map`     | `reports/technical-ownership-map.md`     |
| sustainable_change_policy | `report:sustainable-change-policy`   | `reports/sustainable-change-policy.md`   |

## Quality Aggregate

- Script: `check:quality`

| Group       | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| boundaries  | `check:architecture, check:application-port-boundary, check:legacy-staff-boundary, check:core-test-boundary, check:auth-feature-boundary, check:census-feature-boundary, check:clinical-documents-feature-boundary, check:handoff-feature-boundary, check:transfers-feature-boundary, check:lazy-views-feature-entrypoints, check:feature-dependencies, check:shared-layer-boundary, check:barrel-boundaries, check:handoff-context-boundaries, check:storage-context-boundaries, check:core-type-facade-boundaries, check:root-domain-barrels, check:persistence-hub-boundaries, check:legacy-localstorage-imports, check:legacy-bridge-boundary, check:folder-dependencies, check:module-dependencies, check:census-runtime-boundary, check:runtime-adapter-boundary, check:firestore-runtime-boundary` |
| tests       | `check:core-trivial-tests, check:test-governance, check:test-failure-catalog, check:flaky-quarantine`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| hygiene     | `check:core-console-usage, check:repo-hygiene`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| governance  | `check:schema-governance, check:runtime-contracts, check:docs-drift, check:operational-runbooks, check:guardrail-governance`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| size        | `check:module-size, check:handoff-module-size, check:census-module-size, check:transfers-module-size, check:hook-hotspots, check:hotspot-growth`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| type-safety | `check:critical-any, check:source-any`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| security    | `check:security`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Governance Policy

- Creation: Todo guardrail nuevo nace como report-only salvo que proteja un riesgo ya materializado.
- Promotion: Un guardrail se vuelve blocking solo si existe owner, baseline y runbook de falla.
- Retirement: Un guardrail puede retirarse solo si otro gate cubre explicitamente el mismo riesgo.
