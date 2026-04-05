# Test Megatest Backlog

Última actualización: 2026-04-05

## Objetivo

Identificar tests grandes con mayor costo de mantenimiento para partirlos sin perder cobertura útil.

## Particiones realizadas

- `src/tests/features/clinical-documents/ClinicalDocumentsWorkspace.test.tsx`
  ahora se reparte entre `ClinicalDocumentsWorkspace.test.tsx` y `ClinicalDocumentsWorkspace.behavior.test.tsx`.
- `src/tests/hooks/useBedManagement.test.ts`
  ahora se reparte entre `useBedManagement.patient-updates.test.ts` y `useBedManagement.operations.test.ts`.

## Criterio de priorización

- tamaño del archivo;
- mezcla de responsabilidades en un solo spec;
- cercanía a runtime crítico o lógica clínica;
- probabilidad de ruido al cambiar código no relacionado.

## Candidatos prioritarios

| Prioridad | Archivo                                                         | Líneas | Riesgo dominante                                                | Estrategia de partición                                                            |
| --------- | --------------------------------------------------------------- | -----: | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `P1`      | `src/tests/security/firestore-rules.test.ts`                    | `1040` | Mezcla reglas, fixtures y matrix de permisos en un solo archivo | Separar por dominio de regla: lectura, escritura, roles privilegiados, regresiones |
| `P1`      | `src/tests/services/calculations/minsalStatsCalculator.test.ts` | `1004` | Mucha cobertura acumulada en una sola suite de cálculo          | Partir por agregados: ocupación, movimientos, filtros, edge cases                  |
| `P1`      | `src/tests/services/repositories/DailyRecordRepository.test.ts` |  `733` | Alto costo de cambio en persistencia central                    | Separar por lectura, escritura, sync y compatibilidad                              |
| `P1`      | `src/tests/views/census/PatientRowOrbitalQuickActions.test.tsx` |  `696` | Mezcla interacción visual, gating y runtime                     | Partir por visibilidad, interacción, permisos y layout behavior                    |
| `P1`      | `src/tests/services/transfers/transferService.test.ts`          |  `510` | Suite fachada con responsabilidades mezcladas                   | Separar queries, mutaciones, errores operativos y status transitions               |
| `P2`      | `src/tests/hooks/useDailyRecord.test.tsx`                       |  `432` | Hook principal todavía arrastra demasiados escenarios           | Partir por bootstrap, save/update, sync y failure handling                         |
| `P2`      | `src/tests/views/census/CensusActionsContext.test.tsx`          |  `425` | Mucho wiring contextual en una sola prueba                      | Partir por provider state, command exposure y mutation effects                     |
| `P2`      | `src/tests/hooks/useTransferViewStates.test.ts`                 |  `410` | Mezcla modales, documentos y selección activa                   | Partir por modal state, current transfer y document package                        |
| `P2`      | `src/tests/views/census/CensusTable.test.tsx`                   |  `402` | Tabla crítica con escenarios heterogéneos                       | Partir por filas, columnas, documentos clínicos y rendering conditional            |
| `P2`      | `src/tests/features/transfers/TransferManagementView.test.tsx`  |  `400` | Vista grande con varios concerns                                | Partir por active/finished grouping, modales y user actions                        |

## Segunda ola sugerida

- `src/tests/integration/daily-record-sync.test.tsx`
- `src/tests/integration/census-export.test.ts`
- `src/tests/views/handoff/HandoffRow.test.tsx`
- `src/tests/hooks/useHandoffManagement.test.ts`
- `src/tests/services/repositories/dailyRecordRepositoryWriteService.test.ts`

## Reglas de ejecución

- No partir por tamaño solamente; empezar por los `P1`.
- Mantener tests de integración donde agreguen señal real.
- Si una suite se parte, conservar nombres orientados a seams concretos y no a “part 1 / part 2”.
- Cada partición debe dejar el archivo original más pequeño o retirarlo completamente.

## Siguiente acción recomendada

1. Reintentar `DailyRecordRepository.test.ts` sin depender de helpers que rompan el hoisting de mocks de Vitest.
2. Repetir el patrón sobre `PatientRowOrbitalQuickActions.test.tsx` y `transferService.test.ts`.
3. Medir si baja el tiempo de diagnóstico de fallos y el costo de edición.
