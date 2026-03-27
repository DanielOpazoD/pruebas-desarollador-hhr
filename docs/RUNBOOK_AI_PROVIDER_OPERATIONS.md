# Runbook AI Provider Operations

## Objetivo

Operar y diagnosticar los providers AI usados por búsqueda CIE-10 y resumen clínico.

## Endpoints sensibles

- `netlify/functions/cie10-ai-search.ts`
- `netlify/functions/clinical-ai-summary.ts`

## Variables soportadas

- `AI_PROVIDER=gemini|openai|anthropic`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_MODEL`
- `OPENAI_MODEL`
- `ANTHROPIC_MODEL`

## Política de resolución

1. Si `AI_PROVIDER` está definido, usar ese provider.
2. Si no está definido, usar el primer provider configurado.
3. Si no hay claves, responder como `AI not configured`.

## Checklist operativo

1. Confirmar provider activo y clave presente.
2. Verificar que el usuario tenga rol permitido para el endpoint.
3. Revisar si el fallo proviene de auth, contexto clínico o provider externo.
4. Si falla solo Netlify, correr `npm run check:netlify-functions-bundle`.

## Fallos típicos

- `401`: falta `Authorization: Bearer`.
- `403`: rol sin acceso.
- `404`: contexto clínico/paciente no encontrado.
- `500`: provider AI o configuración inválida.

## Comandos

```bash
npm run test:risk:platform
npm run report:serverless-runtime-governance
npm run check:serverless-runtime-governance
```
