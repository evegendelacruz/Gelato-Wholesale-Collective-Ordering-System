/**
 * BarTender Image-Based Label Printing
 *
 * This module generates labels as high-quality images and packages them
 * into a multi-page PDF that BarTender (or any PDF viewer) can print directly.
 *
 * WORKFLOW:
 * 1. Click "Print All Labels" button
 * 2. System generates all labels as images
 * 3. Creates single multi-page PDF (one label per page)
 * 4. Downloads PDF
 * 5. Open in BarTender → Print All
 *
 * Each page is exactly 90mm x 50mm at 300 DPI
 */

export interface LabelImageData {
  companyName: string;
  productName: string;
  ingredients?: string;
  allergen: string;
  bestBefore: string;
  batchNumber: string;
}

/**
 * Generate a single label as a canvas at 300 DPI
 */
export async function generateLabelCanvas(
  data: LabelImageData,
  halalImageBase64: string
): Promise<HTMLCanvasElement> {
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

      resolve(canvas);
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
 * Generate multi-page PDF with all labels as images
 * Ready to open in BarTender and print all at once
 */
export async function generateMultiPageLabelPDF(
  labels: LabelImageData[],
  halalImageBase64: string,
  filename: string
): Promise<Blob> {
  // Dynamically import jsPDF
  const { default: jsPDF } = await import('jspdf');

  // Create PDF with exact label dimensions
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [90, 50]
  });

  let isFirstPage = true;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];

    // Generate canvas for this label
    const canvas = await generateLabelCanvas(label, halalImageBase64);

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    // Add page (except for first)
    if (!isFirstPage) {
      doc.addPage([90, 50], 'landscape');
    }
    isFirstPage = false;

    // Add image to fill entire page
    doc.addImage(imgData, 'JPEG', 0, 0, 90, 50, undefined, 'FAST');
  }

  return doc.output('blob');
}

/**
 * Download multi-page PDF ready for BarTender
 */
export async function downloadBartenderReadyPDF(
  labels: LabelImageData[],
  halalImageBase64: string,
  filename: string
): Promise<void> {
  try {
    const pdfBlob = await generateMultiPageLabelPDF(labels, halalImageBase64, filename);

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_BartenderReady.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating BarTender-ready PDF:', error);
    throw error;
  }
}
