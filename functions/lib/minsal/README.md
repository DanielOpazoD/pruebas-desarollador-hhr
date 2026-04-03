# `functions/lib/minsal`

## Contrato

- Calcular y normalizar estadísticas MINSAL desde registros diarios.
- Mantener la agregación separada de wrappers de callable.

## Límites

- `minsalStatsCalculator.js` debe permanecer puro y testeable.
- Las decisiones de especialidad viven en `minsalSpecialty.js`, no en los handlers.
- La regla de episodio compartida vive en `sharedEpisodeAdmissionTracker.js`; no debe duplicarse manualmente en frontend o serverless.
- Validación de request/acceso y carga de registros viven en `minsalRequestPolicy.js`.
