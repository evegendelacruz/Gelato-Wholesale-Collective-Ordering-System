/**
 * BarTender Batch Print Solution
 *
 * Creates individual image files (one per label) that BarTender can batch print.
 * Also generates a BarTender Commander script for automated printing.
 */

import JSZip from 'jszip';

export interface BatchLabelData {
  companyName: string;
  productName: string;
  ingredients?: string;
  allergen: string;
  bestBefore: string;
  batchNumber: string;
}

/**
 * Generate a single label as a blob
 */
async function generateLabelImageBlob(
  data: BatchLabelData,
  halalImageBase64: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Set canvas size (90mm x 50mm at 300 DPI)
    const dpi = 300;
    const mmToPx = dpi / 25.4;
    const width = Math.round(90 * mmToPx);
    const height = Math.round(50 * mmToPx);

    canvas.width = width;
    canvas.height = height;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Margins
    const marginLeft = Math.round(5 * mmToPx);
    const marginTop = Math.round(5 * mmToPx);
    const marginBottom = Math.round(5 * mmToPx);
    const leftSectionWidth = Math.round(45 * mmToPx);
    const rightSectionX = leftSectionWidth;

    // Font sizes
    const companyFontSize = Math.round(12 * (dpi/96));
    const productFontSize = Math.round(10 * (dpi/96));
    const ingredientsFontSize = Math.round(6 * (dpi/96));
    const storageFontSize = Math.round(6 * (dpi/96));
    const rightSectionFontSize = Math.round(7 * (dpi/96));
    const manufacturerFontSize = Math.round(7 * (dpi/96));

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontFamily = 'Arial', isBold = false) => {
      ctx!.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        const metrics = ctx!.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    // LEFT SECTION
    let leftY = marginTop;
    const leftMaxWidth = leftSectionWidth - marginLeft - Math.round(5 * mmToPx);
    const adjustedMaxWidth = leftMaxWidth * 1.1;

    // Company Name
    ctx.font = `${companyFontSize}px Arial Narrow, Arial`;
    ctx.fillText(data.companyName, marginLeft, leftY);
    leftY += Math.round(12 * mmToPx);

    // Product Name (Bold)
    const productLines = wrapText(data.productName, adjustedMaxWidth, productFontSize, 'Arial Narrow, Arial', true);
    ctx.font = `bold ${productFontSize}px Arial Narrow, Arial`;
    for (let i = 0; i < Math.min(productLines.length, 10); i++) {
      ctx.fillText(productLines[i], marginLeft, leftY);
      leftY += Math.round(3.2 * mmToPx);
    }
    leftY += Math.round(2.2 * mmToPx);

    // Ingredients (if provided)
    if (data.ingredients) {
      leftY -= Math.round(2 * mmToPx);
      ctx.font = `bold ${ingredientsFontSize}px Arial`;
      ctx.fillText('INGREDIENTS:', marginLeft, leftY);
      const ingredientsLabelWidth = ctx.measureText('INGREDIENTS:').width;
      leftY += Math.round(3 * mmToPx);

      // Underline
      ctx.fillRect(marginLeft, leftY - Math.round(0.7 * mmToPx), ingredientsLabelWidth + Math.round(27 * mmToPx), Math.round(0.2 * mmToPx));
      leftY += Math.round(1 * mmToPx);

      // Ingredients text
      const ingredientsMaxWidth = leftMaxWidth + Math.round(1 * mmToPx);
      const ingredientsLines = wrapText(data.ingredients, ingredientsMaxWidth, ingredientsFontSize, 'Arial');
      ctx.font = `${ingredientsFontSize}px Arial`;
      const maxIngredientsLines = 3;
      for (let i = 0; i < Math.min(ingredientsLines.length, maxIngredientsLines); i++) {
        ctx.fillText(ingredientsLines[i], marginLeft, leftY);
        leftY += Math.round(2 * mmToPx);
      }
      leftY += Math.round(1 * mmToPx);
    }

    // Allergens section
    ctx.font = `${storageFontSize}px Arial`;
    const storageMaxWidth = leftMaxWidth + Math.round(3 * mmToPx);
    const storageMaxWidthReduced = storageMaxWidth - Math.round(8 * mmToPx);

    // Storage instructions
    const storageText = 'Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.';
    const storageLines = wrapText(storageText, storageMaxWidthReduced, storageFontSize, 'Arial');

    // Allergen lines
    ctx.font = `normal ${storageFontSize}px Arial`;
    const allergenLines = wrapText(data.allergen, storageMaxWidthReduced, storageFontSize, 'Arial');
    const allergenHeight = allergenLines.length * Math.round(2.3 * mmToPx);
    const allergenLabelHeight = Math.round(3 * mmToPx);
    const gapBetweenSections = Math.round(1 * mmToPx);

    // Storage at bottom
    const storageY = height - marginBottom - Math.round(3.5 * mmToPx);
    storageLines.forEach((line, idx) => {
      if (idx < 3) {
        ctx.fillText(line, marginLeft, storageY + (idx * Math.round(2.3 * mmToPx)));
      }
    });

    // Allergens above storage
    const allergenStartY = storageY - gapBetweenSections - allergenHeight - allergenLabelHeight;
    ctx.font = `bold ${storageFontSize}px Arial`;
    ctx.fillText('ALLERGENS:', marginLeft, allergenStartY);
    ctx.font = `normal ${storageFontSize}px Arial`;
    const allergenY = allergenStartY + allergenLabelHeight;
    allergenLines.forEach((line, idx) => {
      ctx.fillText(line, marginLeft, allergenY + (idx * Math.round(2.3 * mmToPx)));
    });

    const finalizeCanvas = (halalImage: HTMLImageElement | null) => {
      // RIGHT SECTION
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';

      let rightY = marginTop + Math.round(6 * mmToPx);
      const rightX = rightSectionX + Math.round(3.4 * mmToPx);

      // Best Before label
      ctx.font = `${rightSectionFontSize}px Arial`;
      ctx.fillText('Best Before (dd/mm/yyyy)', rightX, rightY);
      rightY += Math.round(2 * mmToPx);

      // Best Before value (white on black)
      ctx.font = `bold ${Math.round(10 * (dpi/96))}px Arial Narrow`;
      const bestBeforeText = (data.bestBefore || '').trim();
      const bestBeforeMetrics = ctx.measureText(bestBeforeText);
      const bestBeforeHeight = Math.round(3.5 * mmToPx);

      ctx.fillStyle = '#000000';
      ctx.fillRect(rightX, rightY, bestBeforeMetrics.width, bestBeforeHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(bestBeforeText, rightX, rightY);
      rightY += Math.round(3 * mmToPx);
      rightY += Math.round(3 * mmToPx);

      // Batch Number label
      ctx.fillStyle = '#000000';
      ctx.font = `${rightSectionFontSize}px Arial`;
      ctx.fillText('Batch Number', rightX, rightY);
      rightY += Math.round(2 * mmToPx);

      // Batch Number value (white on black)
      ctx.font = `bold ${Math.round(10 * (dpi/96))}px Arial Narrow`;
      const batchNumberText = (data.batchNumber || '').trim();
      const batchMetrics = ctx.measureText(batchNumberText);
      const batchHeight = Math.round(3.5 * mmToPx);

      ctx.fillStyle = '#000000';
      ctx.fillRect(rightX, rightY, batchMetrics.width, batchHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(batchNumberText, rightX, rightY);

      // Halal Logo
      const logoSize = Math.round(13.5 * mmToPx);
      const logoX = marginLeft + leftMaxWidth - logoSize - Math.round(-8 * mmToPx);
      const logoY = height - marginBottom - Math.round(12 * mmToPx);

      if (halalImage) {
        ctx.drawImage(halalImage, logoX, logoY, logoSize, logoSize);
      }

      // Manufacturer Info
      ctx.fillStyle = '#000000';
      ctx.font = `${manufacturerFontSize}px Arial`;
      const mfgY = height - marginBottom - Math.round(11 * mmToPx);
      const lineSpacing = Math.round(2.3 * mmToPx);

      const mfgLines = [
        'Manufactured by:',
        'Momolato Pte Ltd',
        '21 Tampines St 92 #04-06',
        'Singapore 528891',
        'UEN: 201319550R'
      ];

      mfgLines.forEach((line, idx) => {
        ctx.fillText(line, rightX, mfgY + (idx * lineSpacing));
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png', 1.0);
    };

    // Load Halal logo
    if (halalImageBase64) {
      const halalImg = new Image();
      halalImg.onload = () => finalizeCanvas(halalImg);
      halalImg.onerror = () => finalizeCanvas(null);
      halalImg.src = halalImageBase64;
    } else {
      finalizeCanvas(null);
    }
  });
}

/**
 * Generate batch print package with individual images and print script
 */
export async function downloadBartenderBatchPrint(
  labels: BatchLabelData[],
  halalImageBase64: string,
  filename: string
): Promise<void> {
  try {
    const zip = new JSZip();
    const labelsFolder = zip.folder('Labels')!;

    // Generate individual image for each label
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const blob = await generateLabelImageBlob(label, halalImageBase64);
      const labelNumber = String(i + 1).padStart(4, '0');
      const sanitizedProduct = label.productName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      labelsFolder.file(`Label_${labelNumber}_${sanitizedProduct}.png`, blob);
    }

    // Create BarTender Commander script for batch printing
    const commanderScript = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<XMLScript Version="2.0">',
      '  <Command Name="Job1">',
      '    <!-- BarTender Commander Batch Print Script -->',
      '    <!-- This script will print all label images -->',
      '',
      ...labels.map((label, i) => {
        const labelNumber = String(i + 1).padStart(4, '0');
        const sanitizedProduct = label.productName.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        return [
          `    <Print Printer="Toshiba B-415">`,
          `      <Format>Labels\\Label_${labelNumber}_${sanitizedProduct}.png</Format>`,
          `      <RecordSet Name="Print" Type="btTextFile">`,
          `        <PrintSetup>`,
          `          <IdenticalCopiesOfLabel>1</IdenticalCopiesOfLabel>`,
          `        </PrintSetup>`,
          `      </RecordSet>`,
          `    </Print>`
        ].join('\n');
      }),
      '  </Command>',
      '</XMLScript>'
    ].join('\n');

    zip.file('BatchPrint.xml', commanderScript);

    // Create Windows batch file for easy printing
    const batchFile = [
      '@echo off',
      'echo ============================================',
      'echo   BarTender Batch Label Printing',
      'echo ============================================',
      'echo.',
      'echo Total Labels: ' + labels.length,
      'echo.',
      'echo INSTRUCTIONS:',
      'echo 1. Make sure BarTender is installed',
      'echo 2. Connect Toshiba B-415 printer',
      'echo 3. Load label stock (90mm x 50mm)',
      'echo 4. Press any key to start printing...',
      'echo.',
      'pause',
      'echo.',
      'echo Printing labels...',
      'echo.',
      '',
      ':: Method 1: Use BarTender Commander (if available)',
      'if exist "C:\\Program Files\\Seagull\\BarTender Suite\\bartend.exe" (',
      '    "C:\\Program Files\\Seagull\\BarTender Suite\\bartend.exe" /F=BatchPrint.xml /C',
      '    goto :success',
      ')',
      '',
      ':: Method 2: Open labels folder for manual printing',
      'echo BarTender Commander not found.',
      'echo Opening Labels folder...',
      'echo.',
      'echo MANUAL STEPS:',
      'echo 1. Open each PNG file in BarTender',
      'echo 2. File -^> Print',
      'echo 3. Set Copies = 1',
      'echo 4. Click Print',
      'echo.',
      'explorer Labels',
      'goto :end',
      '',
      ':success',
      'echo.',
      'echo ============================================',
      'echo   Printing Complete!',
      'echo ============================================',
      'echo All ' + labels.length + ' labels have been sent to printer.',
      'echo.',
      '',
      ':end',
      'pause'
    ].join('\r\n');

    zip.file('PRINT_LABELS.bat', batchFile);

    // Create instructions file
    const instructions = [
      '╔═══════════════════════════════════════════════════════════════╗',
      '║   BARTENDER BATCH PRINT - INSTRUCTIONS                       ║',
      '╚═══════════════════════════════════════════════════════════════╝',
      '',
      `📦 PACKAGE CONTENTS: ${labels.length} labels`,
      '══════════════════════════════════════════════════════════════',
      '',
      '📁 Labels/              - Individual label images (PNG format)',
      '📜 PRINT_LABELS.bat     - Automated print script (Windows)',
      '📄 BatchPrint.xml       - BarTender Commander script',
      '📋 HOW_TO_PRINT.txt     - This file',
      '',
      '',
      '🚀 METHOD 1: AUTOMATED PRINTING (EASIEST)',
      '══════════════════════════════════════════════════════════════',
      '',
      '1. Extract this ZIP to a folder',
      '2. Double-click: PRINT_LABELS.bat',
      '3. Follow on-screen instructions',
      '4. All labels print automatically!',
      '',
      '✅ This works if BarTender Commander is installed',
      '',
      '',
      '📁 METHOD 2: MANUAL PRINTING (IF METHOD 1 FAILS)',
      '══════════════════════════════════════════════════════════════',
      '',
      '1. Extract this ZIP',
      '2. Open "Labels" folder',
      '3. For EACH PNG file:',
      '   a. Right-click → Open With → BarTender',
      '   b. File → Print',
      '   c. Printer: Toshiba B-415',
      '   d. Copies: 1',
      '   e. Click Print',
      '',
      '⚠️  You need to print each file individually',
      '',
      '',
      '🖨️  METHOD 3: WINDOWS PHOTO VIEWER (QUICK)',
      '══════════════════════════════════════════════════════════════',
      '',
      '1. Extract this ZIP',
      '2. Open "Labels" folder',
      '3. Select ALL PNG files (Ctrl+A)',
      '4. Right-click → Print',
      '5. Select Toshiba B-415',
      '6. Paper Size: 90mm x 50mm',
      '7. Layout: Full page',
      '8. Print',
      '',
      '✅ Windows will print all files in sequence!',
      '',
      '',
      '⚙️  PRINTER SETTINGS',
      '══════════════════════════════════════════════════════════════',
      '',
      'Printer:      Toshiba B-415',
      'Paper Size:   90mm x 50mm',
      'Orientation:  Landscape',
      'Copies:       1 (per file)',
      'Quality:      Best/High',
      'Scaling:      100% (Actual Size)',
      '',
      '',
      '⚠️  IMPORTANT NOTES',
      '══════════════════════════════════════════════════════════════',
      '',
      '• Each PNG file = ONE label',
      `• Total files: ${labels.length} PNG files`,
      `• Total labels to print: ${labels.length}`,
      '• All labels are 90mm x 50mm at 300 DPI',
      '• No resizing needed - ready to print!',
      '',
      '',
      '🐛 TROUBLESHOOTING',
      '══════════════════════════════════════════════════════════════',
      '',
      'Q: Batch file doesn\'t work?',
      'A: Use Method 2 (manual) or Method 3 (Windows Photo Viewer)',
      '',
      'Q: Labels are wrong size?',
      'A: Check printer settings - must be 90mm x 50mm',
      '',
      'Q: Can I print from Adobe Reader?',
      'A: No - PNG files work better with BarTender/Photo Viewer',
      '',
      'Q: BarTender won\'t open PNG?',
      'A: File → Open → Select PNG → It will import as image',
      '',
      '',
      '✅ RECOMMENDED: Use Method 3 (Windows Photo Viewer)',
      '   It\'s the fastest way to print all labels at once!',
      '',
      '══════════════════════════════════════════════════════════════',
      '',
      'Generated: ' + new Date().toLocaleString(),
      `Filename: ${filename}`,
      `Total Labels: ${labels.length}`,
      'Label Size: 90mm × 50mm @ 300 DPI',
      'Format: PNG (Portable Network Graphics)',
      ''
    ].join('\r\n');

    zip.file('HOW_TO_PRINT.txt', instructions);

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_BatchPrint.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating batch print package:', error);
    throw error;
  }
}
