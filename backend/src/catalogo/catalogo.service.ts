import { Injectable } from '@nestjs/common';
import PDFParser from 'pdf2json';

@Injectable()
export class CatalogoService {
  async procesarPdf(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (err: any) => {
        console.error('❌ Error parseando PDF:', err);
        reject(new Error('No se pudo procesar el archivo PDF'));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extraer todo el texto
          let textoCompleto = '';
          pdfData.Pages.forEach((page: any) => {
            page.Texts.forEach((textItem: any) => {
              textItem.R.forEach((r: any) => {
try { textoCompleto += decodeURIComponent(r.T) + ' '; } catch { textoCompleto += r.T + ' '; }              });
            });
            textoCompleto += '\n';
          });

          console.log('✅ PDF parseado OK, chars:', textoCompleto.length);
          console.log('📄 Primeras 500 chars:', textoCompleto.substring(0, 500));
console.log('📄 TEXTO COMPLETO PRIMERAS 2000 chars:\n', textoCompleto.substring(0, 2000));
          console.log('✅ PDF parseado OK, chars:', textoCompleto.length);

// El texto viene todo junto — separar por palabra clave de producto
const regex = /(MODULO|BATERIA|LCD|TACTIL)\s+([^$]+?)\s+\$([0-9.,]+(?:\.[0-9]{2})?)/g;const resultados: any[] = [];
let match;

while ((match = regex.exec(textoCompleto)) !== null) {
  const tipo = match[1];
  const nombreRaw = match[2].trim();
  const precioRaw = match[3];
const costo = parseFloat(precioRaw.replace(/,/g, ''));
  if (isNaN(costo) || costo <= 0) continue;
  if (nombreRaw.length < 3) continue;
  if (nombreRaw.includes('MINIMO') || nombreRaw.includes('TELEFONOS')) continue;

  const nombre = `${tipo} ${nombreRaw}`;

  let categoria = 'ESTANDAR';
  if (nombre.includes('OLED')) categoria = 'OLED';
  else if (nombre.includes('INCELL')) categoria = 'INCELL';
  else if (nombre.includes('GX')) categoria = 'GX';
  else if (nombre.includes('PANTALLA INFINITA') || nombre.includes('PANT INF')) categoria = 'PANTALLA INFINITA';

  const conMarco = nombre.includes('CON MARCO');
  resultados.push({ nombre, tipo, categoria, conMarco, costo });
}

console.log('✅ Productos encontrados:', resultados.length);
const porTipo = resultados.reduce((acc: any, r) => {
  acc[r.tipo] = (acc[r.tipo] || 0) + 1;
  return acc;
}, {});
console.log('📊 Por tipo:', porTipo);
console.log('📄 Últimas 1000 chars del texto:', textoCompleto.substring(textoCompleto.length - 1000));
resolve(resultados);

        } catch (error) {
          console.error('❌ Error procesando texto:', error);
          reject(new Error('No se pudo procesar el archivo PDF'));
        }
      });

      pdfParser.parseBuffer(buffer);
    });
  }
}