# BarTender Print Service - Setup Guide

Complete guide to set up automated label printing with BarTender SDK.

---

## 📋 Prerequisites

### Required Software
✅ **Windows 10/11** (64-bit)
✅ **BarTender Automation Edition** (2016 or later)
✅ **Node.js** (v14 or later) - [Download](https://nodejs.org/)
✅ **Toshiba B-415 Printer** (installed and configured)

### Verify BarTender Installation
1. Open BarTender Designer
2. Go to **Help** → **About BarTender**
3. Confirm it says **"Automation"** edition
4. Note the installation path (usually `C:\Program Files\Seagull\BarTender 2021`)

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
cd bartender-print-service
npm install
```

This installs:
- Express (web server)
- edge-js (Node.js to .NET bridge)
- CORS (cross-origin support)
- Other required packages

### Step 2: Configure Environment

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` file and update paths:
```env
PORT=3001
BARTENDER_PATH=C:\\Program Files\\Seagull\\BarTender 2021
DEFAULT_PRINTER=Toshiba B-415
TEMPLATE_PATH=C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets
```

**Important**: Use double backslashes (`\\`) in paths!

### Step 3: Add BarTender SDK References

The service needs access to BarTender SDK DLLs:

1. Find BarTender SDK DLLs:
   - `BarTender.Print.dll`
   - Location: `C:\Program Files\Seagull\BarTender 2021\SDK Assemblies\`

2. Create `refs` folder in `bartender-print-service`:
```bash
mkdir refs
```

3. Copy SDK DLL:
```bash
copy "C:\Program Files\Seagull\BarTender 2021\SDK Assemblies\BarTender.Print.dll" refs\
```

### Step 4: Test the Service

Start the service in development mode:

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         BarTender Print Service - RUNNING                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

✅ Service running on: http://localhost:3001
✅ Health check: http://localhost:3001/health
```

### Step 5: Test Health Check

Open browser and visit: `http://localhost:3001/health`

Should return:
```json
{
  "status": "ok",
  "service": "BarTender Print Service",
  "version": "1.0.0",
  "bartenderReady": true
}
```

---

## 🔧 Optional: Install as Windows Service

To run automatically when Windows starts:

```bash
npm run install-service
```

This installs the service as **"BarTender Print Service"** in Windows Services.

### Manage Windows Service

**Via Services App:**
1. Press `Win + R`
2. Type `services.msc`
3. Find "BarTender Print Service"
4. Right-click to Start/Stop/Restart

**Via Command Line (as Administrator):**
```bash
# Start service
net start "BarTender Print Service"

# Stop service
net stop "BarTender Print Service"
```

**Uninstall Service:**
```bash
npm run uninstall-service
```

---

## 🏷️ Prepare BarTender Template

Your BTW template must have named fields matching the label data:

### Required Named Fields:
- `CompanyName` - Text field
- `ProductName` - Text field
- `Allergen` - Text field
- `BestBefore` - Text field
- `BatchNumber` - Text field
- `Ingredients` - Text field (for client orders only)

### Setup Template Fields:

1. Open `Sample.btw` in BarTender Designer

2. For each text object, right-click → **Properties**

3. Go to **Data Source** tab

4. Set **Type** to "Named Data Source"

5. Enter the field name (e.g., `CompanyName`)

6. Click **OK**

7. Save template

8. Verify template path in `.env` matches

---

## 🌐 Update Web Application

### Step 1: Create API Client

File: `lib/bartenderAPI.ts`

```typescript
const BARTENDER_API_URL = process.env.NEXT_PUBLIC_BARTENDER_API_URL || 'http://localhost:3001';

export interface LabelData {
  companyName: string;
  productName: string;
  ingredients?: string;
  allergen: string;
  bestBefore: string;
  batchNumber: string;
}

export interface PrintOptions {
  labels: LabelData[];
  templatePath: string;
  printerName?: string;
  copies?: number;
}

export async function printLabelsWithBarTender(options: PrintOptions) {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/api/bartender/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      throw new Error(`Print request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('BarTender print error:', error);
    throw error;
  }
}

export async function checkBarTenderStatus() {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/health`);
    return await response.json();
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
}

export async function getAvailablePrinters() {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/api/bartender/printers`);
    const result = await response.json();
    return result.printers || [];
  } catch (error) {
    console.error('Failed to get printers:', error);
    return [];
  }
}
```

### Step 2: Add Environment Variable

File: `.env.local`

```env
NEXT_PUBLIC_BARTENDER_API_URL=http://localhost:3001
```

---

## ✅ Testing

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

### Test 2: Get Printers
```bash
curl http://localhost:3001/api/bartender/printers
```

### Test 3: Print Single Label
```bash
curl -X POST http://localhost:3001/api/bartender/print \
  -H "Content-Type: application/json" \
  -d "{
    \"labels\": [{
      \"companyName\": \"Test Company\",
      \"productName\": \"Test Product\",
      \"allergen\": \"Test allergen info\",
      \"bestBefore\": \"01/01/2025\",
      \"batchNumber\": \"BATCH001\"
    }],
    \"templatePath\": \"C:\\\\Users\\\\User\\\\Desktop\\\\momolato-ordering-system\\\\public\\\\assets\\\\Sample.btw\",
    \"printerName\": \"Toshiba B-415\",
    \"copies\": 1
  }"
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find BarTender.Print.dll"

**Solution:**
1. Verify BarTender Automation is installed
2. Copy DLL to `bartender-print-service/refs/` folder
3. Restart service

### Issue: "Engine failed to start"

**Solution:**
1. Open BarTender Designer manually to verify it works
2. Check BarTender license is active
3. Run service as Administrator
4. Check Windows Event Log for BarTender errors

### Issue: "Printer not found"

**Solution:**
1. Verify printer name in Settings → Printers
2. Test print from BarTender Designer
3. Use exact printer name (case-sensitive)
4. Try printing to default printer first (omit `printerName`)

### Issue: "Port 3001 already in use"

**Solution:**
1. Change `PORT` in `.env` to different number (e.g., 3002)
2. Update `NEXT_PUBLIC_BARTENDER_API_URL` in web app `.env.local`
3. Restart service

### Issue: Service starts but can't print

**Solution:**
1. Check template path is correct
2. Verify field names in BTW template match data fields
3. Open BTW template manually and test print
4. Check service logs for detailed error messages

---

## 📊 Service Logs

Logs are written to console. To capture logs to file:

**Development:**
```bash
npm start > logs.txt 2>&1
```

**Windows Service:**
- Logs location: `C:\ProgramData\BarTender Print Service\logs\`
- Or check Windows Event Viewer

---

## 🎯 Next Steps

After setup is complete:

1. ✅ Service running and accessible
2. ✅ Template configured with named fields
3. ✅ Web app updated with API client
4. ✅ Test print successful

**Now update the label components to use BarTender API!**

See: `INTEGRATION_GUIDE.md` for web app integration steps.

---

## 📞 Support

- Check BarTender SDK documentation: [BarTender SDK Help](https://support.seagullscientific.com/)
- Test service endpoints with Postman or curl
- Review service console output for errors
- Verify BarTender license is active

---

**Setup Complete! Ready for automated label printing! 🎉**
