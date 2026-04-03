# `src/services/calculations/minsal`

Reglas de cálculo MINSAL/DEIS y trazabilidad clínica.

- `episodeTracker.ts` es la única registry compartida para episodio abierto, fecha de ingreso resuelta y primera fecha observada.
- `calculateMinsalStats` usa la fecha de ingreso resuelta por episodio para estada, egresos y trazabilidad.
- `buildSpecialtyTraceability` usa la misma regla para no divergir del cálculo principal.
- Los movimientos (`discharges` / `transfers`) deben persistir `specialty`, `admissionDate` y `diagnosis` explícitos para reporting; `originalData` queda como snapshot de undo/auditoría e histórico de compatibilidad.
- `firstSeenDate` y `admissionDate` del tracker deben apuntar al primer día observado del episodio; no deben depender del snapshot histórico arrastrado por `originalData`.
- MINSAL y su espejo serverless consumen el mismo tracker compartido en `shared/minsal/episodeAdmissionTracker.js`; no debe existir una segunda implementación manual.
- No volver a leer `originalData` dentro del cálculo/reporting MINSAL cuando el movimiento ya persiste los campos explícitos.
