import { z } from 'zod';

export const IeehDataSchema = z.object({
  diagnosticoPrincipal: z.string().optional(),
  cie10Code: z.string().optional(),
  condicionEgreso: z.string().optional(),
  intervencionQuirurgica: z.string().optional(),
  intervencionQuirurgDescrip: z.string().optional(),
  procedimiento: z.string().optional(),
  procedimientoDescrip: z.string().optional(),
  tratanteApellido1: z.string().optional(),
  tratanteApellido2: z.string().optional(),
  tratanteNombre: z.string().optional(),
  tratanteRut: z.string().optional(),
});

console.warn(
  IeehDataSchema.safeParse({ diagnosticoPrincipal: 'Test', condicionEgreso: '2' }).success
);
console.warn(IeehDataSchema.safeParse({ diagnosticoPrincipal: '' }).success);
