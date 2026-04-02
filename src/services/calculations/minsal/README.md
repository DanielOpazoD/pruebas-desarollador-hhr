# `src/services/calculations/minsal`

Reglas de cálculo MINSAL/DEIS y trazabilidad clínica.

- `episodeTracker.ts` es la única registry compartida para episodio abierto, fecha de ingreso resuelta y primera fecha observada.
- `calculateMinsalStats` usa la fecha de ingreso resuelta por episodio para estada, egresos y trazabilidad.
- `buildSpecialtyTraceability` usa la misma regla para no divergir del cálculo principal.
- `firstSeenDate` y `admissionDate` del tracker deben apuntar al primer día observado del episodio; no deben depender del snapshot histórico arrastrado por `originalData`.
- No volver a leer `originalData.admissionDate` si la fecha ya fue resuelta por la regla compartida.
