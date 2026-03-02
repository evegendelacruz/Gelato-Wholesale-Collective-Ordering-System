# BarTender Template Configuration Guide

This guide explains how to configure the BarTender template (Sample.btw) with the correct field mappings for your label printer.

## Template Requirements

**File**: Sample.btw
**Location**: `/public/assets/Sample.btw`
**Label Size**: 90mm x 50mm (landscape)
**Printer**: Toshiba B-415

## Data Source Fields

The BarTender template must have **Text Objects** with **Database Field** data sources matching these exact names:

### Required Fields (All Labels)

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `CompanyName` | Text | Client's business name | "Momolato Pte Ltd" |
| `ProductName` | Text | Product name/description | "Original Pork Gyoza" |
| `Allergens` | Text | Allergen warning information | "Contains: Wheat, Soy..." |
| `BestBefore` | Text | Best before date | "15/09/2026" |
| `BatchNumber` | Text/Number | Production batch code | "BATCH001" |

### Optional Fields (Client Orders Only)

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `Ingredients` | Text | Full ingredient list | "Pork, Cabbage, Garlic..." |

> ⚠️ **CRITICAL**: Field names are **CASE-SENSITIVE**. They must match exactly as shown above.

## Configuring Text Objects in BarTender

### For Each Field:

1. **Create or Select Text Object**
   - Click the "Text" tool in BarTender
   - Draw a text box on your label
   - Or select an existing text object

2. **Set Data Source to Database Field**
   - Right-click the text object → **Properties**
   - OR double-click the text object
   - Go to the **Data Sources** tab

3. **Configure Database Field**
   - Click **Add** → **Database Field**
   - In the **Field Name** dropdown, select the matching column
   - OR manually type the field name (must match exactly!)

4. **Formatting**
   - Set font, size, alignment as needed
   - For Best Before and Batch Number: consider using **Rich Text** for white text on black background

## Label Layout Configuration

### Left Section (0mm - 56mm)

#### Company Name
- **Position**: Top-left (5mm, 8.5mm)
- **Data Source**: `CompanyName`
- **Font**: Arial Narrow, 11pt
- **Style**: Normal
- **Color**: Black

#### Product Name
- **Position**: Below company name (5mm, 20.5mm)
- **Data Source**: `ProductName`
- **Font**: Arial Narrow, 8pt
- **Style**: Bold
- **Color**: Black
- **Multi-line**: Yes (max 3 lines)

#### Ingredients (Client Orders Only)
- **Position**: Below product name (5mm, ~32mm)
- **Data Source**: `Ingredients`
- **Font**: Arial, 4.5pt
- **Style**: Normal
- **Color**: Black
- **Prefix**: Add static text "INGREDIENTS:" with underline
- **Multi-line**: Yes (max 3 lines)

#### Allergens
- **Position**: Bottom area, above storage (5mm, ~37mm)
- **Data Source**: `Allergens`
- **Font**: Arial, 4.5pt
- **Style**: Normal
- **Color**: Black
- **Prefix**: Add static text "ALLERGENS:"
- **Multi-line**: Yes

#### Storage Info
- **Position**: Bottom (5mm, 43mm)
- **Static Text**: "Keep frozen. Store below -18 degree Celsius. Do not re-freeze once thawed."
- **Font**: Arial, 4.5pt
- **Style**: Normal
- **Color**: Black
- **Multi-line**: Yes

#### Halal Logo
- **Position**: Bottom-right of left section (34mm, 32.8mm)
- **Image File**: `/public/assets/halal.png`
- **Size**: 13mm x 13mm
- **Type**: Embedded (not linked)

### Right Section (56mm - 90mm)

#### Best Before Label
- **Position**: Top-right (49mm, 13mm)
- **Static Text**: "Best Before (dd/mm/yyyy)"
- **Font**: Arial, 5pt
- **Style**: Normal
- **Color**: Black

#### Best Before Date
- **Position**: Below label (49mm, 17mm)
- **Data Source**: `BestBefore`
- **Font**: Arial Narrow, 8pt
- **Style**: Bold
- **Color**: White
- **Background**: Black rectangle (fit to text width)
- **Format**: DD/MM/YYYY

#### Batch Number Label
- **Position**: Below best before (49mm, 25mm)
- **Static Text**: "Batch Number"
- **Font**: Arial, 5pt
- **Style**: Normal
- **Color**: Black

#### Batch Number Value
- **Position**: Below label (49mm, 29mm)
- **Data Source**: `BatchNumber`
- **Font**: Arial Narrow, 8pt
- **Style**: Bold
- **Color**: White
- **Background**: Black rectangle (fit to text width)

#### Manufacturer Info
- **Position**: Bottom-right (49mm, 36mm)
- **Static Text**: Multi-line text:
  ```
  Manufactured by:
  Momolato Pte Ltd
  21 Tampines St 92 #04-06
  Singapore 528891
  UEN: 201319550R
  ```
- **Font**: Arial, 5pt
- **Style**: Normal
- **Color**: Black
- **Line Spacing**: 2.2mm

## Creating White Text on Black Background

### Method 1: Using Shapes
1. Insert → Shape → Rectangle
2. Size and position behind the text object
3. Set fill color to Black
4. Send to back (Right-click → Order → Send to Back)
5. Set text color to White

### Method 2: Using Rich Text
1. Right-click text object → Properties
2. Enable **Rich Text**
3. Set Background Color: Black
4. Set Text Color: White
5. Adjust padding if needed

## Database Connection Setup

### Step 1: Add Connection
1. File → **Database Connection Setup**
2. Click **Add Database Connection**
3. Select **Text File** or **CSV File**

### Step 2: Configure Connection
- **File Format**: CSV (Comma Separated Values)
- **First Row**: Contains Field Names ✅
- **Delimiter**: Comma (,)
- **Text Qualifier**: Double Quote (")
- **Encoding**: UTF-8

### Step 3: Test Connection
1. After connecting, click **Database → View Sample Data**
2. Verify all columns appear with correct data
3. Check that field names match exactly

### Step 4: Map Fields
BarTender should auto-map fields if names match. Verify:
1. Each text object shows correct data in preview
2. Database icon appears green (active connection)
3. Print preview displays sample data correctly

## Page Setup

### Document Settings
- **Size**: 90mm x 50mm
- **Orientation**: Landscape
- **Units**: Millimeters (mm)

### Printer Settings
- **Name**: Toshiba B-415
- **Port**: Your printer port (USB, LPT1, or network)
- **Driver Version**: Latest from Toshiba

### Stock Settings
- **Width**: 90mm
- **Height**: 50mm
- **Roll**: Continuous
- **Gap/Notch**: Adjust based on your label stock

## Font Installation

Install these fonts on your computer for best results:

```
public/assets/ARIALN.TTF    → Arial Narrow Regular
public/assets/ARIALNB.TTF   → Arial Narrow Bold
public/assets/ARIAL.TTF     → Arial Regular
public/assets/ARIALBD.TTF   → Arial Bold
```

### How to Install Fonts:
1. Right-click the .TTF file
2. Click "Install" or "Install for all users"
3. Restart BarTender after installation

## Saving the Template

### Save Steps:
1. File → **Save As**
2. Save as: `Sample.btw`
3. Location: `/public/assets/Sample.btw` in your project
4. **Important**: Also keep a backup copy in `/sample/Sample.btw`

### Before Saving:
- ✅ All fields are mapped correctly
- ✅ Database connection is configured
- ✅ Printer is set to Toshiba B-415
- ✅ Page size is 90mm x 50mm landscape
- ✅ Test print successful

## Testing the Template

### Test with Sample Data

Use the provided test CSV:
```
public/assets/bartender/SAMPLE_TEST_DATA.csv
```

### Test Procedure:
1. **Open Sample.btw** in BarTender
2. **Connect** to SAMPLE_TEST_DATA.csv
3. **Print Preview** - verify all 3 test labels appear correctly
4. **Check** that data appears in all fields
5. **Print** one label to verify physical output
6. **Measure** the printed label (should be 90mm x 50mm)

### What to Check:
- ✅ All text is readable
- ✅ Halal logo appears clearly
- ✅ White text on black background is legible
- ✅ Text doesn't overflow boundaries
- ✅ Alignment is correct
- ✅ No truncated text

## Common Template Issues

### Issue: Fields Show "???" or Are Empty
**Cause**: Database field name doesn't match CSV column
**Fix**:
1. Right-click text object → Properties
2. Data Sources → Database Field
3. Verify field name spelling and capitalization

### Issue: Text Overflows
**Cause**: Font size too large or text box too small
**Fix**:
1. Reduce font size
2. Enlarge text box
3. Enable text wrapping
4. Increase line spacing

### Issue: Logo Doesn't Print
**Cause**: Image is linked, not embedded
**Fix**:
1. Right-click logo → Properties
2. Change to "Embedded" instead of "Linked"
3. Or: Delete and re-insert as embedded image

### Issue: White Text Not Visible
**Cause**: Background not set correctly
**Fix**:
1. Ensure black rectangle is behind white text
2. Use "Send to Back" on the rectangle
3. Or use Rich Text with background color

### Issue: Wrong Number of Labels Print
**Cause**: Copies set > 1 in print settings
**Fix**:
1. CSV already contains correct quantity
2. Always set Copies = 1
3. Save printer preferences

## Template Validation Checklist

Before deploying to production:

### Structure
- [ ] Document size: 90mm x 50mm landscape
- [ ] All margins properly set
- [ ] Text objects don't overlap
- [ ] All elements fit within printable area

### Data Sources
- [ ] CompanyName field configured
- [ ] ProductName field configured
- [ ] Allergens field configured
- [ ] BestBefore field configured
- [ ] BatchNumber field configured
- [ ] Ingredients field configured (if needed)
- [ ] All field names match CSV exactly (case-sensitive)

### Formatting
- [ ] Fonts are installed and accessible
- [ ] Text sizes are appropriate and readable
- [ ] White-on-black fields have proper backgrounds
- [ ] Halal logo is embedded and displays correctly
- [ ] Multi-line fields wrap correctly

### Database
- [ ] Database connection works
- [ ] Sample data displays correctly
- [ ] All CSV columns are recognized
- [ ] Connection icon shows green (active)

### Printer
- [ ] Toshiba B-415 selected
- [ ] Page setup matches label stock
- [ ] Test print successful
- [ ] Print quality acceptable

### Files
- [ ] Template saved to: /public/assets/Sample.btw
- [ ] Backup saved to: /sample/Sample.btw
- [ ] Test CSV available: /public/assets/bartender/SAMPLE_TEST_DATA.csv

## Maintenance

### Regular Checks:
- Test template monthly with sample data
- Verify fonts are still installed after system updates
- Keep backup copies of working templates
- Document any customizations made

### After Printer/Driver Updates:
- Retest label size and alignment
- Verify page setup settings
- Check print quality
- Adjust if needed

### Version Control:
- Date your template files (e.g., Sample_2026-03-02.btw)
- Keep changelog of modifications
- Test thoroughly before replacing production template

## Support Resources

### Documentation:
- Full Guide: `/BARTENDER_SETUP_GUIDE.md`
- Quick Setup: `/public/assets/bartender/QUICK_SETUP.txt`
- Sample Data: `/public/assets/bartender/SAMPLE_TEST_DATA.csv`

### BarTender Resources:
- BarTender Help: F1 in application
- Seagull Scientific Support: www.seagullscientific.com/support
- BarTender University: Free training courses online

### Toshiba Printer:
- Driver Downloads: Toshiba Tec website
- User Manual: Check printer documentation
- Technical Support: Toshiba Tec support line

---

**Template Version**: 1.0
**Last Updated**: 2026-03-02
**Printer**: Toshiba B-415
**Label Size**: 90mm × 50mm (landscape)
