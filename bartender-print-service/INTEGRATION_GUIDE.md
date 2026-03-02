# Web App Integration Guide

How to integrate the BarTender Print Service with your Next.js web application.

---

## 🔌 Integration Overview

**Flow:**
1. User clicks "Print All Labels" button in web app
2. Web app sends label data to BarTender Print Service (HTTP POST)
3. Service processes data through BarTender SDK
4. BarTender sends labels to Toshiba B-415 printer
5. Labels print automatically!

---

## 📁 Files to Create/Update

### 1. Create BarTender API Client

File: `lib/bartenderAPI.ts`

```typescript
/**
 * BarTender Print Service API Client
 *
 * Communicates with the local BarTender print service
 * to send labels for automated printing.
 */

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

export interface PrintResult {
  success: boolean;
  message?: string;
  printed?: number;
  total?: number;
  error?: string;
}

/**
 * Print labels using BarTender SDK
 */
export async function printLabelsWithBarTender(options: PrintOptions): Promise<PrintResult> {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/api/bartender/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Print request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('BarTender print error:', error);

    // Check if service is offline
    if (error.message?.includes('fetch')) {
      throw new Error('BarTender Print Service is offline. Please ensure the service is running on your PC.');
    }

    throw error;
  }
}

/**
 * Check if BarTender service is online and ready
 */
export async function checkBarTenderStatus(): Promise<{
  status: string;
  bartenderReady?: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      return { status: 'error', error: 'Service returned error' };
    }

    return await response.json();
  } catch (error: any) {
    return {
      status: 'offline',
      error: 'Cannot connect to BarTender Print Service. Please ensure it is running.'
    };
  }
}

/**
 * Get list of available printers
 */
export async function getAvailablePrinters(): Promise<string[]> {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/api/bartender/printers`);

    if (!response.ok) {
      console.error('Failed to get printers');
      return [];
    }

    const result = await response.json();
    return result.printers || [];
  } catch (error) {
    console.error('Failed to get printers:', error);
    return [];
  }
}

/**
 * Initialize BarTender engine (optional - service auto-initializes)
 */
export async function initializeBarTender(): Promise<void> {
  try {
    const response = await fetch(`${BARTENDER_API_URL}/api/bartender/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to initialize BarTender');
    }

    const result = await response.json();
    console.log('BarTender initialized:', result.message);
  } catch (error) {
    console.error('BarTender initialization error:', error);
    throw error;
  }
}
```

### 2. Update Environment Variables

File: `.env.local`

```env
# BarTender Print Service URL
NEXT_PUBLIC_BARTENDER_API_URL=http://localhost:3001

# BarTender Template Path
NEXT_PUBLIC_BARTENDER_TEMPLATE_PATH=C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets\\Sample.btw

# Default Printer
NEXT_PUBLIC_DEFAULT_PRINTER=Toshiba B-415
```

### 3. Update OnlineLabel Component

File: `app/components/onlineLabel/page.tsx`

Add import at top:
```typescript
import { printLabelsWithBarTender, checkBarTenderStatus, LabelData } from '@/lib/bartenderAPI';
```

Add new handler function (around line 335, after `handleBartenderPrintAll`):
```typescript
const handleBarTenderSDKPrint = async () => {
  try {
    setIsGenerating(true);

    // Check if service is online
    const status = await checkBarTenderStatus();
    if (status.status !== 'ok') {
      alert('BarTender Print Service is offline.\n\nPlease start the service:\n1. Open bartender-print-service folder\n2. Run: npm start\n3. Try printing again');
      setIsGenerating(false);
      return;
    }

    // Prepare label data
    const labels: LabelData[] = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const quantity = item.quantity || 1;

      const data = editableData[i] || {
        companyName: clientData?.client_businessName || 'Company Name',
        productName: item.product_name || 'Product Name',
        allergen: item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
        bestBefore: calculateBestBefore(item.order_date || new Date()),
        batchNumber: ''
      };

      // Add label for each quantity
      for (let q = 0; q < quantity; q++) {
        labels.push({
          companyName: data.companyName,
          productName: data.productName,
          allergen: data.allergen,
          bestBefore: data.bestBefore,
          batchNumber: data.batchNumber
        });
      }
    }

    console.log(`Sending ${labels.length} labels to BarTender...`);

    // Get template path from environment or use default
    const templatePath = process.env.NEXT_PUBLIC_BARTENDER_TEMPLATE_PATH ||
                        'C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets\\Sample.btw';

    const printerName = process.env.NEXT_PUBLIC_DEFAULT_PRINTER || 'Toshiba B-415';

    // Send to BarTender service
    const result = await printLabelsWithBarTender({
      labels,
      templatePath,
      printerName,
      copies: 1
    });

    setIsGenerating(false);

    if (result.success) {
      setSuccessMessage(
        `✅ Print Successful!\n\n` +
        `Printed: ${result.printed} labels\n` +
        `Printer: ${printerName}\n\n` +
        `All labels sent to Toshiba B-415!`
      );
      setShowSuccessModal(true);
    } else {
      alert(`Print failed: ${result.error}`);
    }

  } catch (error: any) {
    console.error('BarTender SDK print error:', error);
    alert(`Failed to print labels:\n\n${error.message}\n\nMake sure BarTender Print Service is running.`);
    setIsGenerating(false);
  }
};
```

Update button section (around line 977-986):
```typescript
{/* BarTender SDK Print - TRUE Automatic Printing */}
<button
  onClick={handleBarTenderSDKPrint}
  disabled={isGenerating}
  className="flex-1 px-4 py-3 text-white rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
  style={{ backgroundColor: '#10B981' }}
  title="Print all labels automatically using BarTender SDK"
>
  <Printer size={20} />
  {isGenerating ? 'Printing...' : '🖨️ BarTender SDK Print'}
</button>
```

### 4. Update OrderLabel Component

File: `app/components/orderLabel/page.tsx`

Add same imports and handler as OnlineLabel, but with ingredients:

```typescript
const handleBarTenderSDKPrint = async () => {
  try {
    setIsGenerating(true);

    // Check if service is online
    const status = await checkBarTenderStatus();
    if (status.status !== 'ok') {
      alert('BarTender Print Service is offline.\n\nPlease start the service:\n1. Open bartender-print-service folder\n2. Run: npm start\n3. Try printing again');
      setIsGenerating(false);
      return;
    }

    // Prepare label data (WITH INGREDIENTS for client orders)
    const labels: LabelData[] = [];

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const quantity = item.quantity || 1;

      const data = editableData[i] || {
        companyName: clientData?.client_businessName || 'Company Name',
        productName: item.product_name || 'Product Name',
        ingredients: item.ingredients || 'Ingredients not available',
        allergen: item.allergen || 'Our products are crafted in a facility that also processes dairy, gluten, and nuts.',
        bestBefore: calculateBestBefore(item.order_date || new Date()),
        batchNumber: ''
      };

      // Add label for each quantity
      for (let q = 0; q < quantity; q++) {
        labels.push({
          companyName: data.companyName,
          productName: data.productName,
          ingredients: data.ingredients,
          allergen: data.allergen,
          bestBefore: data.bestBefore,
          batchNumber: data.batchNumber
        });
      }
    }

    console.log(`Sending ${labels.length} labels to BarTender...`);

    const templatePath = process.env.NEXT_PUBLIC_BARTENDER_TEMPLATE_PATH ||
                        'C:\\Users\\User\\Desktop\\momolato-ordering-system\\public\\assets\\Sample.btw';

    const printerName = process.env.NEXT_PUBLIC_DEFAULT_PRINTER || 'Toshiba B-415';

    // Send to BarTender service
    const result = await printLabelsWithBarTender({
      labels,
      templatePath,
      printerName,
      copies: 1
    });

    setIsGenerating(false);

    if (result.success) {
      setSuccessMessage(
        `✅ Print Successful!\n\n` +
        `Printed: ${result.printed} labels\n` +
        `Printer: ${printerName}\n\n` +
        `All labels sent to Toshiba B-415!`
      );
      setShowSuccessModal(true);
    } else {
      alert(`Print failed: ${result.error}`);
    }

  } catch (error: any) {
    console.error('BarTender SDK print error:', error);
    alert(`Failed to print labels:\n\n${error.message}\n\nMake sure BarTender Print Service is running.`);
    setIsGenerating(false);
  }
};
```

---

## 🎯 Testing Integration

### Step 1: Start BarTender Service

```bash
cd bartender-print-service
npm start
```

Should see: "BarTender engine initialized and ready"

### Step 2: Start Web App

```bash
cd ..
npm run dev
```

### Step 3: Test Print

1. Navigate to an order with labels
2. Click "🖨️ BarTender SDK Print" button
3. Check console for "Sending X labels to BarTender..."
4. Labels should print automatically on Toshiba B-415!

---

## 🔍 Debugging

### Check Service Status

Add a status indicator to your component:

```typescript
const [bartenderStatus, setBartenderStatus] = useState<string>('checking');

useEffect(() => {
  checkBarTenderStatus().then((status) => {
    setBartenderStatus(status.status);
  });
}, []);

// Display in UI:
{bartenderStatus === 'ok' ? (
  <span className="text-green-600">● BarTender Ready</span>
) : (
  <span className="text-red-600">● BarTender Offline</span>
)}
```

### Console Logs

Check browser console for:
- "Sending X labels to BarTender..."
- Print result messages

Check BarTender service console for:
- "Print Job Started"
- "Print job completed: X/Y labels printed"

### Common Issues

**Issue: "BarTender Print Service is offline"**
- Solution: Start the service with `npm start` in bartender-print-service folder

**Issue: "Template not found"**
- Solution: Update `NEXT_PUBLIC_BARTENDER_TEMPLATE_PATH` in `.env.local`

**Issue: "Printer not found"**
- Solution: Update `NEXT_PUBLIC_DEFAULT_PRINTER` to match exact printer name

**Issue: "Field not found"**
- Solution: Verify BTW template has named fields matching label data

---

## ✅ Integration Complete!

You now have:
- ✅ BarTender Print Service running
- ✅ Web app connected to service
- ✅ One-click automatic printing
- ✅ Multi-label batch printing
- ✅ Direct to Toshiba B-415 printer

**Test it and enjoy automatic label printing! 🎉**
