# `src/shared`

## Propósito

Utilidades y contratos transversales compartidos entre múltiples capas/features.

## Mapa

| Path                              | Propósito                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `contracts/*.ts`                  | Contratos transversales reales y helpers genéricos reutilizables entre features     |
| `access/*.ts`                     | Policies compartidas de acceso/capabilities                                         |
| `*/**/*Presentation*.ts`          | Helpers de presentación reutilizados por más de un módulo                           |
| `runtime/browserWindowRuntime.ts` | Adapter para efectos browser (`alert`, `confirm`, `open`, `reload`, `localStorage`) |
| `ui/anchoredOverlayTypes.ts`      | Tipos de overlays/posicionamiento reutilizables                                     |

## Patrón

- Runtime Adapter Pattern para reducir acoplamiento directo a APIs globales del navegador.
- `ApplicationOutcome` y sus helpers de mensaje viven en `shared/contracts/` porque los consumen `application`, `services`, `hooks`, `context` y features.
- `src/shared/` no es owner de tipos de dominio: si un tipo viene de entidad/payload estable, vive en `src/types/`.
- Los aliases históricos como `shared/census/patientContracts.ts` existen solo como compatibilidad y no deben recibir imports productivos nuevos.

## Ejemplo

```ts
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
defaultBrowserWindowRuntime.alert('Mensaje');
```
