# Test Megatest Backlog

Última actualización: 2026-04-05

## Objetivo

Identificar tests grandes con mayor costo de mantenimiento para partirlos sin perder cobertura útil.

## Particiones realizadas

- `src/tests/features/clinical-documents/ClinicalDocumentsWorkspace.test.tsx`
  ahora se reparte entre `ClinicalDocumentsWorkspace.test.tsx` y `ClinicalDocumentsWorkspace.behavior.test.tsx`.
- `src/tests/hooks/useBedManagement.test.ts`
  ahora se reparte entre `useBedManagement.patient-updates.test.ts` y `useBedManagement.operations.test.ts`.
- `src/tests/views/census/PatientRowOrbitalQuickActions.test.tsx`
  ahora se reparte entre `PatientRowOrbitalQuickActions.behavior.test.tsx` y `PatientRowOrbitalQuickActions.visibility.test.tsx`.
- `src/tests/services/transfers/transferService.test.ts`
  ahora se reparte entre `transferService.mutations.test.ts` y `transferService.queries.test.ts`.
- `src/tests/services/repositories/DailyRecordRepository.test.ts`
  ahora se reparte entre `DailyRecordRepository.reads.test.ts` y `DailyRecordRepository.lifecycle.test.ts`.
- `src/tests/services/calculations/minsalStatsCalculator.test.ts`
  ahora se reparte entre `minsalStatsCalculator.ranges-and-snapshots.test.ts`,
  `minsalStatsCalculator.aggregate-stats.test.ts` y `minsalStatsCalculator.stay-resolution.test.ts`.
- `src/tests/security/firestore-rules.test.ts`
  ahora se reduce a un entrypoint con harness común y grupos separados en
  `firestoreRulesAccessGroups.ts`, `firestoreRulesDomainGroups.ts` y
  `firestoreRulesIdentityGroups.ts`.

## Criterio de priorización

- tamaño del archivo;
- mezcla de responsabilidades en un solo spec;
- cercanía a runtime crítico o lógica clínica;
- probabilidad de ruido al cambiar código no relacionado.

## Candidatos prioritarios

| Prioridad | Archivo                                                        | Líneas | Riesgo dominante                                      | Estrategia de partición                                                 |
| --------- | -------------------------------------------------------------- | -----: | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `P2`      | `src/tests/hooks/useDailyRecord.test.tsx`                      |  `432` | Hook principal todavía arrastra demasiados escenarios | Partir por bootstrap, save/update, sync y failure handling              |
| `P2`      | `src/tests/views/census/CensusActionsContext.test.tsx`         |  `425` | Mucho wiring contextual en una sola prueba            | Partir por provider state, command exposure y mutation effects          |
| `P2`      | `src/tests/hooks/useTransferViewStates.test.ts`                |  `410` | Mezcla modales, documentos y selección activa         | Partir por modal state, current transfer y document package             |
| `P2`      | `src/tests/views/census/CensusTable.test.tsx`                  |  `402` | Tabla crítica con escenarios heterogéneos             | Partir por filas, columnas, documentos clínicos y rendering conditional |
| `P2`      | `src/tests/features/transfers/TransferManagementView.test.tsx` |  `400` | Vista grande con varios concerns                      | Partir por active/finished grouping, modales y user actions             |

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

1. Reducir el archivo flake restante y revisar si coincide con alguno de los `P2`.
2. Evaluar si `useDailyRecord.test.tsx` o `CensusActionsContext.test.tsx` son mejor siguiente ola local por costo/beneficio.
3. Medir si baja el tiempo de diagnóstico de fallos y el costo de edición.
