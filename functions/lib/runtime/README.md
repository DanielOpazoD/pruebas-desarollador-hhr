# `functions/lib/runtime`

## Contrato

- Configuración y políticas runtime compartidas para Functions.
- El hospital activo, capacidad y validaciones de contexto viven aquí.

## Límites

- Los módulos de dominio (`auth`, `mirror`, `minsal`) no deben hardcodear hospital/capacidad.
- Nuevas restricciones de contexto deben pasar por `hospitalPolicy.js`.
