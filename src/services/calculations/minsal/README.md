# `src/services/calculations/minsal`

Reglas de cálculo MINSAL/DEIS y trazabilidad clínica.

- `episodeTracker.ts` es la única registry compartida para episodio abierto, fecha de ingreso resuelta y primera fecha observada.
- `calculateMinsalStats` usa la fecha de ingreso resuelta por episodio para estada, egresos y trazabilidad.
- `promedioDiasEstada` sigue la regla DEIS de `Σ días de estada de egresos del período / número de egresos del período`.
- En esta app, los `transfers` externos se tratan como egresos para la estadía promedio; por eso también aportan estadía al numerador y al conteo de salidas del período.
- El conteo de días usa la regla oficial DEIS para egresos: `fecha egreso - fecha ingreso`, con `mismo día = 1`.
- No se reutiliza el conteo operativo inclusivo de hospitalización que usa otras vistas del censo; son reglas distintas.
- `diasCamaOcupados` no debe reutilizarse para calcular `promedioDiasEstada`; son indicadores distintos.
- Si un egreso no logra reconstruir su fecha de ingreso, queda fuera del promedio y del rango de estada hasta corregir el dato fuente.
- Si la cronología queda inválida (`egreso < ingreso`), el caso también queda fuera del promedio y del rango hasta corregir el dato fuente; no se fuerza una estadía mínima artificial.
- `buildSpecialtyTraceability` usa la misma regla para no divergir del cálculo principal.
- Los movimientos (`discharges` / `transfers`) deben persistir `specialty`, `admissionDate` y `diagnosis` explícitos para reporting; `originalData` queda como snapshot de undo/auditoría e histórico de compatibilidad.
- `firstSeenDate` y `admissionDate` del tracker deben apuntar al primer día observado del episodio; no deben depender del snapshot histórico arrastrado por `originalData`.
- MINSAL y su espejo serverless consumen el mismo tracker compartido en `shared/minsal/episodeAdmissionTracker.js`; no debe existir una segunda implementación manual.
- No volver a leer `originalData` dentro del cálculo/reporting MINSAL cuando el movimiento ya persiste los campos explícitos.
