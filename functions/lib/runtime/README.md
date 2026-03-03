# `functions/lib/runtime`

## Contrato

- Configuración y políticas runtime compartidas para Functions.
- El hospital activo, capacidad y validaciones de contexto viven aquí.
- `runtimeContract.js` fija el contrato backend publicado: versión runtime, cliente mínimo
  soportado y rango de schema esperado.

## Límites

- Los módulos de dominio (`auth`, `mirror`, `minsal`) no deben hardcodear hospital/capacidad.
- Nuevas restricciones de contexto deben pasar por `hospitalPolicy.js`.
- Si cambia el contrato runtime, debe mantenerse alineado con:
  - `src/constants/runtimeContracts.ts`
  - `src/constants/version.ts`
  - `src/services/repositories/runtimeContractGovernance.ts`
