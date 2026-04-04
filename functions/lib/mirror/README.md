# `functions/lib/mirror`

## Contrato

- Replicar y escribir snapshots derivados sin mezclar autorización clínica.

## Límites

- Configuración de paths en `mirrorConfig.js`.
- La configuración del app secundario y credenciales vive en `mirrorSecondaryFirestoreFactory.js`, no en `appContext.js`.
- El mirror secundario debe configurarse por secretos de entorno/runtime:
  `BETA_SERVICE_ACCOUNT_JSON`, `BETA_SERVICE_ACCOUNT_JSON_B64` o
  `functions.config().mirror.beta_service_account_json(_b64)`.
- No se deben trackear service accounts JSON ni llaves privadas en el repositorio.
- Escrituras y transformación de payloads deben quedar en factories dedicadas.
- Nuevas colecciones espejo deben declararse en `mirrorFunctionRegistry.js` antes de agregarse al wiring público.
