# Checklist Diario Admin (1 Pagina)

## Objetivo

Detectar y corregir degradaciones de sincronizacion antes de que afecten al flujo clinico.

## Donde mirar

- Pantalla: `Admin > System Health`
- Secciones clave:
  - `Alertas Operativas` (activas + historial)
  - Tarjetas por usuario (`Pendientes`, `Sync Fallido`, `Reintentos`, `Cola mas antigua`)

## Rutina (5-10 min, inicio de turno)

1. Confirmar `Alertas Operativas`:
   - Si hay `criticas`, actuar de inmediato.
2. Revisar usuarios con:
   - `failedSyncTasks > 0`
   - `conflictSyncTasks > 0`
   - `oldestPendingAgeMs >= 15 min`
3. Verificar que no existan usuarios criticos sostenidos > 15 min.
4. Registrar incidentes abiertos/cerrados del turno.

## Accion rapida por tipo de alerta

- `Sincronizaciones fallidas`:
  - Verificar permisos/rol y repetir accion.
- `Conflictos de sincronizacion`:
  - Validar merge automatico y consistencia final en UI.
- `Cola atascada`:
  - Reintentar, recargar sesion, verificar conectividad.
- `Usuarios offline prolongados`:
  - Confirmar estado de red/dispositivo con el usuario.

## Escalamiento

- Escalar a Ingenieria si:
  - > 3 usuarios criticos por > 30 min.
  - Errores `permission-denied` en rutas previamente operativas.
  - Sospecha de perdida/corrupcion de datos clinicos.

## Evidencia minima al escalar

- Usuario/email, fecha/hora, hospital.
- Captura de `System Health`.
- Error de consola completo (code + stack).
- Paso exacto que dispara el problema.
