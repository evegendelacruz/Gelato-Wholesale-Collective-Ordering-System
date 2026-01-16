'use client';
import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/client';
import {Check} from 'lucide-react';

const LabelGenerator = ({ orderItems, clientData, onUpdate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editableData, setEditableData] = useState([]);
  const [applyBestBeforeToAll, setApplyBestBeforeToAll] = useState(false);
  const [applyBatchNumberToAll, setApplyBatchNumberToAll] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Wrap getHalalImageBase64 in useCallback
  const getHalalImageBase64 = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = '/assets/halal.png';
    });
  }, []);

  const calculateBestBefore = useCallback((orderDate) => {
  const date = new Date(orderDate);
  // Add 1 day
  date.setDate(date.getDate() + 1);
  // Add 6 months
  date.setMonth(date.getMonth() + 6);
  
  // Format as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}, []);

const handlePrintLabels = async () => {
  try {
    setIsGenerating(true);
    
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [90, 50]
    });

    // Try to load fonts, but continue with fallback if they fail
    let fontsLoaded = false;
    try {
      // Use absolute URL paths for production
      const fontBaseUrl = window.location.origin;
      
      const [arialNarrowResponse, arialNarrowBoldResponse, arialResponse, arialBoldResponse] = await Promise.all([
        fetch(`${fontBaseUrl}/assets/ARIALN.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIALNB.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIAL.ttf`),
        fetch(`${fontBaseUrl}/assets/ARIALBD.ttf`)
      ]);

      // Check if all fetches were successful
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

    // Set fallback font if custom fonts failed to load
    if (!fontsLoaded) {
      doc.setFont('helvetica', 'normal');
    }

    let isFirstPage = true;
    const halalBase64 = await getHalalImageBase64();

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
        leftY += 5;

        // Product Name (Bold)
        doc.setFontSize(8);
        doc.setFont(fontsLoaded ? 'ArialNarrow' : 'helvetica', 'bold');
        const productLines = doc.splitTextToSize(data.productName, 43);
        productLines.slice(0, 3).forEach(line => {
          doc.text(line, marginLeft, leftY);
          leftY += 4;
        });
        leftY += 0;

        // INGREDIENTS section
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
        ingredientsLines.slice(0, 3).forEach(line => {
          doc.text(line, marginLeft, leftY);
          leftY += 2;
        });

        const storageFixedY = 43;

        doc.setFontSize(4.5);
        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'bold');

        const allergenLines = doc.splitTextToSize(data.allergen, 32);
        const allergenTextHeight = allergenLines.length * 2;

        const allergenContentEndY = storageFixedY - 1;
        const allergenContentStartY = allergenContentEndY - allergenTextHeight;
        const allergensLabelY = allergenContentStartY - 2.5;

        doc.text('ALLERGENS:', marginLeft, allergensLabelY);

        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        let allergenY = allergenContentStartY;
        allergenLines.forEach(line => {
          doc.text(line, marginLeft, allergenY);
          allergenY += 2;
        });

        doc.setFont(fontsLoaded ? 'Arial' : 'helvetica', 'normal');
        const storageText = 'Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.';
        const storageLines = doc.splitTextToSize(storageText, 32);
        let storageY = storageFixedY;
        storageLines.forEach(line => {
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

    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
    
    setIsGenerating(false);
  } catch (error) {
    console.error('Error generating PDF for print:', error);
    alert('Failed to open print preview. Error: ' + error.message);
    setIsGenerating(false);
  }
};

  const generatePreviewHTML = useCallback((items, halalImageSrc = '/assets/halal.png') => {
  const pages = items.map((item, index) => {
    const data = editableData[index] || {
      companyName: clientData?.client_businessName || 'Company Name',
      productName: item.product_name || 'Product Name',
      ingredients: item.ingredients || 'Ingredients not available',
      allergen: item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
      bestBefore: calculateBestBefore(item.order_date || new Date()),
      batchNumber: ''
    };
    
    const storageInfo = `Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.`;


    return `
      <div class="page" data-page="${index}">
        <div class="label-container">
          <div class="left-section">
            <div class="company-name">${data.companyName}</div>
            <div class="product-name">${data.productName}</div>
            <div class="ingredients-text">${data.ingredients}</div>
            <div class="allergen-text">${data.allergen}</div>
            <div class="storage-info">
              ${storageInfo}
            </div>
          </div>

          <div class="halal-logo">
              ${halalImageSrc ? `<img src="${halalImageSrc}" alt="Halal Logo" />` : ''}
          </div>
          
          <div class="right-section">
            <div class="field-label">Best Before (dd/mm/yyyy)</div>
            <div class="best-before-value">${(data.bestBefore || '').trim()}</div>
            <div class="field-label batch">Batch Number</div>
            <div class="batch-number-value">${(data.batchNumber || '').trim()}</div>
            
            <div class="manufacturer-info">
              Manufactured by:<br>
              Momolato Pte Ltd<br>
              21 Tampines St 92 #04-06<br>
              Singapore 528891<br>
              UEN: 201319550R
            </div>
          </div>
        </div>
        ${index < items.length - 1 ? '<div class="page-break"></div>' : ''}
      </div>`;
    }).join('\n');

      return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        body {
          background: #f5f5f5;
          padding: 20px;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
        }
        
        .page {
          width: 90mm;
          height: 50mm;
          background: white;
          margin: 0 auto 20px auto;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          page-break-after: always;
        }
        
        .label-container {
          width: 100%;
          height: 100%;
          display: flex;
          position: relative;
          padding: 4mm 8mm 5mm 5mm;
        }
        
        .left-section {
          width: 56mm;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
          padding-right: 10mm;
        }
        
        .right-section {
          flex: 1;
          margin-left: 1mm;
          margin-top: -3mm;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .company-name {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.2;
          margin-bottom: 1mm;
        }
        
        .product-name {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-size: 10px;
          font-weight: bold;
          line-height: 1.3;
          margin-bottom: 1mm;
          max-height: 16mm;
          overflow: hidden;
          word-wrap: break-word;
        }
        
        .ingredients-text {
          font-family: Arial, sans-serif;
          font-size: 6px;
          line-height: 1.2;
          margin-bottom: 6mm;
          max-height: 18mm;
          max-width: 43mm;
          overflow: hidden;
          word-wrap: break-word;
        }

        .ingredients-text::before {
          content: 'INGREDIENTS:';
          display: block;
          font-weight: bold;
          margin-bottom: 1mm;
          padding-bottom: 0.5mm;
          border-bottom: 1.5px solid black;
        }

      .allergen-text {
        font-family: Arial, sans-serif;
        font-size: 6px;
        line-height: 1.4;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 10mm;
        margin-bottom: 5mm;
        max-height: 18mm;
        overflow: hidden;
        word-wrap: break-word;
        max-width: 30mm;
      }

      .allergen-text::before {
        content: 'ALLERGENS:';
        display: block;
        font-weight: bold;
        margin-bottom: 1mm;
      }

      .storage-info {
        font-family: Arial, sans-serif;
        font-size: 6px;
        line-height: 1.4;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 10mm;
        max-height: 18mm;
        overflow: hidden;
        word-wrap: break-word;
        max-width: 30mm;
      }
        
        .field-label {
          font-family: Arial, sans-serif;
          font-size: 7px;
          margin-bottom: 1mm;
          margin-top: 8mm;
        }
        
        .best-before-value, .batch-number-value {
          font-family: Arial Narrow, sans-serif;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 2mm;
          min-height: 10px;
          background-color: black;
          color: white;
          display: inline-block;
          width: fit-content;
          line-height: 1;
          white-space: nowrap;
        }
        
        .field-label.batch {
          margin-top: 0mm;
        }
        
        .halal-logo {
          width: 15mm;
          height: 15mm;
          margin: 27mm 0 0 -25mm;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .halal-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .manufacturer-info {
          font-family: Arial, sans-serif;
          font-size: 7px;
          line-height: 1.40;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          
          .page {
            margin: 0;
            box-shadow: none;
            page-break-after: always;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
        }
      </style>
    </head>
    <body>
    ${pages}
    </body>
    </html>`;
    }, [clientData, editableData, calculateBestBefore]);

  useEffect(() => {
  // Initialize editable data with values from database if available
  const initialData = orderItems.map((item, index) => {
    // Helper to format date from database
    const formatDateDisplay = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return {
      id: index,
      companyName: clientData?.client_businessName || 'Company Name',
      productName: item.product_name || 'Product Name',
      // Use saved label data if available, otherwise use product defaults
      ingredients: item.label_ingredients || item.ingredients || 'Ingredients not available',
      allergen: item.label_allergens || item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
      // Use saved best_before if available, otherwise calculate
      bestBefore: item.best_before 
        ? formatDateDisplay(item.best_before) 
        : (item.bestBefore || calculateBestBefore(item.order_date || new Date())),
      // Use saved batch_number if available
      batchNumber: item.batch_number ? String(item.batch_number) : (item.batchNumber || '')
    };
  });
  setEditableData(initialData);
}, [orderItems, clientData, calculateBestBefore]);

useEffect(() => {
  // Generate preview only after editableData is set
  if (editableData.length > 0) {
    const initPreview = async () => {
      const halalBase64 = await getHalalImageBase64();
      const html = generatePreviewHTML(orderItems, halalBase64);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Clean up old blob URL
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      
      setPreviewBlobUrl(blobUrl);
      setShowPreview(true);
    };
    
    initPreview();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editableData, orderItems, getHalalImageBase64]);

  // Generate label as canvas and convert to JPEG
  const generateLabelImage = async (item, index) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
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
      
      // Get editable data for this label
      const data = editableData[index] || {
        companyName: clientData?.client_businessName || 'Company Name',
        productName: item.product_name || 'Product Name',
        ingredients: item.ingredients || 'Ingredients not available',
        allergen: item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
        bestBefore: calculateBestBefore(item.order_date || new Date()),
        batchNumber: ''
      };

      const companyName = data.companyName;
      const productName = data.productName;
      const ingredients = data.ingredients;
      const allergenInfo = data.allergen;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Margins in mm (Left: 5mm, Top: 5mm, Right: 8mm, Bottom: 5mm)
      const marginLeft = Math.round(5 * mmToPx);
      const marginTop = Math.round(5 * mmToPx);
      const marginBottom = Math.round(5 * mmToPx);
      
      // Calculate sections based on your image
      const leftSectionWidth = Math.round(45 * mmToPx); // Left section ends at ~58mm
      const rightSectionX = leftSectionWidth;
      
      // Font sizes at 300 DPI - matching your image exactly
      const companyFontSize = Math.round(12 * (dpi/96)); // Larger for Company Name
      const productFontSize = Math.round(10 * (dpi/96)); // Bold product name
      const ingredientsFontSize = Math.round(6 * (dpi/96)); // Ingredients
      const storageFontSize = Math.round(6 * (dpi/96)); // Storage info
      const rightSectionFontSize = Math.round(7 * (dpi/96)); // Right section labels
      const manufacturerFontSize = Math.round(7 * (dpi/96)); // Manufacturer info
      
      // Helper function to wrap text
      const wrapText = (text, maxWidth, fontSize, fontFamily = 'Arial', isBold = false) => {
        ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
          const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
          const metrics = ctx.measureText(testLine);
          
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

      // Company Name - Arial Nova Condensed (fallback to Arial Narrow/Arial)
      ctx.font = `${companyFontSize}px Arial Narrow, Arial`;
      ctx.fillText(companyName, marginLeft, leftY);
      leftY += Math.round(5 * mmToPx);

      // Product Name - Arial Nova Condensed Bold (fallback to Arial Narrow/Arial)
      const productLines = wrapText(productName, adjustedMaxWidth, productFontSize, 'Arial Narrow, Arial', true);
      ctx.font = `bold ${productFontSize}px Arial Narrow, Arial`;
      for (let i = 0; i < Math.min(productLines.length, 10); i++) {
        ctx.fillText(productLines[i], marginLeft, leftY);
        leftY += Math.round(3.2 * mmToPx);
      }
      leftY += Math.round(2.2 * mmToPx);
    

      // Draw "INGREDIENTS:" label with underline
      leftY -= Math.round(2 * mmToPx); // Add this line to move INGREDIENTS higher
      ctx.font = `bold ${ingredientsFontSize}px Arial`;
      ctx.fillText('INGREDIENTS:', marginLeft, leftY);
      const ingredientsLabelWidth = ctx.measureText('INGREDIENTS:').width;
      leftY += Math.round(3 * mmToPx);

      // Draw underline
      ctx.fillRect(marginLeft, leftY - Math.round(0.7 * mmToPx), ingredientsLabelWidth + Math.round(27 * mmToPx), Math.round(0.2 * mmToPx));
      leftY += Math.round(1 * mmToPx);

      // Draw ingredients text (normal weight)
      const ingredientsMaxWidth = leftMaxWidth + Math.round(1 * mmToPx);
      const ingredientsLines = wrapText(ingredients, ingredientsMaxWidth, ingredientsFontSize, 'Arial');
      ctx.font = `${ingredientsFontSize}px Arial`; // Normal weight
      const maxIngredientsLines = 3;
      for (let i = 0; i < Math.min(ingredientsLines.length, maxIngredientsLines); i++) {
        ctx.fillText(ingredientsLines[i], marginLeft, leftY);
        leftY += Math.round(2 * mmToPx);
      }

      leftY += Math.round(1 * mmToPx);

      // ALLERGENS Section - Positioned at bottom with dynamic upward adjustment
ctx.font = `${storageFontSize}px Arial`;
const storageMaxWidth = leftMaxWidth + Math.round(3 * mmToPx);
const storageMaxWidthReduced = storageMaxWidth - Math.round(8 * mmToPx);

// Calculate storage instructions lines first (these stay at the bottom)
const storageText = 'Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.';
const storageLines = wrapText(storageText, storageMaxWidthReduced, storageFontSize, 'Arial');


// Calculate allergen lines
ctx.font = `normal ${storageFontSize}px Arial`;
const allergenLines = wrapText(allergenInfo, storageMaxWidthReduced, storageFontSize, 'Arial');
const allergenHeight = allergenLines.length * Math.round(2.3 * mmToPx); // Changed from 0.5 to 2.3 to match line spacing

// Calculate total height needed for allergens section
const allergenLabelHeight = Math.round(3 * mmToPx); // Space after "ALLERGENS:" label
const gapBetweenSections = Math.round(1 * mmToPx); // Gap between allergens and storage

// Draw storage instructions at fixed position from bottom
const storageY = height - marginBottom - Math.round(3.5 * mmToPx);
storageLines.forEach((line, idx) => {
  if (idx < 3) {
    ctx.fillText(line, marginLeft, storageY + (idx * Math.round(2.3 * mmToPx)));
  }
});

// Calculate starting Y position that moves up based on content
// Position allergens above storage with proper spacing
const allergenStartY = storageY - gapBetweenSections - allergenHeight - allergenLabelHeight;

// Draw "ALLERGENS:" label (bold)
ctx.font = `bold ${storageFontSize}px Arial`;
ctx.fillText('ALLERGENS:', marginLeft, allergenStartY);

// Draw allergen text
ctx.font = `normal ${storageFontSize}px Arial`;
const allergenY = allergenStartY + allergenLabelHeight;
allergenLines.forEach((line, idx) => {
  ctx.fillText(line, marginLeft, allergenY + (idx * Math.round(2.3 * mmToPx)));
});
      
      const finalizeCanvas = (halalImage = null) => {
        // RIGHT SECTION
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        
        let rightY = marginTop + Math.round(6 * mmToPx);  
        const rightX = rightSectionX + Math.round(3.4 * mmToPx);
        
        // Best Before - Arial
        ctx.font = `${rightSectionFontSize}px  Arial`;
        ctx.fillText('Best Before (dd/mm/yyyy)', rightX, rightY);
        rightY += Math.round(2 * mmToPx);  

        // Best Before Value - White text on black background
        ctx.font = `bold ${Math.round(10 * (dpi/96))}px  Arial Narrow`;
        const bestBeforeText = (data.bestBefore || '').trim();
        const bestBeforeMetrics = ctx.measureText(bestBeforeText);
        const bestBeforeHeight = Math.round(3.5 * mmToPx);

        // Draw black background (exact width of text)
        ctx.fillStyle = '#000000';
        ctx.fillRect(
          rightX, 
          rightY, 
          bestBeforeMetrics.width, 
          bestBeforeHeight
        );

        // Draw white text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(bestBeforeText, rightX, rightY);
        rightY += Math.round(3 * mmToPx);
        
        // Add extra spacing before the label
        rightY += Math.round(3 * mmToPx);  
        
        // Reset to black for label
        ctx.fillStyle = '#000000';
        ctx.font = `${rightSectionFontSize}px Arial`;
        ctx.fillText('Batch Number', rightX, rightY);
        rightY += Math.round(2 * mmToPx);  // Changed from 6 to 3 - smaller gap

        // Batch Number value - White text on black background
        ctx.font = `bold ${Math.round(10 * (dpi/96))}px Arial Narrow`;
        const batchNumberText = (data.batchNumber || '').trim();
        const batchMetrics = ctx.measureText(batchNumberText);
        const batchHeight = Math.round(3.5 * mmToPx);

        // Draw black background (exact width of text)
        ctx.fillStyle = '#000000';
        ctx.fillRect(
          rightX, 
          rightY, 
          batchMetrics.width, 
          batchHeight
        );

        // Draw white text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(batchNumberText, rightX, rightY);
        
        // Halal Logo - moved to better position
        const logoSize = Math.round(13.5 * mmToPx);
        const logoX = marginLeft + leftMaxWidth - logoSize - Math.round(-8 * mmToPx);
        const logoY = height - marginBottom - Math.round(12 * mmToPx);
        
        if (halalImage) {
          ctx.drawImage(halalImage, logoX, logoY, logoSize, logoSize);
        }
        
        // Manufacturer Info at bottom - Arial
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
        
        // Convert to JPEG
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              const sanitizedName = productName.replace(/[^a-z0-9]/gi, '_');
              resolve({ blob, filename: `Label_${index + 1}_${sanitizedName}.jpg` });
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/jpeg', 0.95);
        } catch (err) {
          reject(err);
        }
      };
            
      // Load Halal logo
      const halalImg = new Image();
      halalImg.crossOrigin = 'anonymous';
      
      const imageTimeout = setTimeout(() => {
        halalImg.src = '';
        finalizeCanvas(null);
      }, 3000);
      
      halalImg.onload = () => {
        clearTimeout(imageTimeout);
        finalizeCanvas(halalImg);
      };
      
      halalImg.onerror = () => {
        clearTimeout(imageTimeout);
        finalizeCanvas(null);
      };
      
      halalImg.src = '/assets/halal.png';
    });
  };

  const handleDownloadImages = async () => {
    try {
      setIsGenerating(true);

      const labelPromises = orderItems.map((item, index) => 
        generateLabelImage(item, index).catch(err => {
          console.error(`Failed to generate label ${index + 1}:`, err);
          return null;
        })
      );
      
      const labels = await Promise.all(labelPromises);
      const successfulLabels = labels.filter(label => label !== null);
      
      if (successfulLabels.length === 0) {
        throw new Error('No labels were successfully generated');
      }

      for (const label of successfulLabels) {
        try {
          const url = URL.createObjectURL(label.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = label.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (downloadErr) {
          console.error('Download failed for:', label.filename, downloadErr);
        }
      }
      
      setIsGenerating(false);
      
      if (successfulLabels.length < labels.length) {
        alert(`Generated ${successfulLabels.length} out of ${labels.length} labels. Some labels failed to generate.`);
      }
    } catch (error) {
      setIsGenerating(false);
      alert('Failed to generate label images. Please try again. Error: ' + error.message);
      console.error('Label generation error:', error);
    }
  };

  const closePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setShowPreview(false);
    setPreviewBlobUrl(null);
  };

  if (!showPreview || !previewBlobUrl) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
      onClick={closePreview}
    > 
      <div 
        className="bg-white rounded-lg max-w-4xl w-full h-[90vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Label Preview - {orderItems.length} {orderItems.length === 1 ? 'Label' : 'Labels'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Preview how your labels will look when printed (90mm × 50mm at 300 DPI)
            </p>
          </div>
          <button 
            onClick={closePreview} 
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe 
            src={previewBlobUrl} 
            className="w-full h-full border-0" 
            title="Label Preview" 
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
        <button 
          onClick={() => setShowEditModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Edit Labels
        </button>
        <button 
          onClick={handlePrintLabels}
          disabled={isGenerating}
          className="flex-1 px-4 py-3  text-white rounded font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: '#FF5722' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          {isGenerating ? 'Generating PDF...' : 'Print Labels PDF'}
        </button>
        <button 
          onClick={handleDownloadImages} 
          disabled={isGenerating} 
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {isGenerating ? 'Generating Images...' : `Download ${orderItems.length} JPEG Labels`}
        </button>
        <button 
          onClick={closePreview} 
          className="px-6 py-3 border-2 border-gray-800 text-gray-800 rounded font-medium hover:bg-gray-50"
        >
          Close Preview
        </button>
      </div>
        {/* Edit Label Modal */}
        {showEditModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }} 
            onClick={() => setShowEditModal(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-gray-800">
                  Edit Label Information
                </h3>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {editableData.map((data, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <h4 className="font-bold text-lg mb-4 text-gray-700">
                        Label {index + 1}
                      </h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={data.companyName}
                            disabled
                            onChange={(e) => {
                              const newData = [...editableData];
                              newData[index].companyName = e.target.value;
                              setEditableData(newData);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={data.productName}
                            onChange={(e) => {
                              const newData = [...editableData];
                              newData[index].productName = e.target.value;
                              setEditableData(newData);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ingredients
                          </label>
                          <textarea
                            value={data.ingredients}
                            onChange={(e) => {
                              const newData = [...editableData];
                              newData[index].ingredients = e.target.value;
                              setEditableData(newData);
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Allergen Information
                          </label>
                          <textarea
                            value={data.allergen}
                            onChange={(e) => {
                              const newData = [...editableData];
                              newData[index].allergen = e.target.value;
                              setEditableData(newData);
                            }}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Best Before (dd/mm/yyyy)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={data.bestBefore}
                              onChange={(e) => {
                                const newData = [...editableData];
                                newData[index].bestBefore = e.target.value;
                                setEditableData(newData);
                              }}
                              placeholder="DD/MM/YYYY"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {index === 0 && (
                              <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={applyBestBeforeToAll}
                                  onChange={(e) => {
                                    setApplyBestBeforeToAll(e.target.checked);
                                    if (e.target.checked) {
                                      const newData = editableData.map(item => ({
                                        ...item,
                                        bestBefore: editableData[0].bestBefore
                                      }));
                                      setEditableData(newData);
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                Apply to all
                              </label>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Batch Number
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={data.batchNumber}
                              onChange={(e) => {
                                const newData = [...editableData];
                                newData[index].batchNumber = e.target.value;
                                setEditableData(newData);
                              }}
                              placeholder="Enter batch number"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {index === 0 && (
                              <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={applyBatchNumberToAll}
                                  onChange={(e) => {
                                    setApplyBatchNumberToAll(e.target.checked);
                                    if (e.target.checked) {
                                      const newData = editableData.map(item => ({
                                        ...item,
                                        batchNumber: editableData[0].batchNumber
                                      }));
                                      setEditableData(newData);
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                Apply to all
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
              <button 
                onClick={async () => {
                  try {
                    // Convert best_before from DD/MM/YYYY to YYYY-MM-DD format for PostgreSQL
                    const convertToPostgresDate = (dateStr) => {
                      if (!dateStr) return null;
                      const parts = dateStr.split('/');
                      if (parts.length !== 3) return null;
                      // DD/MM/YYYY -> YYYY-MM-DD
                      return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    };

                    // Update each order item in the database
                    const updatePromises = editableData.map(async (data, index) => {
                      const item = orderItems[index];
                      
                      // Batch number as text
                      const batchNumberValue = data.batchNumber && data.batchNumber.trim() !== '' 
                        ? data.batchNumber.trim() 
                        : null;
                      
                      const updateData = {
                        product_name: data.productName || null,  // ADD THIS LINE
                        label_ingredients: data.ingredients || null,
                        label_allergens: data.allergen || null,
                        best_before: convertToPostgresDate(data.bestBefore),
                        batch_number: batchNumberValue
                      };

                      console.log(`Updating item ${item.id} with:`, updateData);
                      
                      const result = await supabase
                        .from('client_order_item')
                        .update(updateData)
                        .eq('id', item.id)
                        .select();
                      
                      console.log(`Update result for item ${item.id}:`, result);
                      return result;
                    });

                    const results = await Promise.all(updatePromises);

                    // Check for errors
                    const errors = results.filter(r => r.error);
                    if (errors.length > 0) {
                      console.error('Some updates failed:', errors);
                      errors.forEach((err, idx) => {
                        console.error(`Error ${idx + 1}:`, err.error?.message, err.error?.details, err.error?.hint);
                      });
                      alert('Some label updates failed. Error: ' + errors[0].error?.message);
                      return;
                    }

                    console.log('All updates successful:', results);

                    // Update orderItems with the saved data including database format
                    const updatedOrderItems = orderItems.map((item, index) => ({
                      ...item,
                      // ADD THIS LINE - Update product_name
                      product_name: editableData[index].productName,
                      // Display format
                      ingredients: editableData[index].ingredients,
                      allergen: editableData[index].allergen,
                      bestBefore: editableData[index].bestBefore,
                      batchNumber: editableData[index].batchNumber,
                      // Database format
                      label_ingredients: editableData[index].ingredients,
                      label_allergens: editableData[index].allergen,
                      best_before: convertToPostgresDate(editableData[index].bestBefore),
                      batch_number: editableData[index].batchNumber
                    }));

                    console.log('Updated order items:', updatedOrderItems);

                    // Update editableData to ensure it reflects the saved state
                    const refreshedEditableData = editableData.map((data) => ({
                      ...data
                    }));
                    setEditableData(refreshedEditableData);

                    // Update preview with the new data
                    const halalBase64 = await getHalalImageBase64();
                    const html = generatePreviewHTML(updatedOrderItems, halalBase64);
                    if (previewBlobUrl) {
                      URL.revokeObjectURL(previewBlobUrl);
                    }
                    const blob = new Blob([html], { type: 'text/html' });
                    const blobUrl = URL.createObjectURL(blob);
                    setPreviewBlobUrl(blobUrl);
                    setShowEditModal(false);
                    
                    if (onUpdate) {
                      onUpdate(updatedOrderItems);
                    }
                    
                    setSuccessMessage('Label saved successfully!');
                    setShowSuccessModal(true);
                  } catch (error) {
                    console.error('Error saving label information:', error);
                    alert('Failed to save label information: ' + error.message);
                  }
                }}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
              >
                Save Changes
              </button>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="px-6 py-3 border-2 border-gray-800 text-gray-800 rounded font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Success Modal */}
        {showSuccessModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowSuccessModal(false)}
          >
            <div 
              className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <Check size={24} className="text-green-600" />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: '#5C2E1F' }}>
                  Success!
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {successMessage}
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#FF5722' }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelGenerator;