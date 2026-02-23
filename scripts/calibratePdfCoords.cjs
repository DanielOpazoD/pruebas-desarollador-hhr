/**
 * Grid denso de calibración para el PDF IEEH
 * Genera una cuadrícula cada 25pt con etiquetas para leer coordenadas exactas
 * 
 * Uso: node scripts/calibratePdfCoords.cjs
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function calibrate() {
    const templatePath = path.join(__dirname, '..', 'docs', 'estadistico-egreso.pdf');
    const bytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(bytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    console.log(`Page: ${width.toFixed(1)} x ${height.toFixed(1)} pts`);

    const GRID = rgb(0.7, 0.85, 1.0);   // Light blue
    const GRID_MAJOR = rgb(0.4, 0.6, 0.9); // Darker blue every 100pt
    const LABEL = rgb(1, 0, 0);          // Red labels

    // Draw grid every 25pt
    for (let y = 0; y <= height; y += 25) {
        const isMajor = y % 100 === 0;
        page.drawLine({
            start: { x: 0, y },
            end: { x: width, y },
            thickness: isMajor ? 0.5 : 0.2,
            color: isMajor ? GRID_MAJOR : GRID,
        });
        // Label Y on left margin
        page.drawText(`${y}`, {
            x: 2,
            y: y + 1,
            size: isMajor ? 6 : 4,
            font,
            color: LABEL,
        });
    }

    for (let x = 0; x <= width; x += 25) {
        const isMajor = x % 100 === 0;
        page.drawLine({
            start: { x, y: 0 },
            end: { x, y: height },
            thickness: isMajor ? 0.5 : 0.2,
            color: isMajor ? GRID_MAJOR : GRID,
        });
        // Label X on bottom
        if (x % 50 === 0) {
            page.drawText(`${x}`, {
                x: x + 1,
                y: 2,
                size: isMajor ? 6 : 4,
                font,
                color: LABEL,
            });
        }
    }

    const outPath = path.join(__dirname, '..', 'docs', 'ieeh-grid.pdf');
    const result = await pdfDoc.save();
    fs.writeFileSync(outPath, result);
    console.log(`✅ Grid PDF: ${outPath}`);
}

calibrate().catch(console.error);
