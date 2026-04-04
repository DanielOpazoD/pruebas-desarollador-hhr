# Technical Debt Register

| Estado  | Owner             | Area               | Item                                                                                           | Criterio de cierre                                                              |
| ------- | ----------------- | ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| activo  | frontend-platform | firebase-runtime   | Reducir `console.warn/error` legacy fuera de sinks estructurados                               | Sustituido por `logger` u observabilidad donde aplique                          |
| activo  | architecture      | permissions        | Mantener `operationalAccessPolicy` como unica fachada permitida sobre `utils/permissions`      | Solo `shared/access/operationalAccessPolicy.ts` importa el legacy               |
| activo  | architecture      | domain-hotspots    | Concentrar `patient.ts` y `dailyRecord.ts` en ports/facades y evitar consumers directos nuevos | `check:domain-hotspot-boundary` deja solo ports y facades aprobadas             |
| activo  | architecture      | legacy-firebase    | Simplificar bridges de imports sin tocar la compatibilidad de lectura y normalizacion legacy   | La app sigue abriendo registros legacy desde Firebase por el boundary explicito |
| activo  | platform          | firestore services | Extender inyección explícita a flows restantes de backup/export y auth con runtime singleton   | Los servicios críticos usan `create...Service` o runtime inyectable compatible  |
| cerrado | platform          | firestore services | Completar inyección explícita en auditoría, roles y export clínico                             | Los servicios ya aceptan runtime inyectable y mantienen export por defecto      |
| cerrado | qa                | critical coverage  | Ampliar zonas críticas hacia app shell, auth bootstrap y reminders                             | `check:critical-coverage` incluye esas zonas con baseline estable               |
| cerrado | qa                | phase-1 confidence | Resolver regresiones activas de `NameInput` y `handleShareLink` y restablecer `test:ci:unit`   | `test:ci:unit` vuelve a verde sin fallos abiertos ni cuarentenas                |
