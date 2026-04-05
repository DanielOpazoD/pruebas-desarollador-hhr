# `src/infrastructure`

## Propósito

Espacio para implementaciones de infraestructura desacopladas de `services/` legacy.

## Mapa

| Path        | Estado                                                        |
| ----------- | ------------------------------------------------------------- |
| `firebase/` | Estructura reservada para adaptadores firebase más granulares |
| `storage/`  | Estructura reservada para adaptadores de almacenamiento       |

## Nota

Esta capa está en transición; hoy convive con `src/services/storage` y `src/services/repositories`.
Los consumers de runtime Firestore deben entrar por
`src/services/storage/firestore/firestoreDatabaseProvider.ts`; este directorio queda
como hogar de implementaciones/tipos de provider y no como entrypoint concreto.
