# Safe Change Checklist

Antes de cerrar una modificación relevante en este repo:

1. Actualizar tests unitarios e integración afectados por la change.
2. Revisar si la change toca reglas clínicas de fecha/turno, sync o identidad paciente.
3. Correr `npm run typecheck`.
4. Correr `npm run check:quality`.
5. Verificar límites de tamaño/hotspots si el cambio toca archivos grandes.
6. Revisar contratos runtime si la change toca repositorios, Firestore, templates o serialización.
7. Revisar si la change impacta `firestore.rules`, emulador o E2E crítico.
8. Si se agrega una excepción de arquitectura o tamaño, documentarla en la allowlist correspondiente.
9. Si se introduce un nuevo error operativo, mapearlo al contrato compartido y a telemetría.
10. Dejar referencias en README/ARCHITECTURE del módulo si la decisión cambia una regla estable.
