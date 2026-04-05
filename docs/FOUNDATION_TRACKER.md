# Foundation Tracker

Última actualización: 2026-04-05

## Resumen

- Roadmap total: `26` tareas
- Completadas: `5`
- Avance global: `19%`

## Estado por bloque

| Bloque    | Alcance                                                            | Estado     | Avance |
| --------- | ------------------------------------------------------------------ | ---------- | -----: |
| `B01-B05` | higiene base, taxonomía, convergencia documental e infraestructura | completado | `100%` |
| `B06-B10` | ownership de controllers, guardrails y scripts públicos            | pendiente  |   `0%` |
| `B11-B18` | hotspots, APIs públicas y limpieza transversal                     | pendiente  |   `0%` |
| `B19-B23` | tests y documentación generada                                     | pendiente  |   `0%` |
| `B24-B26` | sostenibilidad y métricas de convergencia                          | pendiente  |   `0%` |

## Tareas `B01-B05`

| Id    | Estado     | Nota                                                                         |
| ----- | ---------- | ---------------------------------------------------------------------------- |
| `B01` | completado | limpieza de `.DS_Store` en el workspace y protección vigente en `.gitignore` |
| `B02` | completado | duplicados `* 2.ts` retirados del árbol activo                               |
| `B03` | completado | taxonomía canónica documentada en `docs/CODEBASE_CANON.md`                   |
| `B04` | completado | `README.md`, `src/README.md` y `ARCHITECTURE.md` alineados con la taxonomía  |
| `B05` | completado | `src/infrastructure/` retirado como capa activa; no admite código nuevo      |

## Siguiente bloque recomendado

1. `B06` definir owner canónico de controllers duplicados entre `hooks/controllers` y `features/census/controllers`
2. `B07` consolidar implementaciones y dejar reexports solo donde sean transitorios
3. `B08` agregar guardrail automático contra duplicados y archivos basura

## Regla de mantenimiento

Actualizar este tracker cada vez que un bloque cambie de estado o cuando cambie el porcentaje global del roadmap.
