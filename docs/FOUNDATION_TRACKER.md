# Foundation Tracker

Última actualización: 2026-04-05

## Resumen

- Roadmap total: `26` tareas
- Completadas: `10`
- Avance global: `38%`

## Estado por bloque

| Bloque    | Alcance                                                            | Estado      | Avance |
| --------- | ------------------------------------------------------------------ | ----------- | -----: |
| `B01-B05` | higiene base, taxonomía, convergencia documental e infraestructura | completado  | `100%` |
| `B06-B10` | ownership de controllers, guardrails y scripts públicos            | completado  | `100%` |
| `B11-B18` | hotspots, APIs públicas y limpieza transversal                     | en progreso |   `8%` |
| `B19-B23` | tests y documentación generada                                     | pendiente   |   `0%` |
| `B24-B26` | sostenibilidad y métricas de convergencia                          | pendiente   |   `0%` |

## Tareas `B01-B05`

| Id    | Estado     | Nota                                                                         |
| ----- | ---------- | ---------------------------------------------------------------------------- |
| `B01` | completado | limpieza de `.DS_Store` en el workspace y protección vigente en `.gitignore` |
| `B02` | completado | duplicados `* 2.ts` retirados del árbol activo                               |
| `B03` | completado | taxonomía canónica documentada en `docs/CODEBASE_CANON.md`                   |
| `B04` | completado | `README.md`, `src/README.md` y `ARCHITECTURE.md` alineados con la taxonomía  |
| `B05` | completado | `src/infrastructure/` retirado como capa activa; no admite código nuevo      |

## Tareas `B06-B10`

| Id    | Estado     | Nota                                                                                              |
| ----- | ---------- | ------------------------------------------------------------------------------------------------- |
| `B06` | completado | `features/census/controllers` queda como owner canónico de controllers duplicados                 |
| `B07` | completado | `hooks/controllers` ahora expone shims de compatibilidad para esos basenames                      |
| `B08` | completado | `check:repo-hygiene` detecta copias accidentales y ownership roto entre hooks y census            |
| `B09` | completado | superficie pública de comandos reducida a un set oficial corto en la documentación                |
| `B10` | completado | catálogo canónico de comandos oficiales vs scripts especializados en `docs/DEVELOPER_COMMANDS.md` |

## Siguiente bloque recomendado

1. `B11` seguir reduciendo fan-in en hotspots de `dailyRecord`
2. `B12` consolidar `useDailyRecordTypes` y contratos vecinos
3. `B13` curar `dateUtils` y helpers temporales compartidos

## Avance temprano `B11-B18`

- `B11` iniciado: los imports productivos dejaron de depender de `src/hooks/contracts/dailyRecordHookContracts` y ahora salen por `src/application/shared/dailyRecordContracts`.

## Regla de mantenimiento

Actualizar este tracker cada vez que un bloque cambie de estado o cuando cambie el porcentaje global del roadmap.
