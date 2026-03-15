# Reminders Feature

## Proposito

Modulo de avisos internos publicado por jefatura/admin para usuarios clinicos.

## Estructura

- `src/domain/reminders`
  - validacion y construccion del recordatorio
- `src/application/reminders`
  - reservado para futuros casos de uso si el modulo gana segmentacion, recurrencia o confirmaciones compuestas
- `src/features/reminders`
  - UI admin y lectura agregada
- `src/components/reminders`
  - centro de avisos transversal para usuarios
- `src/services/reminders`
  - Firestore, receipts, imagenes y politicas de error
- `src/shared/reminders`
  - reglas de visibilidad, labels y formatters

## Firestore

- Recordatorio:
  - `hospitals/{hospitalId}/reminders/{reminderId}`
- Lecturas:
  - `hospitals/{hospitalId}/reminders/{reminderId}/readReceipts/{receiptId}`

## Contrato de lectura

- Un receipt representa lectura por:
  - usuario
  - fecha
  - turno
- `receiptId`:
  - `userId__dateKey__shift`
- `Visto` en `day` no oculta el aviso en `night`.
- `Visto` hoy no oculta el aviso manana.
- Si falla persistir el receipt, el aviso debe seguir visible.

## Permisos

- reminders:
  - `read`: usuarios clinicos con acceso valido
  - `create/update/delete`: admin
- readReceipts:
  - `create/update`: usuario dueno
  - `read` propio: usuario dueno
  - `read` agregado: admin
- imagenes:
  - admin con custom claim vigente

## Conexion y sincronizacion

- El punto del menu de usuario indica conectividad Firebase.
- `SyncStatusIndicator` solo debe mostrar actividad real de guardado o error.
- No reintroducir pills persistentes de "Conectado" en navbar.

## UI actual

- Acceso unico desde navbar:
  - campana + contador
- Modal:
  - chips pequenos en header
  - foco principal en la nota
  - accion `Visto` discreta por tarjeta

## Lenguaje visual

- `Bell + contador`: entrypoint del centro de avisos
- chip `Informativo`: tipo del aviso destacado
- chip `Prioridad X`: severidad legible, nunca solo `Alta/Baja`
- el cuerpo de la tarjeta debe priorizar titulo, mensaje y vigencia sobre estados auxiliares

## Politica de crecimiento

- Si se agregan destinatarios por unidad, recurrencias o confirmaciones clinicas, crear casos de uso en `application/reminders` antes de seguir cargando hooks/UI.
- No duplicar queries de Firestore fuera de `services/reminders`.
- Cualquier cambio de permisos debe reflejarse en `firestore.rules`, `storage.rules` y en este README.

## Legacy

- Los receipts sin `dateKey` se consideran `Legacy` solo para lectura administrativa.
- No crear nuevos receipts sin `dateKey`.
- Si en el futuro se migra historico, retirar ese fallback de presentacion y de rules tests.

## Reglas a no romper

- No volver a modelar lectura solo por `userId`.
- No mezclar conexion con sincronizacion.
- No duplicar formateo de fechas/prioridad fuera de `shared/reminders/reminderPresentation.ts`.
