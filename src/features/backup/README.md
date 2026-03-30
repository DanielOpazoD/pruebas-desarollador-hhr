# `src/features/backup`

## Proposito

- Exponer UI y hooks para explorar, guardar, revisar y mantener respaldos historicos.

## Dependencias dueñas

- Casos de uso: `@/application/backup-export/*`
- Servicios de persistencia: `@/services/backup/*`
- Presentacion compartida: `@/shared/backup/backupPresentation`

## Invariantes

- La UI no debe clasificar errores de Storage/Firestore directamente.
- Los componentes no deben construir labels de turno o tipo de respaldo inline.
- Los hooks deben consumir `ApplicationOutcome` desde `backup-export` y no invocar servicios de infraestructura sin pasar por use cases.
- Para handoff, `Descarga local` es un flujo dual: abrir impresion del PDF paginado y mantener el
  respaldo remoto como accion separada/manual cuando corresponda segun el modulo.
