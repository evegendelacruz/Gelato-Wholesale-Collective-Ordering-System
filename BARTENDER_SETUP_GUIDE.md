# BarTender Label Printing Setup Guide

## Overview
This guide will help you set up BarTender to print labels using your Toshiba B-415 sticker printer.

## System Requirements
- BarTender 2021 or later (UltraLite edition or higher)
- Toshiba B-415 printer driver installed
- Label size: 90mm x 50mm (landscape orientation)

## Quick Start

### 1. Download the Print Package
When you click "Print Labels (BTW)" in the application, it will download a ZIP file containing:
- `LabelTemplate.btw` - The BarTender template
- `[OrderName].csv` - Your label data
- `HOW_TO_PRINT.txt` - Quick reference instructions

### 2. Extract and Open
1. Extract the ZIP file to a folder
2. Double-click `LabelTemplate.btw` to open it in BarTender

### 3. Connect the CSV Data Source

#### First Time Setup:
1. In BarTender, go to **File → Database Connection Setup** (or **Edit → Database Connections**)
2. Click **Add Database Connection**
3. Select **Text File** or **CSV File** as the connection type
4. Click **Browse** and select your `.csv` file
5. In the connection settings:
   - **First Row Contains Field Names**: ✅ Check this box
   - **Delimiter**: Comma
   - **Text Qualifier**: Double quote (")
6. Click **Next** and then **Finish**

#### Subsequent Prints:
If you already have the template set up:
1. Go to **File → Database Connection Setup**
2. Update the file path to point to your new CSV file
3. Or simply use the "CSV Only" button to download just the data file and refresh in BarTender

### 4. Map the Fields
The CSV contains these columns that should be mapped to text objects in your label:

| CSV Column Name | Description | Required |
|----------------|-------------|----------|
| `CompanyName` | Client's business name | Yes |
| `ProductName` | Product name | Yes |
| `Allergens` | Allergen information | Yes |
| `BestBefore` | Best before date (DD/MM/YYYY) | Yes |
| `BatchNumber` | Batch number | Yes |
| `Ingredients` | Ingredients list (client orders only) | Optional |

**IMPORTANT**: In BarTender, each Text Object's **Data Source** must be named EXACTLY as shown above (case-sensitive).

### 5. Configure Text Objects in BarTender

For each field on your label:
1. Right-click the text object
2. Select **Properties** or **Data Source**
3. Choose **Database Field**
4. Select the matching column name from the dropdown

Example field mapping:
```
Text Object 1 → Data Source: CompanyName
Text Object 2 → Data Source: ProductName
Text Object 3 → Data Source: Allergens
Text Object 4 → Data Source: BestBefore
Text Object 5 → Data Source: BatchNumber
Text Object 6 → Data Source: Ingredients (if client order)
```

### 6. Print Settings
1. Click **File → Print** (or press Ctrl+P)
2. Printer: Select your **Toshiba B-415**
3. **IMPORTANT**: Set **Copies** to **1**
   - The CSV already contains the correct number of rows based on quantity
   - Each row in the CSV will print one label
4. Click **Print**

## Label Design Specifications

### Label Dimensions
- **Width**: 90mm
- **Height**: 50mm
- **Orientation**: Landscape
- **Resolution**: 300 DPI recommended

### Layout Sections

#### Left Section (0-56mm)
- Company Name (top, 12pt, Arial Narrow)
- Product Name (bold, 10pt, Arial Narrow)
- Ingredients (6pt, Arial) - Client orders only
- Allergens (6pt, Arial, bottom area)
- Storage info (6pt, Arial, bottom)
- Halal logo (13mm x 13mm, bottom right)

#### Right Section (56-90mm)
- Best Before label (7pt, Arial)
- Best Before date (10pt, Arial Narrow Bold, white text on black background)
- Batch Number label (7pt, Arial)
- Batch Number (10pt, Arial Narrow Bold, white text on black background)
- Manufacturer info (7pt, Arial, bottom)

### Fonts
- **Arial Narrow** - Company and product names
- **Arial** - All other text
- Font files are included in `/public/assets/`:
  - ARIALN.TTF
  - ARIALNB.TTF
  - ARIAL.TTF
  - ARIALBD.TTF

## Troubleshooting

### "Cannot find Sample.btw" Error
**Solution**: Make sure `Sample.btw` exists in `/public/assets/Sample.btw`
```bash
# If missing, copy from sample folder:
cp sample/Sample.btw public/assets/Sample.btw
```

### CSV Not Loading in BarTender
**Possible causes**:
1. CSV file is corrupted or empty
2. File path is incorrect
3. BarTender doesn't have permission to access the file

**Solution**:
1. Open the CSV in Excel/Notepad to verify it contains data
2. Make sure the file isn't open in another program
3. Try saving the CSV to a simpler path (e.g., `C:\Labels\data.csv`)

### Labels Not Printing
**Check**:
1. Printer is connected and online
2. Label stock is loaded correctly (90mm x 50mm)
3. Printer driver is set to correct paper size
4. Print preview shows labels correctly

### Field Values Not Appearing
**Solution**:
1. Open **Database Connection Setup** in BarTender
2. Verify the connection is active (green icon)
3. Right-click each text object → Properties → Data Source
4. Make sure the column name matches EXACTLY (case-sensitive)

### Wrong Number of Labels Printing
**Cause**: The quantity is already built into the CSV
**Solution**: Always set **Copies = 1** in the print dialog

## Workflow Options

### Option 1: Full Package (First Time / Occasional Use)
Click **"Print Labels (BTW)"** button
- Downloads: Template + CSV + Instructions in a ZIP
- Best for: First-time setup, sharing with others, or archiving

### Option 2: CSV Only (Daily Use - Fastest)
Click **"CSV Only"** button
- Downloads: Just the data CSV
- Best for: Daily production when you already have the template open in BarTender
- Workflow:
  1. Keep BarTender open with the template
  2. Download CSV only
  3. Refresh the database connection in BarTender
  4. Print immediately

### Option 3: PDF (Backup / Non-BarTender Printing)
Click **"PDF"** button
- Generates a printable PDF
- Best for: Backup, email sharing, or printing on non-specialized printers
- Note: May not be exact size for sticker printer

## Advanced: Creating Your Own Template

### If you want to create a new BTW template from scratch:

1. **Create New Document** in BarTender
   - Size: 90mm x 50mm
   - Orientation: Landscape

2. **Add Text Objects** for each field
   - Position them according to the layout specs above

3. **Set Data Sources**
   - For each text object, set Data Source type to "Database Field"
   - Name them: CompanyName, ProductName, Allergens, etc.

4. **Add Halal Logo**
   - Insert → Picture
   - Browse to `/public/assets/halal.png`
   - Size: 13mm x 13mm

5. **Set Printer**
   - File → Page Setup → Printer: Toshiba B-415
   - Stock: 90mm x 50mm

6. **Save the Template**
   - Save as `Sample.btw`
   - Copy to `/public/assets/Sample.btw` in your project

7. **Test with Sample Data**
   - Create a test CSV with the column names
   - Connect and print to verify layout

## Support

### Common Issues
- **White text on black background not showing**: Use BarTender's Rich Text feature or create a black rectangle behind white text
- **Fonts look different**: Install the exact font files from `/public/assets/` on your computer
- **Logo not printing**: Convert logo to embedded image in BarTender (not linked)

### CSV Data Format
The system automatically generates CSV data with:
- Windows line endings (`\r\n`)
- Comma delimiters
- Double-quote text qualifiers
- UTF-8 encoding

### File Locations
```
project/
├── public/
│   └── assets/
│       ├── Sample.btw          ← BarTender template (required)
│       ├── halal.png           ← Halal logo image
│       ├── ARIALN.TTF          ← Font files
│       ├── ARIALNB.TTF
│       ├── ARIAL.TTF
│       └── ARIALBD.TTF
├── sample/
│   └── Sample.btw              ← Original template (backup)
└── lib/
    └── bartenderPrint.ts       ← Label generation code
```

## Quick Reference Card

### Print Workflow
1. ✅ Edit labels in web app (if needed)
2. ✅ Click "Print Labels (BTW)"
3. ✅ Extract ZIP file
4. ✅ Open LabelTemplate.btw in BarTender
5. ✅ Connect CSV (first time only)
6. ✅ Set Copies = 1
7. ✅ Click Print

### Required Field Names (Case-Sensitive)
- `CompanyName`
- `ProductName`
- `Allergens`
- `BestBefore`
- `BatchNumber`
- `Ingredients` (optional)

### Printer Settings
- **Printer**: Toshiba B-415
- **Size**: 90mm x 50mm landscape
- **Copies**: 1 (quantity already in CSV)

---

**Questions?** Check the HOW_TO_PRINT.txt file included in each print package.
