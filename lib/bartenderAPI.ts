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
  } catch (error) {
    console.error('BarTender print error:', error);

    // Check if service is offline
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
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
  } catch (error) {
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
