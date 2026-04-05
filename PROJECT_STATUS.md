# HHR Hospital Tracker - Estado del Proyecto

> **Última actualización:** 2026-04-05
> **Evaluación técnica de referencia:** 6.1 / 7.0

## Resumen

El proyecto se encuentra en un estado **bueno y operable**, con una base técnica robusta para un sistema clínico: tipado estricto en código fuente, checks de arquitectura, suite amplia de tests y cobertura de flujos críticos con emuladores y E2E.

Las mejoras recientes se han concentrado en:

- eliminar rutas Gemini cliente no utilizadas;
- modularizar `functions/index.js` en dominios internos;
- reducir imports de compatibilidad desde `dataService.ts`;
- limpiar artefactos trackeados y endurecer la higiene del repositorio;
- cerrar el roadmap estructural `B01-B26` y dejar cadencia mensual de convergencia.

## Fortalezas actuales

- Arquitectura orientada por features y servicios.
- Controles automáticos de calidad y boundaries.
- Estrategia offline-first con respaldo de Firestore/IndexedDB.
- Suite de tests amplia para riesgos clínicos y operativos.

## Deuda técnica principal

- Complejidad estructural alta en módulos críticos de runtime y storage.
- Compatibilidad legacy todavía necesaria, con costo de mantenimiento asociado.
- Documentación técnica histórica que puede desalinearse si no se regenera con disciplina.
- Features experimentales presentes en el repo, aunque ya no expuestas en el acceso principal.

## Próximo foco recomendado

1. Recuperar `typecheck` global alineando tests de `census` al modelo `unifiedRows`.
2. Ejecutar la siguiente ola de megatests (`PatientRowOrbitalQuickActions`, `transferService`).
3. Mantener la convergencia con la rutina de [docs/FOUNDATION_MAINTENANCE_CADENCE.md](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/docs/FOUNDATION_MAINTENANCE_CADENCE.md).

## Tracker de cimientos

El seguimiento persistente del roadmap estructural vive en:

- [docs/FOUNDATION_TRACKER.md](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/docs/FOUNDATION_TRACKER.md)
- Taxonomía canónica: [docs/CODEBASE_CANON.md](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/docs/CODEBASE_CANON.md)
- Mapa documental: [docs/DOCUMENTATION_MAP.md](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/docs/DOCUMENTATION_MAP.md)

## Fuente de verdad

- Métricas actuales: [reports/quality-metrics.md](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/reports/quality-metrics.md)
- Pipeline activa: [ci-cd.yml](/Users/danielopazodamiani/Desktop/HHR%20Tracker%20Marzo%202026/.github/workflows/ci-cd.yml)
