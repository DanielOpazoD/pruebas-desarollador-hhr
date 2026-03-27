# Serverless Sensitive Contracts

## Netlify Functions críticas

| Endpoint              | Método            | Auth            | Roles                                                                      | Variables clave                                 | Errores esperables                |
| --------------------- | ----------------- | --------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `send-census-email`   | `POST`            | Bearer Firebase | `admin`, `nurse_hospital`                                                  | `VITE_FIREBASE_*`, Gmail secrets                | `400`, `401`, `403`, `500`        |
| `fhir-api`            | `GET`, `OPTIONS`  | Bearer Firebase | roles clínicos permitidos                                                  | `VITE_FIREBASE_*`                               | `401`, `403`, `404`, `500`        |
| `clinical-ai-summary` | `POST`, `OPTIONS` | Bearer Firebase | `admin`, `nurse_hospital`, `doctor_urgency`, `doctor_specialist`, `editor` | `AI_PROVIDER`, provider keys, `VITE_FIREBASE_*` | `400`, `401`, `403`, `404`, `500` |
| `cie10-ai-search`     | `POST`, `OPTIONS` | Bearer Firebase | roles clínicos generales                                                   | `AI_PROVIDER`, provider keys                    | `400`, `401`, `403`, `500`        |
| `whatsapp-proxy`      | `POST`, `OPTIONS` | según handler   | roles permitidos por handler                                               | credenciales proxy externas                     | `400`, `401`, `403`, `500`        |

## Reglas de contrato

- Toda Function sensible debe validar `Origin`.
- Toda Function sensible debe validar método HTTP.
- Toda Function sensible debe parsear JSON con helper compartido.
- Toda Function sensible debe responder con envelope consistente por runtime.
- Ninguna Function Netlify debe depender de `firebase-functions/v1`.
