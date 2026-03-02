/**
 * BarTender Print Utility
 *
 * HOW IT WORKS:
 * BarTender's .btw format is a proprietary binary — it cannot be generated
 * from JavaScript. Instead, this utility:
 *   1. Fetches the original Sample.btw template from /public/assets/Sample.btw
 *   2. Generates a CSV whose columns match the named fields in that template
 *   3. Downloads a ZIP (template + CSV + instructions) the user opens in BarTender
 *
 * SETUP:
 *   - Copy your Sample.btw into:  public/assets/Sample.btw
 *   - In BarTender, rename each Text Object's Data Source to match:
 *       CompanyName, ProductName, Allergens, BestBefore, BatchNumber, Ingredients (optional)
 *   - npm install jszip  (if not already installed)
 *
 * Label size: 90mm x 50mm (landscape)
 * Printer: Toshiba B-415
 */

import JSZip from 'jszip';

export interface LabelData {
  companyName: string;
  productName: string;
  ingredients?: string;
  allergen: string;
  bestBefore: string;   // DD/MM/YYYY
  batchNumber: string;
  quantity?: number;
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV field value.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
const csvField = (value: string | number | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Build a CSV string whose column names match the BarTender template fields.
 * Each label row is repeated `quantity` times so BarTender prints the correct
 * number of copies without any manual copy-count in the print dialog.
 */
export const buildBarTenderCSV = (
  labels: LabelData[],
  includeIngredients = false
): string => {
  const headers = [
    'CompanyName',
    'ProductName',
    'Allergens',
    'BestBefore',
    'BatchNumber',
    ...(includeIngredients ? ['Ingredients'] : []),
  ];

  const rows: string[] = [headers.join(',')];

  for (const label of labels) {
    const qty = Math.max(1, label.quantity || 1);
    const row = [
      csvField(label.companyName),
      csvField(label.productName),
      csvField(label.allergen),
      csvField(label.bestBefore),
      csvField(label.batchNumber),
      ...(includeIngredients ? [csvField(label.ingredients ?? '')] : []),
    ].join(',');

    for (let i = 0; i < qty; i++) {
      rows.push(row);
    }
  }

  return rows.join('\r\n'); // Windows line endings — required by BarTender
};

// ---------------------------------------------------------------------------
// Download: ZIP (template .btw + data CSV + instructions)
// ---------------------------------------------------------------------------

/**
 * Downloads a ZIP containing:
 *   - LabelTemplate.btw  — the original binary BarTender template
 *   - <filename>.csv     — the generated data file
 *   - HOW_TO_PRINT.txt   — step-by-step instructions
 *
 * The user opens LabelTemplate.btw in BarTender, connects the CSV as the
 * data source, and clicks Print.
 */
export const downloadBTWFile = async (
  labels: LabelData[],
  filename: string,
  includeIngredients = false
): Promise<void> => {
  const zip = new JSZip();

  // 1. Fetch the binary .btw template from /public/assets/
  const btwResponse = await fetch('/assets/Sample.btw');
  if (!btwResponse.ok) {
    throw new Error(
      'Could not load /assets/Sample.btw. ' +
      'Make sure Sample.btw is copied into the public/assets/ folder of your project.'
    );
  }
  const btwBuffer = await btwResponse.arrayBuffer();
  zip.file('LabelTemplate.btw', btwBuffer);

  // 2. Generate and add CSV
  const csv = buildBarTenderCSV(labels, includeIngredients);
  const baseName = filename.replace(/\.btw$/i, '').replace(/\.zip$/i, '');
  zip.file(`${baseName}.csv`, csv);

  // 3. Instructions
  const fieldList = ['CompanyName', 'ProductName', 'Allergens', 'BestBefore', 'BatchNumber'];
  if (includeIngredients) fieldList.push('Ingredients');

  const readme = [
    '╔═══════════════════════════════════════════════════════════════════╗',
    '║              BARTENDER LABEL PRINTING INSTRUCTIONS                ║',
    '╚═══════════════════════════════════════════════════════════════════╝',
    '',
    '📦 PACKAGE CONTENTS',
    '==================',
    '✓ LabelTemplate.btw  - BarTender template file',
    `✓ ${baseName}.csv    - Your label data`,
    '✓ This instruction file',
    '',
    '🚀 QUICK START (First Time Setup)',
    '==================================',
    '',
    'STEP 1: EXTRACT FILES',
    '  → Extract this entire ZIP to a folder on your computer',
    '',
    'STEP 2: OPEN TEMPLATE',
    '  → Double-click LabelTemplate.btw',
    '  → BarTender will open automatically',
    '',
    'STEP 3: CONNECT DATA SOURCE',
    '  A. Go to: File → Database Connection Setup',
    '     (or Edit → Database Connections)',
    '',
    '  B. Click: "Add Database Connection"',
    '',
    '  C. Select: "Text File" or "CSV File"',
    '',
    `  D. Browse to: ${baseName}.csv (in the extracted folder)`,
    '',
    '  E. Configure CSV settings:',
    '     ✓ First row contains field names: YES',
    '     ✓ Delimiter: Comma',
    '     ✓ Text qualifier: Double quote (")',
    '',
    '  F. Click: Next → Finish',
    '',
    'STEP 4: VERIFY FIELD MAPPING',
    '  The following CSV columns should map to text objects:',
    '',
    ...fieldList.map(f => `     • ${f}`),
    '',
    '  ⚠️ IMPORTANT: Field names are CASE-SENSITIVE!',
    '  In BarTender, right-click each text object → Properties → Data Source',
    '  Make sure the data source name matches the CSV column exactly.',
    '',
    'STEP 5: CONFIGURE PRINTER',
    '  A. Go to: File → Page Setup',
    '  B. Select Printer: Toshiba B-415',
    '  C. Paper Size: 90mm x 50mm (landscape)',
    '  D. Click: OK',
    '',
    'STEP 6: PRINT',
    '  A. File → Print Preview (to verify layout)',
    '  B. File → Print (or press Ctrl+P)',
    '  C. ⚠️ CRITICAL: Set Copies = 1',
    '     (The CSV already contains the correct quantity!)',
    '  D. Click: Print',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '⚡ NEXT TIME (Quick Workflow)',
    '=============================',
    '',
    'Already have BarTender set up? Here\'s the fast way:',
    '',
    '1. Download CSV ONLY (use "CSV Only" button in the app)',
    '2. Save to same location as before',
    '3. In BarTender: Database → Refresh Connection',
    '4. Print (Copies = 1)',
    '',
    'This is the fastest method for daily production!',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '⚠️ IMPORTANT NOTES',
    '==================',
    '',
    '❌ DO NOT set Copies > 1 in print dialog',
    '   Each row in the CSV = one label',
    '   Quantity is already calculated in the data',
    '   Always use: Copies = 1',
    '',
    '✓ CSV Format:',
    `   • Total labels in this file: Check the CSV (each row = 1 label)`,
    '   • Labels are already duplicated based on quantity ordered',
    '   • Format: Windows (CRLF), UTF-8, Comma-delimited',
    '',
    '✓ Printer Settings:',
    '   • Printer: Toshiba B-415',
    '   • Size: 90mm x 50mm',
    '   • Orientation: Landscape',
    '   • Resolution: 300 DPI',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '🔧 TROUBLESHOOTING',
    '==================',
    '',
    'PROBLEM: Cannot connect to CSV',
    'SOLUTION:',
    '  • Close the CSV if open in Excel',
    '  • Check the file path is correct',
    '  • Try moving files to C:\\Labels\\ (simpler path)',
    '',
    'PROBLEM: Fields are empty',
    'SOLUTION:',
    '  • Right-click text object → Properties',
    '  • Verify Data Source name matches CSV column exactly',
    '  • Refresh database connection (Database → Refresh)',
    '',
    'PROBLEM: Wrong number of labels',
    'SOLUTION:',
    '  • Check that Copies = 1 in print dialog',
    '  • Each CSV row prints one label',
    '  • Open CSV in Notepad to count rows (minus header)',
    '',
    'PROBLEM: Layout looks wrong',
    'SOLUTION:',
    '  • Check File → Page Setup → Stock: 90mm x 50mm',
    '  • Orientation should be Landscape',
    '  • Try Print Preview first',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '📋 FIELD REFERENCE',
    '==================',
    '',
    'CSV Column      | Description                | Format',
    '----------------+----------------------------+------------------',
    'CompanyName     | Client business name       | Text',
    'ProductName     | Product description        | Text',
    'Allergens       | Allergen information       | Text',
    'BestBefore      | Expiration date            | DD/MM/YYYY',
    'BatchNumber     | Production batch code      | Text/Number',
    includeIngredients ? 'Ingredients     | Full ingredient list       | Text' : '',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '📞 NEED MORE HELP?',
    '==================',
    '',
    'Check the full documentation:',
    '  → BARTENDER_SETUP_GUIDE.md (in project root)',
    '  → public/assets/bartender/QUICK_SETUP.txt',
    '',
    'Test with sample data:',
    '  → public/assets/bartender/SAMPLE_TEST_DATA.csv',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    '✅ QUICK CHECKLIST',
    '==================',
    '',
    'Before printing, verify:',
    '□ BarTender is open',
    '□ LabelTemplate.btw is loaded',
    '□ CSV connection is active (green icon)',
    '□ Print preview shows data correctly',
    '□ Printer: Toshiba B-415',
    '□ Paper: 90mm x 50mm landscape',
    '□ Copies: 1',
    '□ Labels loaded in printer',
    '',
    '═══════════════════════════════════════════════════════════════════',
    '',
    'Generated by: Momolato Ordering System',
    `Date: ${new Date().toLocaleString()}`,
    'Label Size: 90 × 50 mm (landscape) | Printer: Toshiba B-415',
  ].filter(line => line !== '').join('\r\n');

  zip.file('HOW_TO_PRINT.txt', readme);

  // 4. Trigger download
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const zipFilename = `${baseName}_PrintPackage.zip`;
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Download: CSV only (quick path for daily use)
// ---------------------------------------------------------------------------

/**
 * Downloads just the CSV data file.
 * Use this when BarTender already has the template open and the user just
 * needs to refresh the data — fastest option for daily printing.
 */
export const downloadCSVOnly = (
  labels: LabelData[],
  filename: string,
  includeIngredients = false
): void => {
  const csv = buildBarTenderCSV(labels, includeIngredients);
  const baseName = filename.replace(/\.btw$/i, '').replace(/\.csv$/i, '');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Native browser print (kept for the PDF / JPEG fallback path)
// ---------------------------------------------------------------------------

/**
 * Opens a new print window and triggers the browser's native print dialog.
 * Used by the PDF and JPEG label paths — not related to BarTender.
 */
export const printLabelsNative = (
  labelsHtml: string,
  title = 'Print Labels'
): void => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Please allow popups to print labels');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page {
          size: 90mm 50mm landscape;
          margin: 0;
        }
        body { margin: 0; padding: 0; }
        .label-page {
          width: 90mm;
          height: 50mm;
          page-break-after: always;
          position: relative;
          overflow: hidden;
        }
        .label-page:last-child { page-break-after: auto; }
        .label-image { width: 100%; height: 100%; object-fit: contain; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${labelsHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
};