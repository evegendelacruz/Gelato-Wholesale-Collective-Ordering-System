import { useState, useEffect, useCallback } from 'react';

const LabelGenerator = ({ orderItems, clientData }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);

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

  const generatePreviewHTML = useCallback((items, halalImageSrc = '/assets/halal.png') => {
  const pages = items.map((item, index) => {
    const companyName = clientData?.client_businessName || 'Company Name';
    const productName = item.product_name || 'Product Name Product Name Product Name';
    const ingredients = item.ingredients || 'Milk, skimmed milk powder, sugar, dextrose, maltodextrin, pistachio. Milk, skimmed milk powder, sugar, dextrose, maltodextrin, pistachio.';

    return `
      <div class="page" data-page="${index}">
        <div class="label-container">
          <div class="left-section">
            <div class="company-name">${companyName}</div>
            <div class="product-name">${productName}</div>
            <div class="ingredients-text">${ingredients}</div>
            <div class="storage-info">
              Our products are crafted in a facility that also processes dairy, gluten, and nuts. Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.
            </div>
          </div>

          <div class="halal-logo">
              ${halalImageSrc ? `<img src="${halalImageSrc}" alt="Halal Logo" />` : ''}
          </div>
          
          <div class="right-section">
            <div class="field-label">Best Before (mm/dd/yyyy)</div>
            <div class="field-label batch">Batch Number</div>
            
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
          width: 53mm;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: relative;
          padding-right: 10mm;
        }
        
        .right-section {
          flex: 1;
          margin-left: 2mm;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .company-name {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-size: 13px;
          line-height: 1.2;
          margin-bottom: 3mm;
        }
        
        .product-name {
          font-family: 'Arial Narrow', Arial, sans-serif;
          font-size: 11px;
          font-weight: bold;
          line-height: 1.3;
          margin-bottom: 2mm;
          max-height: 16mm;
          overflow: hidden;
          word-wrap: break-word;
        }
        
        .ingredients-text {
          font-family: Arial, sans-serif;
          font-size: 7px;
          font-weight: bold;
          line-height: 1.4;
          margin-bottom: 2mm;
          max-height: 14mm;
          max-width: 35mm;
          overflow: hidden;
          word-wrap: break-word;
        }
        
        .storage-info {
          font-family: Arial, sans-serif;
          font-size: 7px;
          line-height: 1.4;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 25mm;
          max-height: 15mm;
          overflow: hidden;
          word-wrap: break-word;
        }
        
        .field-label {
          font-family: Arial, sans-serif;
          font-size: 7px;
          margin-bottom: 6mm;
          margin-top: 8mm;
          margn-left: -15mm;
        }
        
        .field-label.batch {
          margin-bottom: 4mm;
          margn-left: -5mm;
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
    }, [clientData]);

  // Now useEffect with proper dependencies
  useEffect(() => {
    const initPreview = async () => {
      const halalBase64 = await getHalalImageBase64();
      const html = generatePreviewHTML(orderItems, halalBase64);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewBlobUrl(blobUrl);
      setShowPreview(true);
    };
    
    initPreview();
  }, [orderItems, generatePreviewHTML, getHalalImageBase64]);

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
      
      const companyName = clientData?.client_businessName || 'Company Name';
      const productName = item.product_name || 'Product Name Product Name Product Name';
      const ingredients = item.ingredients || 'Milk, skimmed milk powder, sugar, dextrose, maltodextrin, pistachio. Milk, skimmed milk powder, sugar, dextrose, maltodextrin, pistachio.';
      
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
      const ingredientsFontSize = Math.round(7 * (dpi/96)); // Ingredients
      const storageFontSize = Math.round(7 * (dpi/96)); // Storage info
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
      const leftMaxWidth = leftSectionWidth - marginLeft - Math.round(6 * mmToPx);
      
      // Company Name - Arial Nova Condensed (fallback to Arial Narrow/Arial)
      ctx.font = `${companyFontSize}px Arial Narrow, Arial`;
      ctx.fillText(companyName, marginLeft, leftY);
      leftY += Math.round(7 * mmToPx);
      
      // Product Name - Arial Nova Condensed Bold (fallback to Arial Narrow/Arial)
      const productLines = wrapText(productName, leftMaxWidth, productFontSize, 'Arial Narrow, Arial', true);
      ctx.font = `bold ${productFontSize}px Arial Narrow, Arial`;
      for (let i = 0; i < Math.min(productLines.length, 3); i++) {
        ctx.fillText(productLines[i], marginLeft, leftY);
        leftY += Math.round(4.5 * mmToPx);
      }
      leftY += Math.round(2 * mmToPx);
      
    // Ingredients - Arial
    const ingredientsLines = wrapText(ingredients, leftMaxWidth, ingredientsFontSize, 'Arial');
    ctx.font = `bold ${ingredientsFontSize}px Arial`;
    const maxIngredientsLines = 4;
    for (let i = 0; i < Math.min(ingredientsLines.length, maxIngredientsLines); i++) {
      ctx.fillText(ingredientsLines[i], marginLeft, leftY);
      leftY += Math.round(3 * mmToPx);
    }

    // Add space between ingredients and storage
    leftY += Math.round(4 * mmToPx); // Add 4mm gap

    // Storage Info - Now positioned relatively from ingredients - Arial
    ctx.font = `${storageFontSize}px Arial`;
    const storageText = 'Our products are crafted in a facility that also processes dairy, gluten, and nuts. Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed.';

    const storageMaxWidth = leftMaxWidth - Math.round(6 * mmToPx); // Shorter lines

    const storageLines = wrapText(storageText, storageMaxWidth, storageFontSize, 'Arial');
    storageLines.forEach((line, idx) => {
      if (idx < 5) { 
        ctx.fillText(line, marginLeft, leftY + (idx * Math.round(2.3 * mmToPx)));
      }
    });
      
      // Function to finalize and draw right section
      const finalizeCanvas = (halalImage = null) => {
        // RIGHT SECTION
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        
       let rightY = marginTop + Math.round(7 * mmToPx); 
        const rightX = rightSectionX + Math.round(3.4 * mmToPx);
        
        // Best Before - Arial
        ctx.font = `${rightSectionFontSize}px Arial`;
        ctx.fillText('Best Before (mm/dd/yyyy)', rightX, rightY);
        rightY += Math.round(8 * mmToPx);
        
        // Batch Number - Arial
        ctx.fillText('Batch Number', rightX, rightY);
        rightY += Math.round(6 * mmToPx);
        
        // Halal Logo - centered in right section
        const logoSize = Math.round(13.5 * mmToPx); // Slightly smaller to fit
        const logoX = marginLeft + leftMaxWidth - logoSize - Math.round(-8 * mmToPx);
        const logoY = leftY + Math.round(-2 * mmToPx);
        
        if (halalImage) {
          ctx.drawImage(halalImage, logoX, logoY, logoSize, logoSize);
        }
        
        // Manufacturer Info at bottom - Arial
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

  return (
    <>
      {showPreview && previewBlobUrl && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={closePreview}> 
          <div className="bg-white rounded-lg max-w-4xl w-full h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Label Preview - {orderItems.length} {orderItems.length === 1 ? 'Label' : 'Labels'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Preview how your labels will look when printed (90mm × 50mm at 300 DPI)
                </p>
              </div>
              <button onClick={closePreview} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe src={previewBlobUrl} className="w-full h-full border-0" title="Label Preview" />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
              <button onClick={handleDownloadImages} disabled={isGenerating} className="flex-1 px-4 py-3 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50">
                {isGenerating ? 'Generating Images...' : `Download ${orderItems.length} JPEG Labels`}
              </button>
              <button onClick={closePreview} className="px-6 py-3 border-2 border-gray-800 text-gray-800 rounded font-medium hover:bg-gray-50">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LabelGenerator;