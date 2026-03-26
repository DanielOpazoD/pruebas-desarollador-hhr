# ADR: Protección De Estructura Del Workbook De Censo

## Estado

Aprobado

## Contexto

El Excel maestro del censo necesita dos capas distintas de protección:

- protección de hojas ocultas individuales;
- protección de estructura del workbook para impedir mostrar/ocultar hojas sin contraseña.

ExcelJS resuelve bien la protección de hojas, pero no expone una API para escribir `workbookProtection` en `xl/workbook.xml`.

## Decisión

Se mantiene ExcelJS como motor principal del workbook y se aplica un postproceso OOXML al final de la serialización:

- el workbook se escribe a `Uint8Array`;
- se abre como ZIP con `pizzip`;
- se modifica `xl/workbook.xml`;
- se inserta `<workbookProtection lockStructure="1" workbookPassword="..."/>`;
- el password usa el hash legado de estructura de workbook requerido por Excel.

La contraseña sigue fija en `HHR` para estructura y hojas ocultas.

## Consecuencias

### Positivas

- no cambia la fachada pública del exportador;
- descarga local, respaldo y correo comparten el mismo workbook protegido;
- la estructura del libro queda realmente bloqueada al abrir el archivo.

### Costos

- existe una segunda fase de serialización específica del censo;
- hay que mantener pruebas del XML generado;
- el hash legado de workbook debe seguir documentado y cubierto por tests.

## Guardrails

- toda serialización del censo debe pasar por `buildCensusMasterBinary` o `buildCensusMasterBuffer`;
- no se debe volver a usar `workbook.xlsx.writeBuffer()` directamente en flujos del censo;
- cualquier cambio de contraseña o política de protección debe reflejarse en pruebas del serializer y del workbook final.
