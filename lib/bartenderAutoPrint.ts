/**
 * BarTender Auto-Print - TRUE One-Click Solution
 *
 * Generates a multi-page PDF with auto-print enabled.
 * When opened, it automatically triggers the print dialog.
 * Uses EXACT same layout as the existing PDF generation.
 */

export interface AutoPrintLabelData {
  companyName: string;
  productName: string;
  ingredients?: string;
  allergen: string;
  bestBefore: string;
  batchNumber: string;
}

/**
 * Generate auto-printing PDF with all labels
 * Uses exact same layout as existing PDF generation
 */
export async function generateAutoPrintPDF(
  orderItems: any[],
  editableData: any[],
  clientData: any,
  calculateBestBefore: (date: any) => string,
  getHalalImageBase64: () => Promise<string>,
  showIngredients: boolean = false
): Promise<void> {
  try {
    const jsPDF = (await import('jspdf')).default;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [90, 50]
    });

    // Load fonts (exact same as existing PDF code)
    let fontsLoaded = false;
    try {
      const fontBaseUrl = window.location.origin;

      const [arialNarrowResponse, arialNarrowBoldResponse, arialResponse, arialBoldResponse] = await Promise.all([
        fetch(`${fontBaseUrl}/assets/ARIALN.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIALNB.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIAL.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIALBD.ttf`)
      ]);

      if (arialNarrowResponse.ok && arialNarrowBoldResponse.ok && arialResponse.ok && arialBoldResponse.ok) {
        const [arialNarrowArrayBuffer, arialNarrowBoldArrayBuffer, arialArrayBuffer, arialBoldArrayBuffer] = await Promise.all([
          arialNarrowResponse.arrayBuffer(),
          arialNarrowBoldResponse.arrayBuffer(),
          arialResponse.arrayBuffer(),
          arialBoldResponse.arrayBuffer()
        ]);

        const arialNarrowBase64 = btoa(
          new Uint8Array(arialNarrowArrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const arialNarrowBoldBase64 = btoa(
          new Uint8Array(arialNarrowBoldArrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const arialBase64 = btoa(
          new Uint8Array(arialArrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const arialBoldBase64 = btoa(
          new Uint8Array(arialBoldArrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        doc.addFileToVFS('ARIALN.ttf', arialNarrowBase64);
        doc.addFileToVFS('ARIALNB.ttf', arialNarrowBoldBase64);
        doc.addFileToVFS('ARIAL.ttf', arialBase64);
        doc.addFileToVFS('ARIALBD.ttf', arialBoldBase64);

        doc.addFont('ARIALN.ttf', 'ArialNarrow', 'normal');
        doc.addFont('ARIALNB.ttf', 'ArialNarrow', 'bold');
        doc.addFont('ARIAL.ttf', 'Arial', 'normal');
        doc.addFont('ARIALBD.ttf', 'Arial', 'bold');

        doc.setFont('ArialNarrow', 'normal');
        fontsLoaded = true;
      }
    } catch (fontError) {
      console.warn('Failed to load custom fonts, using helvetica fallback:', fontError);
    }

    if (!fontsLoaded) {
      doc.setFont('helvetica', 'normal');
    }

    let isFirstPage = true;
    const halalBase64 = await getHalalImageBase64();

    // Generate labels (EXACT same code as existing PDF generation)
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const quantity = item.quantity || 1;

      for (let q = 0; q < quantity; q++) {
        if (!isFirstPage) {
          doc.addPage([90, 50], 'landscape');
        }
        isFirstPage = false;

        const data = editableData[i] || {
          companyName: clientData?.client_businessName || 'Company Name',
          productName: item.product_name || 'Product Name',
          ingredients: item.ingredients || 'Ingredients not available',
          allergen: item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
          bestBefore: calculateBestBefore(item.order_date || new Date()),
          batchNumber: ''
        };

        // Use loaded font or fallback
        if (fontsLoaded) {
          doc.setFont('ArialNarrow', 'normal');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const marginLeft = 5.5;
        const marginTop = 8.5;
        const leftSectionWidth = 47;
        const rightSectionX = leftSectionWidth + 2;

        let leftY = marginTop;

        // Company Name
        doc.setFontSize(11);
        doc.setFont(fontsLoaded ? 'ArialNarrow' : 'helvetica', 'normal');
        doc.text(data.companyName, marginLeft, leftY);
        leftY += showIngredients ? 5 : 12;

        // Product Name (Bold)
        doc.setFontSize(8);
        doc.setFont(fontsLoaded ? 'ArialNarrow' : 'helvetica', 'bold');
        const productLines = doc.splitTextToSize(data.productName, 43);
        productLines.slice(0, 3).forEach((line: string) => {
          doc.text(line, marginLeft, leftY);
          leftY += 4;
        });
        leftY += 0;

        // INGREDIENTS section (only for orderLabel)
        if (showIngredients) {
          doc.setFontSize(4.5);
          doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'bold');
          doc.text('INGREDIENTS:', marginLeft, leftY);
          leftY += 1;

          // Underline for INGREDIENTS
          doc.getTextWidth('INGREDIENTS:');
          doc.setLineWidth(0.2);
          doc.line(marginLeft, leftY + 0.5, marginLeft + 40, leftY + 0.5);
          leftY += 3;

          // Ingredients text (normal)
          doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
          doc.setFontSize(4.5);
          const ingredientsLines = doc.splitTextToSize(data.ingredients, 38);
          ingredientsLines.slice(0, 3).forEach((line: string) => {
            doc.text(line, marginLeft, leftY);
            leftY += 2;
          });
        }

        const storageFixedY = 43;

        doc.setFontSize(4.5);
        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'bold');

        const allergenLines = doc.splitTextToSize(data.allergen, 32);
        const allergenTextHeight = allergenLines.length * 2;

        const allergenContentEndY = storageFixedY - 1;
        const allergenContentStartY = allergenContentEndY - allergenTextHeight;
        const allergensLabelY = allergenContentStartY - 2.5;

        if (showIngredients) {
          doc.text('ALLERGENS:', marginLeft, allergensLabelY);
        }

        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        let allergenY = allergenContentStartY;
        allergenLines.forEach((line: string) => {
          doc.text(line, marginLeft, allergenY);
          allergenY += 2;
        });

        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        const storageText = 'Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.';
        const storageLines = doc.splitTextToSize(storageText, 28);
        let storageY = storageFixedY;
        storageLines.forEach((line: string) => {
          doc.text(line, marginLeft, storageY);
          storageY += 2;
        });

        // Halal Logo
        if (halalBase64) {
          const logoSize = 13;
          const logoX = marginLeft + 28.5;
          const logoY = 32.8;
          doc.addImage(halalBase64, 'PNG', logoX, logoY, logoSize, logoSize);
        }

        // RIGHT SECTION
        let rightY = marginTop + 4.5;
        const rightX = rightSectionX;

        doc.setFontSize(5);
        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        doc.text('Best Before (dd/mm/yyyy)', rightX, rightY);
        rightY += 4;

        doc.setFontSize(8);
        doc.setFont(fontsLoaded ? 'ArialNarrow' : 'helvetica', 'bold');
        const bestBeforeText = (data.bestBefore || '').trim();
        const bestBeforeWidth = doc.getTextWidth(bestBeforeText);
        const fontSize = 8;

        doc.setFillColor(0, 0, 0);
        doc.rect(
          rightX,
          rightY - (fontSize * 0.283),
          bestBeforeWidth,
          fontSize * 0.353,
          'F'
        );

        doc.setTextColor(255, 255, 255);
        doc.text(bestBeforeText, rightX, rightY);
        doc.setTextColor(0, 0, 0);
        rightY += 6;

        doc.setFontSize(5);
        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        doc.text('Batch Number', rightX, rightY);
        rightY += 4;

        doc.setFontSize(8);
        doc.setFont(fontsLoaded ? 'ArialNarrow' : 'helvetica', 'bold');
        const batchNumberText = (data.batchNumber || '').trim();
        const batchWidth = doc.getTextWidth(batchNumberText);

        doc.setFillColor(0, 0, 0);
        doc.rect(
          rightX,
          rightY - (fontSize * 0.283),
          batchWidth,
          fontSize * 0.353,
          'F'
        );

        doc.setTextColor(255, 255, 255);
        doc.text(batchNumberText, rightX, rightY);
        doc.setTextColor(0, 0, 0);

        // Manufacturer Info
        doc.setFontSize(5);
        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        const mfgY = 36;
        const lineSpacing = 2.2;

        const mfgLines = [
          'Manufactured by:',
          'Momolato Pte Ltd',
          '21 Tampines St 92 #04-06',
          'Singapore 528891',
          'UEN: 201319550R'
        ];

        mfgLines.forEach((line, idx) => {
          doc.text(line, rightX, mfgY + (idx * lineSpacing));
        });
      }
    }

    // Enable auto-print
    doc.autoPrint();

    // Generate blob and open in new window (triggers print automatically)
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open in new window - will auto-trigger print dialog
    window.open(blobUrl, '_blank');

    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    console.error('Error generating auto-print PDF:', error);
    throw error;
  }
}
