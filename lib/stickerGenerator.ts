import jsPDF from 'jspdf';

// Code128 barcode character set and encoding
const CODE128_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

const CODE128B_START = 104;
const CODE128_STOP = 106;

// Code 128B encoding patterns (bars/spaces as binary)
const CODE128_PATTERNS: { [key: number]: string } = {
  0: '11011001100', 1: '11001101100', 2: '11001100110', 3: '10010011000',
  4: '10010001100', 5: '10001001100', 6: '10011001000', 7: '10011000100',
  8: '10001100100', 9: '11001001000', 10: '11001000100', 11: '11000100100',
  12: '10110011100', 13: '10011011100', 14: '10011001110', 15: '10111001100',
  16: '10011101100', 17: '10011100110', 18: '11001110010', 19: '11001011100',
  20: '11001001110', 21: '11011100100', 22: '11001110100', 23: '11101101110',
  24: '11101001100', 25: '11100101100', 26: '11100100110', 27: '11101100100',
  28: '11100110100', 29: '11100110010', 30: '11011011000', 31: '11011000110',
  32: '11000110110', 33: '10100011000', 34: '10001011000', 35: '10001000110',
  36: '10110001000', 37: '10001101000', 38: '10001100010', 39: '11010001000',
  40: '11000101000', 41: '11000100010', 42: '10110111000', 43: '10110001110',
  44: '10001101110', 45: '10111011000', 46: '10111000110', 47: '10001110110',
  48: '11101110110', 49: '11010001110', 50: '11000101110', 51: '11011101000',
  52: '11011100010', 53: '11011101110', 54: '11101011000', 55: '11101000110',
  56: '11100010110', 57: '11101101000', 58: '11101100010', 59: '11100011010',
  60: '11101111010', 61: '11001000010', 62: '11110001010', 63: '10100110000',
  64: '10100001100', 65: '10010110000', 66: '10010000110', 67: '10000101100',
  68: '10000100110', 69: '10110010000', 70: '10110000100', 71: '10011010000',
  72: '10011000010', 73: '10000110100', 74: '10000110010', 75: '11000010010',
  76: '11001010000', 77: '11110111010', 78: '11000010100', 79: '10001111010',
  80: '10100111100', 81: '10010111100', 82: '10010011110', 83: '10111100100',
  84: '10011110100', 85: '10011110010', 86: '11110100100', 87: '11110010100',
  88: '11110010010', 89: '11011011110', 90: '11011110110', 91: '11110110110',
  92: '10101111000', 93: '10100011110', 94: '10001011110', 95: '10111101000',
  96: '10111100010', 97: '11110101000', 98: '11110100010', 99: '10111011110',
  100: '10111101110', 101: '11101011110', 102: '11110101110', 103: '11010000100',
  104: '11010010000', 105: '11010011100', 106: '1100011101011'
};

function encodeCode128B(text: string): string {
  let encoded = CODE128_PATTERNS[CODE128B_START]; // Start Code B
  let checksum = CODE128B_START;

  for (let i = 0; i < text.length; i++) {
    const charIndex = CODE128_CHARS.indexOf(text.charAt(i));
    if (charIndex >= 0) {
      encoded += CODE128_PATTERNS[charIndex];
      checksum += charIndex * (i + 1);
    }
  }

  // Add checksum
  const checksumChar = checksum % 103;
  encoded += CODE128_PATTERNS[checksumChar];

  // Add stop character
  encoded += CODE128_PATTERNS[CODE128_STOP];

  return encoded;
}

function drawBarcodeToCanvas(text: string, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const encoded = encodeCode128B(text);
  const barWidth = width / encoded.length;

  canvas.width = width;
  canvas.height = height;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Draw bars
  ctx.fillStyle = '#000000';
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '1') {
      ctx.fillRect(Math.floor(i * barWidth), 0, Math.ceil(barWidth), height);
    }
  }

  return canvas.toDataURL('image/png');
}

export interface StickerData {
  productName: string;
  ingredients: string;
  bbdCode: string;
  pbnCode: string;
  barcode: string;
}

export interface BarcodeStickerData {
  productName: string;
  barcode13: string; // 13-digit barcode starting with 3
}

export interface ProductStickerData {
  productName: string;
  ingredients: string;
  bbd: string; // BBD date in DDMMYYYY format
  gpbnCode: string; // GPBN code (e.g., GPBN3000)
}

/**
 * Generates a 30-digit barcode
 * Format: BBD(8) + PBN number(4) + timestamp(10) + random(8) = 30 digits
 */
export function generate30DigitBarcode(bbdCode: string, pbnCode: string): string {
  // BBD code (8 digits)
  const bbdPart = bbdCode.padEnd(8, '0').substring(0, 8);

  // PBN number part (4 digits)
  const pbnNumber = pbnCode.replace('PBN', '').padStart(4, '0').substring(0, 4);

  // Timestamp part (10 digits) - last 10 digits of current timestamp
  const timestamp = Date.now().toString().slice(-10);

  // Random part (8 digits)
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

  return `${bbdPart}${pbnNumber}${timestamp}${random}`;
}

/**
 * Generates the next BBD code based on the last code
 * Format: 3030YYYY where 3030 increments and YYYY is the year (2026)
 * e.g., 30302026, 30312026, 30322026
 */
export function generateNextBbdCode(lastBbdCode: string | null): string {
  const year = '2026';
  if (!lastBbdCode) {
    return `3030${year}`;
  }

  // Extract the prefix (first 4 digits)
  const prefix = parseInt(lastBbdCode.substring(0, 4), 10);
  const nextPrefix = prefix + 1;

  return `${nextPrefix}${year}`;
}

/**
 * Generates the next PBN code based on the last code
 * Format: PBN#### starting from PBN3000
 */
export function generateNextPbnCode(lastPbnCode: string | null): string {
  if (!lastPbnCode) {
    return 'PBN3000';
  }

  // Extract the number part
  const numPart = parseInt(lastPbnCode.replace('PBN', ''), 10);
  const nextNum = numPart + 1;

  return `PBN${nextNum}`;
}

/**
 * Calculate responsive font size to fit text in available width
 */
function getResponsiveFontSize(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number
): number {
  let fontSize = maxFontSize;
  doc.setFontSize(fontSize);

  while (fontSize > minFontSize) {
    const textWidth = doc.getTextWidth(text);
    if (textWidth <= maxWidth) {
      break;
    }
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }

  return fontSize;
}

/**
 * Generates a sticker PDF for a product
 * Size: 3cm x 1.5cm
 * Margin: 0.2cm
 * Layout matches Design/sticker.png:
 * - Product Name (bold, LEFT aligned, responsive font size)
 * - Ingredients (justified text)
 * - Barcode (full width)
 * - BBD: XXXXXXXX PBNXXXX (bold, centered, bottom)
 */
export function generateStickerPDF(data: StickerData): jsPDF {
  // 3cm x 1.5cm in mm
  const widthMm = 30;
  const heightMm = 15;
  const marginMm = 2; // 0.2cm = 2mm

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm] // [height, width] for landscape
  });

  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Fixed positions for layout - work backwards from bottom
  const bbdCodeY = heightMm - marginMm - 0.5; // BBD code at bottom
  const barcodeHeight = 2.5;
  const barcodeY = bbdCodeY - barcodeHeight - 1.5; // Barcode above BBD with more space
  const ingredientsEndY = barcodeY - 0.5; // Ingredients end before barcode

  // Calculate available space for product name and ingredients
  const productNameStartY = marginMm + 1.2;

  // Product Name (bold, LEFT aligned, responsive font size)
  doc.setFont('helvetica', 'bold');

  // Try to fit product name on one line with responsive font
  let nameFontSize = getResponsiveFontSize(doc, data.productName, contentWidth, 5.5, 3.5);
  doc.setFontSize(nameFontSize);

  let nameLines: string[];
  let nameEndY: number;

  // Check if text fits on one line
  if (doc.getTextWidth(data.productName) <= contentWidth) {
    // Single line
    nameLines = [data.productName];
    doc.text(data.productName, contentStartX, productNameStartY);
    nameEndY = productNameStartY + 1;
  } else {
    // Need multiple lines - reduce font size and split
    nameFontSize = Math.min(nameFontSize, 5.5);
    doc.setFontSize(nameFontSize);
    nameLines = doc.splitTextToSize(data.productName, contentWidth);

    // Limit to 2 lines max
    if (nameLines.length > 2) {
      // Further reduce font size to try to fit in 2 lines
      nameFontSize = getResponsiveFontSize(doc, data.productName, contentWidth * 1.8, 5.5, 3.5);
      doc.setFontSize(nameFontSize);
      nameLines = doc.splitTextToSize(data.productName, contentWidth);
      if (nameLines.length > 2) {
        nameLines = nameLines.slice(0, 2);
        // Truncate last line if needed
        const lastLine = nameLines[1];
        if (doc.getTextWidth(lastLine) > contentWidth) {
          nameLines[1] = lastLine.substring(0, lastLine.length - 3) + '...';
        }
      }
    }

    // Draw each line LEFT aligned
    const lineHeight = nameFontSize * 0.35;
    nameLines.forEach((line: string, index: number) => {
      doc.text(line, contentStartX, productNameStartY + (index * lineHeight));
    });
    nameEndY = productNameStartY + (nameLines.length * lineHeight) + 0.3;
  }

  // Ingredients (justified text, smaller font) - under product name with spacing
  const ingredientsStartY = nameEndY + 1;
  const availableIngredientsHeight = ingredientsEndY - ingredientsStartY;

  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');

  const ingredientLines = doc.splitTextToSize(data.ingredients, contentWidth);
  const lineHeight = 1.3;
  const maxIngredientLines = Math.floor(availableIngredientsHeight / lineHeight);
  const displayIngredients = ingredientLines.slice(0, Math.max(1, maxIngredientLines));

  // Justified text - manually justify each line except the last
  let ingredientY = ingredientsStartY;
  displayIngredients.forEach((line: string, index: number) => {
    if (ingredientY + lineHeight > ingredientsEndY) return; // Don't overflow

    if (index < displayIngredients.length - 1 && line.trim().length > 0) {
      // Justify this line
      const words = line.split(' ').filter((w: string) => w.length > 0);
      if (words.length > 1) {
        const totalWordsWidth = words.reduce((sum: number, word: string) => sum + doc.getTextWidth(word), 0);
        const spaceWidth = (contentWidth - totalWordsWidth) / (words.length - 1);
        let xPos = contentStartX;
        words.forEach((word: string, wordIndex: number) => {
          doc.text(word, xPos, ingredientY);
          if (wordIndex < words.length - 1) {
            xPos += doc.getTextWidth(word) + spaceWidth;
          }
        });
      } else {
        doc.text(line, contentStartX, ingredientY);
      }
    } else {
      // Last line or single word - left align
      doc.text(line, contentStartX, ingredientY);
    }
    ingredientY += lineHeight;
  });

  // Barcode (full width) - positioned above BBD code
  // Use the 30-digit barcode from data
  const barcodeText = data.barcode;
  try {
    const barcodeDataUrl = drawBarcodeToCanvas(barcodeText, 400, 60);
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, 'PNG', contentStartX, barcodeY, contentWidth, barcodeHeight);
    }
  } catch (e) {
    console.error('Error generating barcode:', e);
  }

  // BBD and PBN codes at the bottom (bold, centered)
  doc.setFontSize(4);
  doc.setFont('helvetica', 'bold');
  const codesText = `BBD: ${data.bbdCode} ${data.pbnCode}`;
  const codesWidth = doc.getTextWidth(codesText);
  const codesX = contentStartX + (contentWidth - codesWidth) / 2;
  doc.text(codesText, codesX, bbdCodeY);

  return doc;
}

/**
 * Generate sticker as blob URL for preview
 */
export function generateStickerBlobUrl(data: StickerData): string {
  const doc = generateStickerPDF(data);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

/**
 * Preview sticker as data URL (for displaying in modal)
 */
export async function generateStickerPreview(data: StickerData): Promise<string> {
  return generateStickerBlobUrl(data);
}

/**
 * Download sticker PDF
 */
export function downloadStickerPDF(data: StickerData, filename: string): void {
  const doc = generateStickerPDF(data);
  doc.save(filename);
}

/**
 * Generate multiple stickers in a single PDF (one sticker per page)
 */
export function generateMultiStickerPDF(data: StickerData, quantity: number): jsPDF {
  const widthMm = 30;
  const heightMm = 15;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  for (let i = 0; i < quantity; i++) {
    if (i > 0) {
      doc.addPage([heightMm, widthMm], 'landscape');
    }

    // Draw sticker content on this page
    drawStickerContent(doc, data, widthMm, heightMm);
  }

  return doc;
}

/**
 * Download multiple stickers as a single PDF
 */
export function downloadMultiStickerPDF(data: StickerData, quantity: number, filename: string): void {
  const doc = generateMultiStickerPDF(data, quantity);
  doc.save(filename);
}

/**
 * Helper function to draw sticker content on a jsPDF document
 */
function drawStickerContent(doc: jsPDF, data: StickerData, widthMm: number, heightMm: number): void {
  const marginMm = 2;
  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Fixed positions for layout - work backwards from bottom
  const bbdCodeY = heightMm - marginMm - 0.5; // BBD code at bottom
  const barcodeHeight = 2.5;
  const barcodeY = bbdCodeY - barcodeHeight - 1.5; // Barcode above BBD with more space
  const ingredientsEndY = barcodeY - 0.5; // Ingredients end before barcode
  const productNameStartY = marginMm + 1.2;

  // Product Name (bold, LEFT aligned, responsive font size)
  doc.setFont('helvetica', 'bold');
  let nameFontSize = 5.5;
  doc.setFontSize(nameFontSize);

  while (nameFontSize > 3.5 && doc.getTextWidth(data.productName) > contentWidth) {
    nameFontSize -= 0.5;
    doc.setFontSize(nameFontSize);
  }

  let nameEndY: number;
  if (doc.getTextWidth(data.productName) <= contentWidth) {
    doc.text(data.productName, contentStartX, productNameStartY);
    nameEndY = productNameStartY + 1;
  } else {
    nameFontSize = Math.min(nameFontSize, 5.5);
    doc.setFontSize(nameFontSize);
    let nameLines = doc.splitTextToSize(data.productName, contentWidth);
    if (nameLines.length > 2) {
      nameLines = nameLines.slice(0, 2);
    }
    const lineHeight = nameFontSize * 0.35;
    nameLines.forEach((line: string, index: number) => {
      doc.text(line, contentStartX, productNameStartY + (index * lineHeight));
    });
    nameEndY = productNameStartY + (nameLines.length * lineHeight) + 0.3;
  }

  // Ingredients - draw under product name with spacing
  const ingredientsStartY = nameEndY + 1;
  const availableIngredientsHeight = ingredientsEndY - ingredientsStartY;

  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');

  const ingredientLines = doc.splitTextToSize(data.ingredients, contentWidth);
  const lineHeight = 1.3;
  const maxIngredientLines = Math.floor(availableIngredientsHeight / lineHeight);
  const displayIngredients = ingredientLines.slice(0, Math.max(1, maxIngredientLines));

  let ingredientY = ingredientsStartY;
  displayIngredients.forEach((line: string, index: number) => {
    if (ingredientY + lineHeight > ingredientsEndY) return;

    if (index < displayIngredients.length - 1 && line.trim().length > 0) {
      const words = line.split(' ').filter((w: string) => w.length > 0);
      if (words.length > 1) {
        const totalWordsWidth = words.reduce((sum: number, word: string) => sum + doc.getTextWidth(word), 0);
        const spaceWidth = (contentWidth - totalWordsWidth) / (words.length - 1);
        let xPos = contentStartX;
        words.forEach((word: string, wordIndex: number) => {
          doc.text(word, xPos, ingredientY);
          if (wordIndex < words.length - 1) {
            xPos += doc.getTextWidth(word) + spaceWidth;
          }
        });
      } else {
        doc.text(line, contentStartX, ingredientY);
      }
    } else {
      doc.text(line, contentStartX, ingredientY);
    }
    ingredientY += lineHeight;
  });

  // Barcode
  try {
    const barcodeDataUrl = drawBarcodeToCanvas(data.barcode, 400, 60);
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, 'PNG', contentStartX, barcodeY, contentWidth, barcodeHeight);
    }
  } catch (e) {
    console.error('Error generating barcode:', e);
  }

  // BBD and PBN codes
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  const codesText = `BBD: ${data.bbdCode} ${data.pbnCode}`;
  const codesWidth = doc.getTextWidth(codesText);
  const codesX = contentStartX + (contentWidth - codesWidth) / 2;
  doc.text(codesText, codesX, bbdCodeY);
}

/**
 * Generate barcode data URL for preview
 */
export function generateBarcodeDataUrl(text: string): string {
  return drawBarcodeToCanvas(text, 400, 60);
}

/**
 * Generate a consistent barcode for a product name (same product = same barcode)
 * Uses a hash function to create a deterministic 12-digit barcode from product name
 */
export function generateProductBarcode(productName: string): string {
  // Simple hash function to create a consistent number from product name
  let hash = 0;
  const normalizedName = productName.toLowerCase().trim();
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Make positive and pad to 12 digits
  const positiveHash = Math.abs(hash);
  const barcode = positiveHash.toString().padStart(12, '0').substring(0, 12);
  return barcode;
}

/**
 * Order item type for generating all stickers
 */
export interface OrderStickerItem {
  productName: string;
  ingredients: string;
  quantity: number;
  existingBbdCode?: string | null;
  existingPbnCode?: string | null;
  existingBarcode?: string | null;
}

/**
 * Generate all stickers for an entire order (all products × quantities) in one PDF
 * Each product gets a consistent barcode, but unique BBD/PBN per sticker
 */
export function generateAllOrderStickersPDF(
  items: OrderStickerItem[],
  startBbdCode: string | null = null,
  startPbnCode: string | null = null
): jsPDF {
  const widthMm = 30;
  const heightMm = 15;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  let currentBbdCode = startBbdCode;
  let currentPbnCode = startPbnCode;
  let isFirstPage = true;

  // Sort items by product name for organized output
  const sortedItems = [...items].sort((a, b) => a.productName.localeCompare(b.productName));

  for (const item of sortedItems) {
    // Generate consistent barcode for this product
    const barcode = item.existingBarcode || generateProductBarcode(item.productName);

    // Generate stickers for each quantity
    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage([heightMm, widthMm], 'landscape');
      }
      isFirstPage = false;

      // Generate unique BBD and PBN for each sticker
      currentBbdCode = generateNextBbdCode(currentBbdCode);
      currentPbnCode = generateNextPbnCode(currentPbnCode);

      const stickerData: StickerData = {
        productName: item.productName,
        ingredients: item.ingredients || 'No ingredients listed',
        bbdCode: currentBbdCode,
        pbnCode: currentPbnCode,
        barcode: barcode
      };

      drawStickerContent(doc, stickerData, widthMm, heightMm);
    }
  }

  return doc;
}

/**
 * Download all stickers for an order as a single PDF
 */
export function downloadAllOrderStickersPDF(
  items: OrderStickerItem[],
  filename: string,
  startBbdCode: string | null = null,
  startPbnCode: string | null = null
): void {
  const doc = generateAllOrderStickersPDF(items, startBbdCode, startPbnCode);
  doc.save(filename);
}

/**
 * Open sticker PDF in new tab for printing
 */
export function printStickerPDF(data: StickerData): void {
  const doc = generateStickerPDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

// ============================================================================
// NEW STICKER TYPES: Barcode Sticker & Product Sticker (3cm x 1.5cm)
// ============================================================================

/**
 * Generates a 13-digit barcode starting with 3
 * Format: 3 + 12 random/sequential digits
 */
export function generate13DigitBarcode(lastBarcode: string | null): string {
  if (!lastBarcode) {
    return '3000000000001';
  }

  // Extract the numeric part and increment
  const numPart = parseInt(lastBarcode, 10);
  const nextNum = numPart + 1;

  // Ensure it still starts with 3 and is 13 digits
  const nextBarcode = nextNum.toString().padStart(13, '0');

  // If overflow, reset to 3000000000001
  if (!nextBarcode.startsWith('3') || nextBarcode.length > 13) {
    return '3000000000001';
  }

  return nextBarcode;
}

/**
 * Generates the next GPBN code
 * Format: GPBN#### starting from GPBN3000
 */
export function generateNextGpbnCode(lastGpbnCode: string | null): string {
  if (!lastGpbnCode) {
    return 'GPBN3000';
  }

  // Extract the number part
  const numPart = parseInt(lastGpbnCode.replace('GPBN', ''), 10);
  const nextNum = numPart + 1;

  return `GPBN${nextNum}`;
}

/**
 * Calculate BBD (Best Before Date) based on shelf life
 * @param shelfLife - e.g., "3 months", "6 months", "12 months", "1 year"
 * @returns BBD in DDMMYYYY format
 */
export function calculateBBD(shelfLife: string | null | undefined): string {
  const today = new Date();
  let months = 0;

  // Handle null/undefined shelfLife - default to 3 months
  if (!shelfLife || typeof shelfLife !== 'string') {
    today.setMonth(today.getMonth() + 3);
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  }

  // Parse shelf life string
  const lowerShelfLife = shelfLife.toLowerCase().trim();

  if (lowerShelfLife.includes('year')) {
    const years = parseInt(lowerShelfLife) || 1;
    months = years * 12;
  } else if (lowerShelfLife.includes('month')) {
    months = parseInt(lowerShelfLife) || 3;
  } else if (lowerShelfLife.includes('week')) {
    const weeks = parseInt(lowerShelfLife) || 1;
    today.setDate(today.getDate() + (weeks * 7));
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } else if (lowerShelfLife.includes('day')) {
    const days = parseInt(lowerShelfLife) || 30;
    today.setDate(today.getDate() + days);
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } else {
    // Default to 3 months if unrecognized
    months = parseInt(lowerShelfLife) || 3;
  }

  // Add months
  today.setMonth(today.getMonth() + months);

  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

/**
 * Generate Barcode Sticker PDF (3cm x 1.5cm)
 * Layout matching Design/Barcode Sticker.png:
 * - Product Name (bold, top, can wrap to 3 lines)
 * - Barcode image (middle, taller)
 * - 13-digit code below barcode (matching barcode value)
 */
export function generateBarcodeStickerPDF(data: BarcodeStickerData): jsPDF {
  const widthMm = 30;  // 3cm
  const heightMm = 15; // 1.5cm
  const marginMm = 1.5;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Product Name at top (bold, center aligned, can wrap to max 3 lines)
  doc.setFont('helvetica', 'bold');
  let nameFontSize = 5.5;
  doc.setFontSize(nameFontSize);

  // Calculate responsive font size
  while (nameFontSize > 3.5 && doc.getTextWidth(data.productName) > contentWidth * 2.5) {
    nameFontSize -= 0.3;
    doc.setFontSize(nameFontSize);
  }

  let nameLines = doc.splitTextToSize(data.productName, contentWidth);
  // Limit to 3 lines as shown in design
  if (nameLines.length > 3) {
    nameLines = nameLines.slice(0, 3);
  }

  const lineHeight = nameFontSize * 0.4;
  let currentY = marginMm + 1.5;

  // Center align each line
  nameLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    const lineX = contentStartX + (contentWidth - lineWidth) / 2;
    doc.text(line, lineX, currentY);
    currentY += lineHeight;
  });

  // Calculate barcode dimensions - make it taller and narrower
  const barcodeStartY = currentY + 0.3;
  const barcodeHeight = 5; // Taller barcode
  const barcodeWidth = contentWidth * 0.85; // Narrower barcode
  const barcodeX = contentStartX + (contentWidth - barcodeWidth) / 2; // Centered

  try {
    // Generate barcode with the exact 13-digit code
    const barcodeDataUrl = drawBarcodeToCanvas(data.barcode13, 300, 100); // Adjusted ratio for taller barcode
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, barcodeStartY, barcodeWidth, barcodeHeight);
    }
  } catch (e) {
    console.error('Error generating barcode:', e);
  }

  // 13-digit code below barcode (centered, same value as barcode)
  const codeY = barcodeStartY + barcodeHeight + 1.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);

  // Format barcode with spaces for readability: 3 01 2 3 4 5 6 7 8 9 0 1
  const formattedCode = data.barcode13.split('').join(' ');
  const codeTextWidth = doc.getTextWidth(formattedCode);
  const codeX = contentStartX + (contentWidth - codeTextWidth) / 2;
  doc.text(formattedCode, codeX, codeY);

  return doc;
}

/**
 * Generate Product Sticker PDF (3cm x 1.5cm)
 * Layout matching Design/Product Sticker.png:
 * - Product Name (bold, top, can wrap to 3 lines)
 * - Ingredients (smaller, justified)
 * - BBD: DDMMYYYY GBNXXXX or GPBNXXXX (bottom)
 */
export function generateProductStickerPDF(data: ProductStickerData): jsPDF {
  const widthMm = 30;  // 3cm
  const heightMm = 15; // 1.5cm
  const marginMm = 1.5;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Product Name at top (bold, center aligned, can wrap)
  doc.setFont('helvetica', 'bold');
  let nameFontSize = 5.5;
  doc.setFontSize(nameFontSize);

  // Calculate responsive font size
  while (nameFontSize > 3.5 && doc.getTextWidth(data.productName) > contentWidth * 2.5) {
    nameFontSize -= 0.3;
    doc.setFontSize(nameFontSize);
  }

  let nameLines = doc.splitTextToSize(data.productName, contentWidth);
  // Limit to 3 lines
  if (nameLines.length > 3) {
    nameLines = nameLines.slice(0, 3);
  }

  const nameLineHeight = nameFontSize * 0.4;
  let currentY = marginMm + 1.5;

  // Center align each line
  nameLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    const lineX = contentStartX + (contentWidth - lineWidth) / 2;
    doc.text(line, lineX, currentY);
    currentY += nameLineHeight;
  });

  // BBD and GPBN at bottom
  const bbdCodeY = heightMm - marginMm - 0.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const bbdText = `BBD: ${data.bbd} ${data.gpbnCode}`;
  const bbdWidth = doc.getTextWidth(bbdText);
  const bbdX = contentStartX + (contentWidth - bbdWidth) / 2;
  doc.text(bbdText, bbdX, bbdCodeY);

  // Ingredients in middle (fill available space)
  const ingredientsStartY = currentY + 0.8;
  const ingredientsEndY = bbdCodeY - 1.5;
  const availableHeight = ingredientsEndY - ingredientsStartY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);

  const ingredientLines = doc.splitTextToSize(data.ingredients, contentWidth);
  const ingredientLineHeight = 1.3;
  const maxLines = Math.floor(availableHeight / ingredientLineHeight);
  const displayLines = ingredientLines.slice(0, Math.max(1, maxLines));

  let ingredientY = ingredientsStartY;
  displayLines.forEach((line: string, index: number) => {
    if (ingredientY + ingredientLineHeight > ingredientsEndY) return;

    // Justify all lines except the last
    if (index < displayLines.length - 1 && line.trim().length > 0) {
      const words = line.split(' ').filter((w: string) => w.length > 0);
      if (words.length > 1) {
        const totalWordsWidth = words.reduce((sum: number, word: string) => sum + doc.getTextWidth(word), 0);
        const spaceWidth = (contentWidth - totalWordsWidth) / (words.length - 1);
        let xPos = contentStartX;
        words.forEach((word: string, wordIndex: number) => {
          doc.text(word, xPos, ingredientY);
          if (wordIndex < words.length - 1) {
            xPos += doc.getTextWidth(word) + spaceWidth;
          }
        });
      } else {
        doc.text(line, contentStartX, ingredientY);
      }
    } else {
      doc.text(line, contentStartX, ingredientY);
    }
    ingredientY += ingredientLineHeight;
  });

  return doc;
}

/**
 * Generate Barcode Sticker blob URL for preview
 */
export function generateBarcodeStickerBlobUrl(data: BarcodeStickerData): string {
  const doc = generateBarcodeStickerPDF(data);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

/**
 * Generate Product Sticker blob URL for preview
 */
export function generateProductStickerBlobUrl(data: ProductStickerData): string {
  const doc = generateProductStickerPDF(data);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

/**
 * Download Barcode Sticker PDF
 */
export function downloadBarcodeStickerPDF(data: BarcodeStickerData, filename: string): void {
  const doc = generateBarcodeStickerPDF(data);
  doc.save(filename);
}

/**
 * Download Product Sticker PDF
 */
export function downloadProductStickerPDF(data: ProductStickerData, filename: string): void {
  const doc = generateProductStickerPDF(data);
  doc.save(filename);
}

// ============================================================================
// ORDER STICKER GENERATION FUNCTIONS
// For generating barcode and product stickers for orders
// ============================================================================

export interface OrderItemForSticker {
  productName: string;
  ingredients: string;
  quantity: number;
  barcode13: string; // From product_list.barcode_13digit
  shelfLife: string; // From product_list.product_shelflife
}

/**
 * Calculate BBD from a specific order date + shelf life
 * @param orderDate - The date the order was placed (string in YYYY-MM-DD or Date object)
 * @param shelfLife - e.g., "3 months", "6 months", "12 months", "1 year"
 * @returns BBD in DDMMYYYY format
 */
export function calculateBBDFromOrderDate(orderDate: string | Date, shelfLife: string | null | undefined): string {
  let date: Date;

  if (typeof orderDate === 'string') {
    date = new Date(orderDate);
  } else {
    date = new Date(orderDate);
  }

  // If invalid date, use today
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  // Handle null/undefined shelfLife - default to 3 months
  if (!shelfLife || typeof shelfLife !== 'string') {
    date.setMonth(date.getMonth() + 3);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}${mm}${yyyy}`;
  }

  const lowerShelfLife = shelfLife.toLowerCase().trim();
  let months = 0;

  if (lowerShelfLife.includes('year')) {
    const years = parseInt(lowerShelfLife) || 1;
    months = years * 12;
  } else if (lowerShelfLife.includes('month')) {
    months = parseInt(lowerShelfLife) || 3;
  } else if (lowerShelfLife.includes('week')) {
    const weeks = parseInt(lowerShelfLife) || 1;
    date.setDate(date.getDate() + (weeks * 7));
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } else if (lowerShelfLife.includes('day')) {
    const days = parseInt(lowerShelfLife) || 30;
    date.setDate(date.getDate() + days);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } else {
    months = parseInt(lowerShelfLife) || 3;
  }

  date.setMonth(date.getMonth() + months);

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

/**
 * Generate all Barcode Stickers for an order (compiled PDF)
 * Each item generates quantity stickers, all with the same barcode
 */
export function generateOrderBarcodeStickers(items: OrderItemForSticker[]): jsPDF {
  const widthMm = 30;
  const heightMm = 15;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  let isFirstPage = true;

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage([heightMm, widthMm], 'landscape');
      }
      isFirstPage = false;

      const data: BarcodeStickerData = {
        productName: item.productName,
        barcode13: item.barcode13
      };

      drawBarcodeStickerContent(doc, data, widthMm, heightMm);
    }
  }

  return doc;
}

/**
 * Generate all Product Stickers for an order (compiled PDF)
 * @param items - Order items to generate stickers for
 * @param orderDate - Order date for calculating BBD
 * @param gpbnCode - GPBN code to use (if fixedGpbn is true, this is used for all stickers)
 * @param fixedGpbn - If true, use the same GPBN code for all stickers (based on delivery date)
 */
export function generateOrderProductStickers(
  items: OrderItemForSticker[],
  orderDate: string | Date,
  gpbnCode: string | null = null,
  fixedGpbn: boolean = false
): { doc: jsPDF; lastGpbnCode: string } {
  const widthMm = 30;
  const heightMm = 15;

  // DEBUG: Log what items we received
  console.log('=== STICKER GENERATOR DEBUG ===');
  console.log('Items received:', items);
  items.forEach((item, idx) => {
    console.log(`Item ${idx}: name=${item.productName}, ingredients=${item.ingredients?.substring(0, 50)}`);
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [heightMm, widthMm]
  });

  // If fixed GPBN mode, use the provided code for all stickers
  // Otherwise, increment for each sticker (legacy mode)
  let currentGpbnCode = fixedGpbn ? gpbnCode : gpbnCode;
  let isFirstPage = true;

  for (const item of items) {
    // Calculate BBD based on order date and shelf life
    const bbd = calculateBBDFromOrderDate(orderDate, item.shelfLife);

    // DEBUG: Log each item being processed
    console.log('Processing item for sticker:', item.productName, '| Ingredients:', item.ingredients?.substring(0, 50));

    for (let i = 0; i < item.quantity; i++) {
      if (!isFirstPage) {
        doc.addPage([heightMm, widthMm], 'landscape');
      }
      isFirstPage = false;

      // If not fixed mode, generate next GPBN code for each sticker
      if (!fixedGpbn) {
        currentGpbnCode = generateNextGpbnCode(currentGpbnCode);
      } else if (!currentGpbnCode) {
        // If fixed mode but no code provided, use default
        currentGpbnCode = 'GPBN3000';
      }

      const data: ProductStickerData = {
        productName: item.productName,
        ingredients: item.ingredients || 'No ingredients listed',
        bbd: bbd,
        gpbnCode: currentGpbnCode
      };

      console.log('Drawing sticker with data:', data.productName, '| Ingredients:', data.ingredients?.substring(0, 50));

      drawProductStickerContent(doc, data, widthMm, heightMm);
    }
  }

  return { doc, lastGpbnCode: currentGpbnCode || 'GPBN3000' };
}

/**
 * Helper function to draw barcode sticker content on a page
 */
function drawBarcodeStickerContent(doc: jsPDF, data: BarcodeStickerData, widthMm: number, heightMm: number): void {
  const marginMm = 1.5;
  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Product Name at top (bold, center aligned, can wrap to max 3 lines)
  doc.setFont('helvetica', 'bold');
  let nameFontSize = 5.5;
  doc.setFontSize(nameFontSize);

  while (nameFontSize > 3.5 && doc.getTextWidth(data.productName) > contentWidth * 2.5) {
    nameFontSize -= 0.3;
    doc.setFontSize(nameFontSize);
  }

  let nameLines = doc.splitTextToSize(data.productName, contentWidth);
  if (nameLines.length > 3) {
    nameLines = nameLines.slice(0, 3);
  }

  const lineHeight = nameFontSize * 0.4;
  let currentY = marginMm + 1.5;

  nameLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    const lineX = contentStartX + (contentWidth - lineWidth) / 2;
    doc.text(line, lineX, currentY);
    currentY += lineHeight;
  });

  // Barcode
  const barcodeStartY = currentY + 0.3;
  const barcodeHeight = 5;
  const barcodeWidth = contentWidth * 0.85;
  const barcodeX = contentStartX + (contentWidth - barcodeWidth) / 2;

  try {
    const barcodeDataUrl = drawBarcodeToCanvas(data.barcode13, 300, 100);
    if (barcodeDataUrl) {
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, barcodeStartY, barcodeWidth, barcodeHeight);
    }
  } catch (e) {
    console.error('Error generating barcode:', e);
  }

  // Code below barcode
  const codeY = barcodeStartY + barcodeHeight + 1.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);

  const formattedCode = data.barcode13.split('').join(' ');
  const codeTextWidth = doc.getTextWidth(formattedCode);
  const codeX = contentStartX + (contentWidth - codeTextWidth) / 2;
  doc.text(formattedCode, codeX, codeY);
}

/**
 * Helper function to draw product sticker content on a page
 */
function drawProductStickerContent(doc: jsPDF, data: ProductStickerData, widthMm: number, heightMm: number): void {
  // DEBUG: Log what we're about to draw
  console.log('=== DRAW PRODUCT STICKER ===');
  console.log('Product:', data.productName);
  console.log('Ingredients to draw:', data.ingredients);
  console.log('BBD:', data.bbd);
  console.log('GPBN:', data.gpbnCode);

  const marginMm = 1.5;
  const contentWidth = widthMm - (marginMm * 2);
  const contentStartX = marginMm;

  // Product Name at top (bold, center aligned, can wrap)
  doc.setFont('helvetica', 'bold');
  let nameFontSize = 5.5;
  doc.setFontSize(nameFontSize);

  while (nameFontSize > 3.5 && doc.getTextWidth(data.productName) > contentWidth * 2.5) {
    nameFontSize -= 0.3;
    doc.setFontSize(nameFontSize);
  }

  let nameLines = doc.splitTextToSize(data.productName, contentWidth);
  if (nameLines.length > 3) {
    nameLines = nameLines.slice(0, 3);
  }

  const nameLineHeight = nameFontSize * 0.4;
  let currentY = marginMm + 1.5;

  nameLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    const lineX = contentStartX + (contentWidth - lineWidth) / 2;
    doc.text(line, lineX, currentY);
    currentY += nameLineHeight;
  });

  // BBD and GPBN at bottom
  const bbdCodeY = heightMm - marginMm - 0.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  const bbdText = `BBD: ${data.bbd} ${data.gpbnCode}`;
  const bbdWidth = doc.getTextWidth(bbdText);
  const bbdX = contentStartX + (contentWidth - bbdWidth) / 2;
  doc.text(bbdText, bbdX, bbdCodeY);

  // Ingredients in middle
  const ingredientsStartY = currentY + 0.8;
  const ingredientsEndY = bbdCodeY - 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);

  const ingredientLines = doc.splitTextToSize(data.ingredients, contentWidth);
  const ingredientLineHeight = 1.3;
  const availableHeight = ingredientsEndY - ingredientsStartY;
  const maxLines = Math.floor(availableHeight / ingredientLineHeight);
  const displayLines = ingredientLines.slice(0, Math.max(1, maxLines));

  let ingredientY = ingredientsStartY;
  displayLines.forEach((line: string, index: number) => {
    if (ingredientY + ingredientLineHeight > ingredientsEndY) return;

    if (index < displayLines.length - 1 && line.trim().length > 0) {
      const words = line.split(' ').filter((w: string) => w.length > 0);
      if (words.length > 1) {
        const totalWordsWidth = words.reduce((sum: number, word: string) => sum + doc.getTextWidth(word), 0);
        const spaceWidth = (contentWidth - totalWordsWidth) / (words.length - 1);
        let xPos = contentStartX;
        words.forEach((word: string, wordIndex: number) => {
          doc.text(word, xPos, ingredientY);
          if (wordIndex < words.length - 1) {
            xPos += doc.getTextWidth(word) + spaceWidth;
          }
        });
      } else {
        doc.text(line, contentStartX, ingredientY);
      }
    } else {
      doc.text(line, contentStartX, ingredientY);
    }
    ingredientY += ingredientLineHeight;
  });
}

/**
 * Download all Barcode Stickers for an order
 */
export function downloadOrderBarcodeStickers(items: OrderItemForSticker[], filename: string): void {
  const doc = generateOrderBarcodeStickers(items);
  doc.save(filename);
}

/**
 * Download all Product Stickers for an order
 * @param items - Order items to generate stickers for
 * @param orderDate - Order date for calculating BBD
 * @param filename - Output filename
 * @param gpbnCode - GPBN code to use
 * @param fixedGpbn - If true, use the same GPBN code for all stickers (based on delivery date)
 */
export function downloadOrderProductStickers(
  items: OrderItemForSticker[],
  orderDate: string | Date,
  filename: string,
  gpbnCode: string | null = null,
  fixedGpbn: boolean = false
): string {
  const { doc, lastGpbnCode } = generateOrderProductStickers(items, orderDate, gpbnCode, fixedGpbn);
  doc.save(filename);
  return lastGpbnCode;
}

/**
 * Generate blob URL for order barcode stickers preview
 */
export function generateOrderBarcodeStickersPreview(items: OrderItemForSticker[]): string {
  const doc = generateOrderBarcodeStickers(items);
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}

/**
 * Generate blob URL for order product stickers preview
 * @param items - Order items to generate stickers for
 * @param orderDate - Order date for calculating BBD
 * @param gpbnCode - GPBN code to use
 * @param fixedGpbn - If true, use the same GPBN code for all stickers (based on delivery date)
 */
export function generateOrderProductStickersPreview(
  items: OrderItemForSticker[],
  orderDate: string | Date,
  gpbnCode: string | null = null,
  fixedGpbn: boolean = false
): { previewUrl: string; lastGpbnCode: string } {
  const { doc, lastGpbnCode } = generateOrderProductStickers(items, orderDate, gpbnCode, fixedGpbn);
  const pdfBlob = doc.output('blob');
  return { previewUrl: URL.createObjectURL(pdfBlob), lastGpbnCode };
}
