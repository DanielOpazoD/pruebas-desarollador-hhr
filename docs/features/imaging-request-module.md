# Módulo de Solicitud de Imágenes y Encuesta de Contraste

Este módulo permite la generación interactiva y automatizada de documentos legales para el área de imagenología.

## Características Principales

1. **Visor Interactivo**: Permite previsualizar el documento sobre un lienzo (canvas) que respeta las proporciones reales del PDF.
2. **Herramientas de Anotación**:
   - **Cruces (X)**: Permite marcar casilleros del PDF haciendo clic directamente en el visor.
   - **Texto Libre**: Permite ingresar texto en cualquier posición del documento.
3. **Inyección Automática de Datos**: El sistema extrae y posiciona automáticamente los siguientes datos del paciente:
   - Nombre Completo (dividido en nombres y apellidos)
   - RUT
   - Edad (calculada automáticamente)
   - Fecha de Nacimiento
   - Diagnóstico / Patología
   - Fecha de Solicitud
   - Médico Tratante
4. **Impresión Directa**: Genera un PDF modificado con un script de auto-impresión incrustado.

## Estructura Técnica

### 1. Servicio de Generación (`imagingRequestPdfService.ts`)

Utiliza `pdf-lib` para manipular los archivos base ubicados en `/public/docs/`.

- **Coordenadas**: Utiliza un mapeo de coordenadas fijas (puntos PDF estándar) para posicionar los datos automáticos.
- **Herramientas**: Implementa la lógica para dibujar texto y cruces basadas en coordenadas porcentuales (0-100) provenientes del frontend.

### 2. Componente de UI (`ImagingRequestDialog.tsx`)

Basado en un sistema de pestañas para alternar entre "Solicitud de Imagenología" y "Encuesta Medio Contraste".

- **Lienzo Adaptativo**: Utiliza la propiedad CSS `aspect-ratio` (612/936 para Solicitud, 612/792 para Encuesta) para asegurar que el PNG de fondo coincida perfectamente con el PDF final.
- **Estado Local**: Gestiona una lista de `marks` (anotaciones) mediante un estado de React, permitiendo deshacer cambios.

## Mapeo de Coordenadas

Los campos automáticos se posicionan siguiendo estos archivos de configuración (en formato JSON):

- `pdffieldencuestacontraste.json`: Coordenadas para la Encuesta.
- `pdf-fields.json`: Coordenadas para la Solicitud.

## Solución de Problemas (FAQ)

### ¿Por qué los nombres aparecen en orden incorrecto?

Se ha implementado un analizador inteligente (`splitPatientName`) que asume el formato estándar `Nombre(s) ApellidoPaterno ApellidoMaterno`. Si un paciente tiene más de 3 palabras en su nombre, asume que las últimas dos son los apellidos.

### El PDF no se imprime automáticamente

El comando de impresión automática utiliza JavaScript embebido en el PDF. Algunos navegadores o visores externos pueden bloquear esta funcionalidad por seguridad. En ese caso, el archivo se descargará automáticamente.
