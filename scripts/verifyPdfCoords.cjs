const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function verify() {
    const bytes = fs.readFileSync(path.join(__dirname, '..', 'docs', 'estadistico-egreso.pdf'));
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPage(0);
    const RED = rgb(1, 0, 0);

    const FZ = 9;

    const draw = (text, x, y, size = FZ, bold = false) => {
        page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: RED });
    };

    // Coordinates extracted via PDF field mapping tool (2026-02-23)

    // #4 NOMBRE
    draw('OPAZO', 57.49, 825.64);
    draw('DAMIANI', 249.13, 824.9);
    draw('DANIEL', 456.99, 824.9);
    // #52 NOMBRE SOCIAL
    draw('Danny', 114.25, 805);
    // #5 TIPO ID + RUN
    draw('1', 111.3, 782.16);
    draw('12.345.678-9', 59.7, 757.84);
    // #6 SEXO REGISTRAL
    draw('M', 305.15, 779.95, FZ, true);
    // #7 FECHA NAC
    draw('15', 450.36, 799.84);
    draw('03', 489.42, 799.11);
    draw('1990', 524.07, 799.11);
    // #8 EDAD
    draw('35', 79.7, 721.41);
    draw('1', 181.07, 720.07);
    // #10 PUEBLO INDÍGENA
    draw('3', 523.87, 750.08);
    // #18 PREVISIÓN
    draw('1', 54.35, 516.72);
    // #22 PROCEDENCIA
    draw('1', 225.75, 471.38);

    // #24 INGRESO
    draw('08', 102.37, 426.71);
    draw('30', 136.39, 426.04);
    draw('22', 181.07, 426.04);
    draw('02', 215.08, 427.38);
    draw('2025', 249.76, 426.71);

    // #29 EGRESO
    draw('14', 92.37, 340.04);
    draw('00', 125.05, 340.7);
    draw('25', 170.4, 339.37);
    draw('02', 205.08, 339.37);
    draw('2025', 238.43, 338.7);

    // #30 DÍAS ESTADA
    draw('3', 104.37, 326.03);

    // #31 CONDICIÓN
    draw('1', 250.43, 327.37);

    // #33 DIAGNÓSTICO + CIE-10
    draw('DIABETES MELLITUS TIPO 2, NO INSULINODEPENDIENTE', 167.06, 280.7, 7);
    draw('E11.9', 529.2, 281.36, FZ, true);

    // #50 ESPECIALIDAD
    draw('MEDICINA INTERNA', 327.79, 76.01);

    const result = await pdfDoc.save();
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'ieeh-test.pdf'), result);
    console.log('✅ Test PDF generated with precise tool-extracted coordinates');
}

verify().catch(console.error);
