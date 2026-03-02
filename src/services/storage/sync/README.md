# `src/services/storage/sync`

## Contrato

- El engine coordina runtime, store y transport mediante puertos.
- `syncQueueService.ts` es la fachada pública; este directorio no debe ser importado desde UI.

## Límites

- El runtime no conoce React ni hooks.
- El store no conoce Firestore.
- El transport no conoce Dexie.
