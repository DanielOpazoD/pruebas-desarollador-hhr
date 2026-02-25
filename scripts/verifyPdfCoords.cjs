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
    const FZ = 12;

    const draw = (text, x, y, bold = false) => {
        page.drawText(text.toUpperCase(), { x, y, size: FZ, font: bold ? fontBold : font, color: RED });
    };

    // Coordinates v4 (2026-02-24) — all Y normalized per row

    // #4 NOMBRE (Y=826.52)
    draw('Opazo', 50.84, 826.52);
    draw('Damiani', 237.8, 826.52);
    draw('Daniel', 441.64, 826.52);
    // #52 NOMBRE SOCIAL
    draw('Danny', 114.24, 804.28);
    // #5 TIPO ID + RUN
    draw('1', 111.31, 782.21);
    draw('12.345.678-9', 56.99, 759.19);
    // #6 SEXO REGISTRAL
    draw('M', 305.82, 781.46, true);
    // #7 FECHA NAC (Y=800.54)
    draw('15', 450.35, 800.54);
    draw('03', 489.42, 800.54);
    draw('1990', 524.05, 800.54);
    // #8 EDAD
    draw('35', 79, 722.06);
    draw('1', 181.04, 720.09);
    // #10 PUEBLO INDÍGENA (3=Rapa Nui)
    draw('3', 523.86, 750.12);
    // #18 PREVISIÓN
    draw('1', 54.37, 516.73);
    // #22 PROCEDENCIA
    draw('1', 225.78, 471.36);

    // #24 INGRESO (Y=428.74)
    draw('08', 102.35, 428.74);
    draw('30', 136.36, 428.74);
    draw('22', 181.71, 428.74);
    draw('02', 215.73, 428.74);
    draw('2025', 249.74, 428.74);

    // #29 EGRESO (Y=341.43)
    draw('14', 91.68, 341.43);
    draw('00', 124.35, 341.43);
    draw('25', 169.03, 341.43);
    draw('02', 204.39, 341.43);
    draw('2025', 238.4, 341.43);

    // #30 DÍAS ESTADA (Y=326.75)
    draw('3', 103.69, 326.75);
    // #31 CONDICIÓN (Y=326.75)
    draw('1', 250.41, 326.75);

    // #33 DIAGNÓSTICO + CIE-10
    draw('Diabetes Mellitus Tipo 2, No Insulinodependiente', 167.08, 280.72);
    draw('E11.9', 529.23, 281.38, true);

    // #50 ESPECIALIDAD
    draw('Medicina Interna', 327.77, 76.61);

    const result = await pdfDoc.save();
    fs.writeFileSync(path.join(__dirname, '..', 'docs', 'ieeh-test.pdf'), result);
    console.log('✅ Test PDF — 12pt, UPPERCASE, coords v4, Rapa Nui=3');
}

verify().catch(console.error);
