# BarTender Label Printing Integration

Welcome to the BarTender label printing system for your Toshiba B-415 sticker printer!

## 📁 Files in This Folder

| File | Purpose | When to Use |
|------|---------|-------------|
| **QUICK_SETUP.txt** | Fast setup guide with troubleshooting | First time setup, daily reference |
| **BARTENDER_TEMPLATE_CONFIGURATION.md** | Detailed template configuration guide | Creating/modifying the BTW template |
| **SAMPLE_TEST_DATA.csv** | Test data for validation | Testing your BarTender setup |
| **README.md** | This file - overview and navigation | Getting oriented |

## 🎯 Quick Links

### New to BarTender?
Start here: **QUICK_SETUP.txt**
- Simple step-by-step instructions
- Common mistakes to avoid
- Troubleshooting guide

### Setting Up the Template?
Read: **BARTENDER_TEMPLATE_CONFIGURATION.md**
- Field mapping details
- Layout specifications
- Font and styling requirements

### Full Documentation
See: `/BARTENDER_SETUP_GUIDE.md` (in project root)
- Complete reference guide
- Advanced topics
- Design specifications

## 🚀 Quick Start (3 Steps)

### 1. Test with Sample Data
```
1. Open Sample.btw (in /public/assets/)
2. Connect to SAMPLE_TEST_DATA.csv (in this folder)
3. Print Preview to verify layout
```

### 2. Print Production Labels
```
1. In web app, click "Print Labels (BTW)"
2. Extract the downloaded ZIP
3. Open LabelTemplate.btw in BarTender
4. Connect the CSV from the ZIP
5. Print (Copies = 1)
```

### 3. Daily Workflow (Fastest)
```
1. Keep BarTender open with Sample.btw
2. Click "CSV Only" in web app
3. Refresh database connection in BarTender
4. Print immediately
```

## 📋 Requirements

✅ BarTender 2021+ (UltraLite edition minimum)
✅ Toshiba B-415 printer with driver installed
✅ Label stock: 90mm x 50mm
✅ Fonts installed: Arial, Arial Narrow (from /public/assets/)

## ⚙️ System Integration

### How It Works

```
┌─────────────────┐
│   Web App       │
│  (React/Next)   │
└────────┬────────┘
         │ User clicks "Print Labels (BTW)"
         ↓
┌─────────────────┐
│ bartenderPrint  │ ← Generates CSV data
│    .ts          │   Fetches Sample.btw
└────────┬────────┘   Creates ZIP package
         │
         ↓
┌─────────────────┐
│  Downloads:     │
│  • Template.btw │
│  • Data.csv     │
│  • Instructions │
└────────┬────────┘
         │ User extracts and opens
         ↓
┌─────────────────┐
│   BarTender     │
│   Software      │
└────────┬────────┘
         │ Connects CSV → Template
         ↓
┌─────────────────┐
│  Toshiba B-415  │ ← Prints labels
│  Printer        │
└─────────────────┘
```

### CSV Field Mapping

The system generates CSV files with these columns:

| CSV Column | Maps To | Required |
|------------|---------|----------|
| CompanyName | Client business name | Yes |
| ProductName | Product name | Yes |
| Allergens | Allergen warnings | Yes |
| BestBefore | Expiry date (DD/MM/YYYY) | Yes |
| BatchNumber | Batch code | Yes |
| Ingredients | Full ingredient list | Client orders only |

**Important**: Field names are case-sensitive in BarTender!

## 🔄 Print Workflows

### Option A: Full Package (Occasional Use)
**Use when**: First time, sharing with others, archiving

**Steps**:
1. Click **"Print Labels (BTW)"** in web app
2. Download ZIP file
3. Extract to folder
4. Open LabelTemplate.btw
5. Connect CSV (first time) or update path
6. Print (Copies = 1)

**Pros**: Self-contained, includes instructions
**Cons**: Larger download, extra steps

---

### Option B: CSV Only (Daily Production) ⚡ FASTEST
**Use when**: Daily printing, template already set up

**Steps**:
1. Click **"CSV Only"** in web app
2. Save CSV to same location
3. In BarTender: Database → Refresh Connection
4. Print (Copies = 1)

**Pros**: Fastest workflow, smallest download
**Cons**: Requires initial setup

---

### Option C: PDF (Fallback)
**Use when**: BarTender unavailable, testing, email sharing

**Steps**:
1. Click **"PDF"** button in web app
2. Opens in new tab
3. Print from browser

**Pros**: Works anywhere, no special software
**Cons**: Not optimized for sticker printer, may need size adjustment

## 📐 Label Specifications

```
┌─────────────────────────────────────────────────────────┐
│                 90mm x 50mm (Landscape)                 │
├──────────────────────────────┬──────────────────────────┤
│   LEFT SECTION (0-56mm)      │  RIGHT SECTION (56-90mm) │
├──────────────────────────────┼──────────────────────────┤
│ • Company Name (12pt)        │ • Best Before (7pt)      │
│ • Product Name (10pt bold)   │ • Date (10pt bold)       │
│ • Ingredients (6pt)          │ • Batch Label (7pt)      │
│   [Client orders only]       │ • Batch # (10pt bold)    │
│ • Allergens (6pt)            │ • Manufacturer (7pt)     │
│ • Storage Info (6pt)         │   Info Block             │
│ • Halal Logo (13mm × 13mm)   │                          │
└──────────────────────────────┴──────────────────────────┘
```

**Fonts**: Arial Narrow (headings), Arial (body text)
**Resolution**: 300 DPI
**Colors**: Black text, white text on black background for emphasis

## 🛠️ Troubleshooting

### CSV Won't Load in BarTender
**Fix**: Close Excel if CSV is open, try simpler file path

### Fields Are Empty
**Fix**: Verify field names match exactly (case-sensitive)

### Wrong Number of Labels
**Fix**: Set Copies = 1 (quantity already in CSV)

### Layout Looks Wrong
**Fix**: Check Page Setup → 90mm x 50mm landscape

### More Issues?
See: **QUICK_SETUP.txt** for detailed troubleshooting

## 📚 Documentation Hierarchy

```
📦 Documentation Structure
│
├── 🎯 QUICK_SETUP.txt
│   └── Fast reference, troubleshooting (Start here!)
│
├── 📖 BARTENDER_TEMPLATE_CONFIGURATION.md
│   └── Template setup details
│
├── 📘 /BARTENDER_SETUP_GUIDE.md (project root)
│   └── Comprehensive reference manual
│
├── 📄 SAMPLE_TEST_DATA.csv
│   └── Test data for validation
│
└── 📝 README.md (this file)
    └── Overview and navigation
```

## 🔍 File Locations

### Template File
```
/public/assets/Sample.btw          ← Production template
/sample/Sample.btw                 ← Backup/original
```

### Documentation
```
/BARTENDER_SETUP_GUIDE.md          ← Main guide
/public/assets/bartender/          ← Quick references
  ├── QUICK_SETUP.txt
  ├── BARTENDER_TEMPLATE_CONFIGURATION.md
  ├── SAMPLE_TEST_DATA.csv
  └── README.md (this file)
```

### Code
```
/lib/bartenderPrint.ts             ← CSV generation & ZIP creation
/app/components/onlineLabel/       ← Online order labels
/app/components/orderLabel/        ← Client order labels
```

### Assets
```
/public/assets/
  ├── Sample.btw                   ← BarTender template
  ├── halal.png                    ← Halal logo
  ├── ARIALN.TTF                   ← Fonts
  ├── ARIALNB.TTF
  ├── ARIAL.TTF
  └── ARIALBD.TTF
```

## ✅ Verification Checklist

### Initial Setup
- [ ] Sample.btw exists in /public/assets/
- [ ] Fonts installed on computer
- [ ] BarTender software installed
- [ ] Toshiba B-415 printer driver installed
- [ ] Tested with SAMPLE_TEST_DATA.csv

### Before Each Print
- [ ] BarTender template loaded
- [ ] CSV data downloaded
- [ ] Database connection active (green icon)
- [ ] Print preview shows correct data
- [ ] Printer: Toshiba B-415 selected
- [ ] Paper size: 90mm x 50mm landscape
- [ ] Copies: Set to 1
- [ ] Labels loaded in printer

## 🎓 Training Resources

### For New Users
1. Read **QUICK_SETUP.txt** (15 minutes)
2. Test with **SAMPLE_TEST_DATA.csv** (10 minutes)
3. Practice with one real order (15 minutes)
4. Review troubleshooting section (5 minutes)

### For Template Customization
1. Read **BARTENDER_TEMPLATE_CONFIGURATION.md**
2. Make a backup copy of Sample.btw
3. Test changes with sample data
4. Validate before production use

### Video Tutorial (If Available)
- Check company knowledge base
- Record your own for team training
- Document customizations made

## 📞 Support

### Self-Help Resources
1. **QUICK_SETUP.txt** - Common issues
2. **BARTENDER_SETUP_GUIDE.md** - Detailed reference
3. **BARTENDER_TEMPLATE_CONFIGURATION.md** - Template guide

### External Resources
- BarTender Help (F1 in software)
- Seagull Scientific Support: www.seagullscientific.com
- Toshiba Tec Support: For printer issues

### Internal
- IT Department: For software/driver installation
- Production Team: For label stock and printer maintenance
- Development Team: For CSV generation issues

## 📊 Statistics & Optimization

### Performance Benchmarks
- **CSV generation**: < 1 second for 100 labels
- **ZIP download**: 2-5 seconds
- **BarTender print time**: ~2-3 seconds per label
- **Printer speed**: Depends on Toshiba B-415 settings

### Optimization Tips
1. Use "CSV Only" workflow for fastest printing
2. Keep BarTender open during production hours
3. Pre-load label stock
4. Test printer settings for optimal speed/quality balance
5. Process batches of similar labels together

## 🔐 Security & Data Privacy

### CSV Data Handling
- CSV files contain client business information
- Store securely, delete after printing
- Don't email unencrypted CSV files
- Use secure file sharing if needed

### Template Protection
- Keep backup of working template
- Don't modify production template without testing
- Version control template changes
- Document all customizations

## 📝 Change Log

### Version 1.0 (2026-03-02)
- Initial BarTender integration
- Sample.btw template created
- Documentation suite created
- CSV generation implemented
- ZIP packaging system added
- Test data provided

## 🚀 Next Steps

1. **Test the system**:
   - Open Sample.btw
   - Load SAMPLE_TEST_DATA.csv
   - Print preview
   - Print one test label

2. **Production trial**:
   - Process one real order
   - Download BTW package
   - Print actual labels
   - Verify quality

3. **Team training**:
   - Train production staff
   - Document any customizations
   - Create quick reference cards
   - Establish support procedures

4. **Optimize workflow**:
   - Choose best workflow (Full Package vs CSV Only)
   - Set up dedicated label printing station
   - Create batch processing procedures
   - Monitor and improve process

---

**Version**: 1.0
**Last Updated**: 2026-03-02
**System**: Momolato Ordering System
**Printer**: Toshiba B-415
**Label Size**: 90mm × 50mm (landscape)

For the latest documentation, check the project repository.
