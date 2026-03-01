# `src/features/transfers`

## Propósito

Módulo de gestión de traslados clínicos. Cubre el ciclo completo de la solicitud:

- creación y edición
- cambio de estado
- cancelación y traslado efectivo
- segmentación entre casos activos y finalizados
- preparación y visualización de documentos por hospital

## Flujo funcional

### Estados activos

- `REQUESTED`
- `RECEIVED`
- `ACCEPTED`

Estos casos aparecen en la tabla principal y siguen abiertos a edición operativa.

### Estados finalizados

- `TRANSFERRED`
- `REJECTED`
- `CANCELLED`
- `NO_RESPONSE`

Estos casos aparecen en la sección colapsable de finalizados para el mes seleccionado.

## Estructura interna

```text
transfers/
├── components/
│   ├── TransferManagementView.tsx
│   └── components/
│       ├── TransferTable.tsx
│       ├── TransferTableRow.tsx
│       ├── TransferTableRowActions.tsx
│       └── TransferDocumentPackageModal.tsx
├── controllers/
│   └── transferStatusInteractionController.ts
├── services/
│   └── destinationHospitalCatalogService.ts
└── utils/
    └── localDate.ts
```

## Responsabilidades clave

### `TransferManagementView.tsx`

- filtra por año/mes
- separa activos vs finalizados
- conecta hooks de dominio y hooks de UI

### `TransferTable.tsx`

- layout tabular
- confirmación de borrado
- menú de cierre por fila

La policy de estados y acciones no vive aquí; se centraliza en:

- [transferTableController.ts](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/features/transfers/components/controllers/transferTableController.ts)

### `useTransferViewStates.ts`

Hook orquestador de UX para:

- modales del flujo
- selección de traslado activo
- apertura de cuestionario
- apertura del paquete documental

La preparación/caché de documentos se apoya en:

- [transferDocumentPackageController.ts](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/hooks/controllers/transferDocumentPackageController.ts)

## Documentos y hospitales

Hoy el soporte documental real está habilitado para:

- Hospital del Salvador

Si un hospital no tiene configuración documental:

- `Preparar docs` y `Ver docs` se deshabilitan
- la tabla muestra el hospital, pero no permite flujo documental

## Regla de visualización

- la tabla principal no debe usar scroll lateral
- los modales deben evitar scroll interno cuando el contenido cabe
- los textos largos se parten en múltiples líneas en vez de forzar una sola línea

## Reglas de mantenimiento

1. La separación de estados activos/finalizados debe seguir usando la policy compartida del controller.
2. Los cambios en documentos de traslado deben mantener el comportamiento:
   - `Preparar docs` persiste respuestas
   - `Ver docs` reutiliza el paquete ya generado dentro de la sesión si la firma no cambió
3. La fecha de solicitud debe manejarse con fecha local, no UTC.
4. Si se agregan nuevos hospitales con plantillas, actualizar la configuración documental y los tests del flujo.

## Tests relevantes

- [TransferManagementView.test.tsx](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/tests/features/transfers/TransferManagementView.test.tsx)
- [TransferFormModal.test.tsx](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/tests/features/transfers/TransferFormModal.test.tsx)
- [transferTableController.test.ts](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/tests/features/transfers/transferTableController.test.ts)
- [useTransferViewStates.test.ts](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/tests/hooks/useTransferViewStates.test.ts)
- [transferDocumentPackageController.test.ts](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/src/tests/hooks/controllers/transferDocumentPackageController.test.ts)
