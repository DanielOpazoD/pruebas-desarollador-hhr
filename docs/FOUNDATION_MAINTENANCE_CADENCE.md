# Foundation Maintenance Cadence

Cadencia operativa para sostener la convergencia estructural sin refactors masivos.

## Frecuencia

- Una vez por mes, o en la primera iteración disponible de cada release cycle.

## Cuota mínima por ciclo

1. Retirar al menos un shim, reexport transitorio o import legacy que ya no sea necesario.
2. Bajar un hotspot real: fan-in, deep import o seam ambigua.
3. Partir un megatest prioritario o reducir una suite que ya pasó el umbral de mantenimiento.
4. Regenerar reportes afectados y actualizar tracker/debt register.

## Orden de ejecución

1. Revisar `docs/FOUNDATION_TRACKER.md` y `docs/TECHNICAL_DEBT_REGISTER.md`.
2. Elegir solo `2-3` frentes pequeños de alto retorno.
3. Ejecutar cambios con boundaries y ownership explícitos.
4. Correr `check:repo-hygiene`, `lint`, `typecheck` y tests focalizados.
5. Regenerar `reports/quality-metrics.md` y `reports/technical-execution-baseline.md` si cambió la señal estructural.

## Señales que deben bajar con el tiempo

- imports profundos fuera de la API pública de features;
- imports a shims o aliases de compatibilidad;
- megatests de más de `500` líneas;
- drift entre ownership documentado y ownership real;
- fallos de `typecheck` por contratos antiguos no migrados.

## Regla de contención

- No abrir una nueva capa transitoria sin owner, fecha de salida y criterio de cierre.
- No introducir un shim nuevo si el cambio puede resolverse migrando consumers en la misma iteración.
- Si un guardrail necesita bypass, debe quedar anotado en `docs/TECHNICAL_DEBT_REGISTER.md`.
