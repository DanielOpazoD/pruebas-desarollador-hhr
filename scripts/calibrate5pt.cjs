const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function calibrate5pt() {
    const templatePath = path.join(__dirname, '..', 'docs', 'estadistico-egreso.pdf');
    const bytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(bytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();
    console.log(`Page: ${width.toFixed(1)} x ${height.toFixed(1)} pts`);

    const GRID_5 = rgb(0.85, 0.95, 0.85);   // pale green for 5pt
    const GRID_25 = rgb(0.4, 0.6, 0.9);     // blue for 25pt
    const GRID_50 = rgb(1, 0, 0);           // red for 50pt
    const LABEL = rgb(0, 0, 0);             // black labels

    // Draw horizontal lines
    for (let y = 0; y <= height; y += 5) {
        const is50 = y % 50 === 0;
        const is25 = y % 25 === 0;

        page.drawLine({
            start: { x: 0, y },
            end: { x: width, y },
            thickness: is50 ? 0.5 : (is25 ? 0.3 : 0.1),
            color: is50 ? GRID_50 : (is25 ? GRID_25 : GRID_5),
        });

        // Label Y on left and right margins for 25s and 50s
        if (is50 || is25) {
            page.drawText(`${y}`, {
                x: 2,
                y: y + 1,
                size: is50 ? 5 : 4,
                font,
                color: is50 ? GRID_50 : GRID_25,
            });
            page.drawText(`${y}`, {
                x: width - 15,
                y: y + 1,
                size: is50 ? 5 : 4,
                font,
                color: is50 ? GRID_50 : GRID_25,
            });
        }
    }

    // Draw vertical lines
    for (let x = 0; x <= width; x += 5) {
        const is50 = x % 50 === 0;
        const is25 = x % 25 === 0;

        page.drawLine({
            start: { x, y: 0 },
            end: { x, y: height },
            thickness: is50 ? 0.5 : (is25 ? 0.3 : 0.1),
            color: is50 ? GRID_50 : (is25 ? GRID_25 : GRID_5),
        });

        // Label X on bottom and middle
        if (is50 || is25) {
            page.drawText(`${x}`, {
                x: x + 1,
                y: 2,
                size: is50 ? 5 : 4,
                font,
                color: is50 ? GRID_50 : GRID_25,
            });
            page.drawText(`${x}`, {
                x: x + 1,
                y: height / 2, // Also put measurements in the middle of page
                size: is50 ? 5 : 4,
                font,
                color: is50 ? GRID_50 : GRID_25,
            });
        }
    }

    const outPath = path.join(__dirname, '..', 'docs', 'ieeh-grid-5pt.pdf');
    const result = await pdfDoc.save();
    fs.writeFileSync(outPath, result);
    console.log(`✅ Ultra-fine 5pt Grid PDF created: ${outPath}`);
}

calibrate5pt().catch(console.error);
