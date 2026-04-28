/**
 * Xero Sync Utilities
 * Maps GWC data structures → Xero API payloads.
 * Priority integrations:
 *   1. Audit trail (last_modified_by visible on Xero invoice note)
 *   2. Invoice fields: InvoiceNumber, LineItem Description, Amount, Total
 *   3. All invoice data direct transfer
 */

import { xeroFetch } from './xeroClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  product_name: string;
  product_type?: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OnlineOrderItem {
  id: number;
  product_name: string;
  product_description?: string;
  quantity: number;
  product_price: number; // unit price for online orders
}

interface Order {
  id: number;
  order_id: string;
  invoice_id: string;
  order_date: string;
  delivery_date: string;
  invoice_due_date?: string;
  total_amount: number;
  gst_percentage?: number;
  status: string;
  notes?: string;
  last_modified_by?: string;
  last_modified_by_name?: string;
  xero_invoice_id?: string;
  updated_at: string;
}

interface OnlineOrder {
  id: number;
  order_id: string;
  invoice_id?: string;
  customer_name: string;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  gst_percentage?: number;
  status: string;
  notes?: string;
  xero_invoice_id?: string;
  updated_at: string;
}

interface ClientData {
  client_id: string;
  client_auth_id: string;
  client_businessName: string;
  client_email: string;
  client_delivery_address?: string;
  client_billing_address?: string;
  client_person_incharge?: string;
  client_business_contact?: string;
  tax_id?: string;
  xero_contact_id?: string;
  ad_streetName?: string;
  ad_country?: string;
  ad_postal?: string;
  ad_billing_streetName?: string;
  ad_billing_country?: string;
  ad_billing_postal?: string;
}

// ─── Map GWC status → Xero invoice status ────────────────────────────────────

function mapStatusToXero(status: string): string {
  switch (status) {
    case 'Completed':
      return 'AUTHORISED';
    case 'Cancelled':
      return 'VOIDED';
    case 'Pending':
    default:
      return 'DRAFT';
  }
}

// ─── Contact Sync ─────────────────────────────────────────────────────────────

/**
 * Push a GWC client → Xero Contact.
 * Returns the Xero ContactID.
 */
export async function syncContactToXero(client: ClientData): Promise<string> {
  const supabase = getAdminSupabase();

  // Build contact payload
  const payload: Record<string, unknown> = {
    Name: client.client_businessName,
    EmailAddress: client.client_email,
    Phones: client.client_business_contact
      ? [{ PhoneType: 'DEFAULT', PhoneNumber: client.client_business_contact }]
      : [],
    Addresses: [],
  };

  if (client.client_billing_address || client.ad_billing_streetName) {
    (payload.Addresses as unknown[]).push({
      AddressType: 'POBOX',
      AddressLine1: client.ad_billing_streetName || client.client_billing_address || '',
      City: '',
      Country: client.ad_billing_country || '',
      PostalCode: client.ad_billing_postal || '',
    });
  }

  if (client.client_delivery_address || client.ad_streetName) {
    (payload.Addresses as unknown[]).push({
      AddressType: 'STREET',
      AddressLine1: client.ad_streetName || client.client_delivery_address || '',
      City: '',
      Country: client.ad_country || '',
      PostalCode: client.ad_postal || '',
    });
  }

  if (client.tax_id) {
    payload.TaxNumber = client.tax_id;
  }

  if (client.client_person_incharge) {
    payload.ContactPersons = [{ FirstName: client.client_person_incharge, IncludeInEmails: true }];
  }

  let res: Response;

  // If already linked, update; otherwise create
  if (client.xero_contact_id) {
    payload.ContactID = client.xero_contact_id;
    res = await xeroFetch('/Contacts', {
      method: 'POST',
      body: JSON.stringify({ Contacts: [payload] }),
    });
  } else {
    res = await xeroFetch('/Contacts', {
      method: 'POST',
      body: JSON.stringify({ Contacts: [payload] }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Xero contact sync failed: ${err}`);
  }

  const data = await res.json();
  const contactId: string = data.Contacts?.[0]?.ContactID;

  // Persist xero_contact_id back to client_user
  if (contactId && contactId !== client.xero_contact_id) {
    await supabase
      .from('client_user')
      .update({ xero_contact_id: contactId })
      .eq('client_auth_id', client.client_auth_id);
  }

  return contactId;
}

// ─── Invoice Sync ─────────────────────────────────────────────────────────────

/**
 * Push a GWC order → Xero Invoice.
 * Handles create and update.
 * Returns the Xero InvoiceID.
 *
 * Priority mappings:
 *   GWC invoice_id      → Xero InvoiceNumber
 *   Item product_name   → Xero LineItem Description
 *   Item subtotal       → Xero LineItem LineAmount
 *   order total_amount  → Xero Total
 */
export async function syncInvoiceToXero(
  order: Order,
  items: OrderItem[],
  client: ClientData
): Promise<string> {
  const supabase = getAdminSupabase();

  // Ensure contact exists in Xero
  let contactId = client.xero_contact_id;
  if (!contactId) {
    contactId = await syncContactToXero(client);
  }

  // Calculate GST
  const gstRate = order.gst_percentage ?? 9;
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const gstAmount = subtotal * (gstRate / 100);

  // Build line items — pre-tax amounts, Xero calculates totals.
  // TaxType is intentionally omitted so Xero uses the org's default tax rate.
  const lineItems = items.map((item) => ({
    Description: item.product_description
      ? `${item.product_name} – ${item.product_description}`
      : item.product_name,
    Quantity: item.quantity,
    UnitAmount: item.unit_price,
    LineAmount: item.subtotal,
  }));

  // Due date: invoice_due_date or 30 days from order_date
  let dueDate = order.invoice_due_date;
  if (!dueDate) {
    const d = new Date(order.order_date);
    d.setDate(d.getDate() + 30);
    dueDate = d.toISOString().split('T')[0];
  }

  // Audit trail: who last modified this invoice in GWC
  const gstLine = gstRate > 0 ? ` | GST ${gstRate}%: SGD ${gstAmount.toFixed(2)} | Total incl. GST: SGD ${order.total_amount.toFixed(2)}` : '';
  const auditNote = order.last_modified_by_name
    ? `Last modified by: ${order.last_modified_by_name} on ${new Date(order.updated_at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}${gstLine}`
    : `Synced from GWC on ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}${gstLine}`;

  const payload = {
    Type: 'ACCREC',
    Contact: { ContactID: contactId },
    InvoiceNumber: order.invoice_id,          // ← GWC invoice_id → Xero InvoiceNumber
    Reference: order.order_id,                 // GWC order reference
    Date: order.order_date,
    DueDate: dueDate,
    Status: mapStatusToXero(order.status),
    LineItems: lineItems,
    CurrencyCode: 'SGD',
    Url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/order`,
    ...(order.notes ? { Reference: `${order.order_id} | ${order.notes}` } : {}),
  };

  let xeroInvoiceId = order.xero_invoice_id;
  let res: Response;

  if (xeroInvoiceId) {
    // Update existing invoice
    res = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
      method: 'POST',
      body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
    });
  } else {
    // Create new invoice
    res = await xeroFetch('/Invoices', {
      method: 'PUT',
      body: JSON.stringify({ Invoices: [payload] }),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    // If creating a new invoice failed, check if one already exists in Xero
    // with this InvoiceNumber (e.g. from a previous partial sync).
    if (!xeroInvoiceId) {
      const existing = await findXeroInvoiceByNumber(order.invoice_id);
      if (existing) {
        xeroInvoiceId = existing;
        // Retry as an update now that we have the real ID
        const retryRes = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
          method: 'POST',
          body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
        });
        if (!retryRes.ok) {
          const retryErr = await retryRes.text();
          throw new Error(`Xero invoice sync failed: ${retryErr}`);
        }
        const retryData = await retryRes.json();
        const retryInvoice = retryData.Invoices?.[0];
        if (retryInvoice?.HasErrors || !retryInvoice?.InvoiceID || retryInvoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
          throw new Error(`Xero invoice sync failed: ${JSON.stringify(retryInvoice)}`);
        }
        xeroInvoiceId = retryInvoice.InvoiceID;
      } else {
        throw new Error(`Xero invoice sync failed: ${errText}`);
      }
    } else {
      throw new Error(`Xero invoice sync failed: ${errText}`);
    }
  } else {
    const data = await res.json();
    const invoice = data.Invoices?.[0];
    // Xero can return HTTP 200 with HasErrors:true and a null GUID — treat as failure
    if (invoice?.HasErrors || !invoice?.InvoiceID || invoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
      // Invoice number may already exist in Xero — try to find and update it
      if (!xeroInvoiceId) {
        const existing = await findXeroInvoiceByNumber(order.invoice_id);
        if (existing) {
          xeroInvoiceId = existing;
          const retryRes = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
            method: 'POST',
            body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
          });
          if (!retryRes.ok) {
            const retryErr = await retryRes.text();
            throw new Error(`Xero invoice sync failed: ${retryErr}`);
          }
          const retryData = await retryRes.json();
          const retryInvoice = retryData.Invoices?.[0];
          if (retryInvoice?.HasErrors || !retryInvoice?.InvoiceID || retryInvoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
            throw new Error(`Xero invoice sync failed: ${JSON.stringify(retryInvoice)}`);
          }
          xeroInvoiceId = retryInvoice.InvoiceID;
        } else {
          throw new Error(`Xero invoice sync failed: ${JSON.stringify(invoice)}`);
        }
      } else {
        throw new Error(`Xero invoice sync failed: ${JSON.stringify(invoice)}`);
      }
    } else {
      xeroInvoiceId = invoice.InvoiceID;
    }
  }

  if (!xeroInvoiceId) throw new Error('Xero did not return an InvoiceID');

  // Add audit trail as a history note on the Xero invoice
  await addXeroInvoiceNote(xeroInvoiceId, auditNote);

  // Persist xero_invoice_id + sync timestamp back to client_order
  await supabase
    .from('client_order')
    .update({
      xero_invoice_id: xeroInvoiceId,
      xero_synced_at: new Date().toISOString(),
      gst_amount: gstAmount,
    })
    .eq('id', order.id);

  return xeroInvoiceId;
}

// ─── History Notes ────────────────────────────────────────────────────────────

/**
 * Add a note to a Xero invoice (appears in the invoice's history/audit trail in Xero).
 */
export async function addXeroInvoiceNote(xeroInvoiceId: string, note: string): Promise<void> {
  await xeroFetch(`/Invoices/${xeroInvoiceId}/History`, {
    method: 'PUT',
    body: JSON.stringify({
      HistoryRecords: [{ Details: note }],
    }),
  });
}

// ─── Fetch Xero Invoice ───────────────────────────────────────────────────────

/**
 * Search Xero for an invoice by InvoiceNumber.
 * Returns the InvoiceID if found, null otherwise.
 * Used to recover from partial syncs where the ID was never stored locally.
 */
async function findXeroInvoiceByNumber(invoiceNumber: string): Promise<string | null> {
  const res = await xeroFetch(`/Invoices?InvoiceNumbers=${encodeURIComponent(invoiceNumber)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const invoice = data.Invoices?.[0];
  if (!invoice?.InvoiceID || invoice.InvoiceID === '00000000-0000-0000-0000-000000000000') return null;
  return invoice.InvoiceID;
}

export async function getXeroInvoice(xeroInvoiceId: string) {
  const res = await xeroFetch(`/Invoices/${xeroInvoiceId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.Invoices?.[0] ?? null;
}

// ─── Online Order Invoice Sync ────────────────────────────────────────────────

/**
 * Push a GWC online (customer) order → Xero Invoice.
 * Online orders use customer_name as the contact (no client_user linked).
 * Returns the Xero InvoiceID.
 */
export async function syncOnlineOrderToXero(
  order: OnlineOrder,
  items: OnlineOrderItem[],
): Promise<string> {
  const supabase = getAdminSupabase();

  // Find or create a Xero contact by customer name
  const contactRes = await xeroFetch('/Contacts', {
    method: 'POST',
    body: JSON.stringify({
      Contacts: [{
        Name: order.customer_name,
      }],
    }),
  });

  if (!contactRes.ok) {
    const err = await contactRes.text();
    throw new Error(`Xero contact sync failed for online order: ${err}`);
  }

  const contactData = await contactRes.json();
  const contactId: string = contactData.Contacts?.[0]?.ContactID;
  if (!contactId) throw new Error('Xero did not return a ContactID for online order');

  // Calculate GST
  const gstRate = order.gst_percentage ?? 9;
  const subtotal = items.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
  const gstAmount = subtotal * (gstRate / 100);

  // Build line items — TaxType omitted so Xero uses the org's default tax rate.
  const lineItems = items.map((item) => ({
    Description: item.product_description
      ? `${item.product_name} – ${item.product_description}`
      : item.product_name,
    Quantity: item.quantity,
    UnitAmount: item.product_price,
    LineAmount: item.product_price * item.quantity,
  }));

  // Due date: 30 days from order date
  const d = new Date(order.order_date);
  d.setDate(d.getDate() + 30);
  const dueDate = d.toISOString().split('T')[0];

  const gstLine = gstRate > 0
    ? ` | GST ${gstRate}%: SGD ${gstAmount.toFixed(2)} | Total incl. GST: SGD ${order.total_amount.toFixed(2)}`
    : '';
  const auditNote = `Synced from GWC on ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}${gstLine}`;

  const invoiceNumber = order.invoice_id || order.order_id;

  const payload = {
    Type: 'ACCREC',
    Contact: { ContactID: contactId },
    InvoiceNumber: invoiceNumber,
    Reference: order.notes ? `${order.order_id} | ${order.notes}` : order.order_id,
    Date: order.order_date,
    DueDate: dueDate,
    Status: mapStatusToXero(order.status),
    LineItems: lineItems,
    CurrencyCode: 'SGD',
    Url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/order/onlineOrder`,
  };

  let xeroInvoiceId = order.xero_invoice_id;
  let res: Response;

  if (xeroInvoiceId) {
    res = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
      method: 'POST',
      body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
    });
  } else {
    res = await xeroFetch('/Invoices', {
      method: 'PUT',
      body: JSON.stringify({ Invoices: [payload] }),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    if (!xeroInvoiceId) {
      const existing = await findXeroInvoiceByNumber(invoiceNumber);
      if (existing) {
        xeroInvoiceId = existing;
        const retryRes = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
          method: 'POST',
          body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
        });
        if (!retryRes.ok) {
          const retryErr = await retryRes.text();
          throw new Error(`Xero invoice sync failed for online order: ${retryErr}`);
        }
        const retryData = await retryRes.json();
        const retryInvoice = retryData.Invoices?.[0];
        if (retryInvoice?.HasErrors || !retryInvoice?.InvoiceID || retryInvoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
          throw new Error(`Xero invoice sync failed for online order: ${JSON.stringify(retryInvoice)}`);
        }
        xeroInvoiceId = retryInvoice.InvoiceID;
      } else {
        throw new Error(`Xero invoice sync failed for online order: ${errText}`);
      }
    } else {
      throw new Error(`Xero invoice sync failed for online order: ${errText}`);
    }
  } else {
    const data = await res.json();
    const invoice = data.Invoices?.[0];
    if (invoice?.HasErrors || !invoice?.InvoiceID || invoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
      // Invoice number may already exist in Xero — try to find and update it
      if (!xeroInvoiceId) {
        const existing = await findXeroInvoiceByNumber(invoiceNumber);
        if (existing) {
          xeroInvoiceId = existing;
          const retryRes = await xeroFetch(`/Invoices/${xeroInvoiceId}`, {
            method: 'POST',
            body: JSON.stringify({ Invoices: [{ ...payload, InvoiceID: xeroInvoiceId }] }),
          });
          if (!retryRes.ok) {
            const retryErr = await retryRes.text();
            throw new Error(`Xero invoice sync failed for online order: ${retryErr}`);
          }
          const retryData = await retryRes.json();
          const retryInvoice = retryData.Invoices?.[0];
          if (retryInvoice?.HasErrors || !retryInvoice?.InvoiceID || retryInvoice.InvoiceID === '00000000-0000-0000-0000-000000000000') {
            throw new Error(`Xero invoice sync failed for online order: ${JSON.stringify(retryInvoice)}`);
          }
          xeroInvoiceId = retryInvoice.InvoiceID;
        } else {
          throw new Error(`Xero invoice sync failed for online order: ${JSON.stringify(invoice)}`);
        }
      } else {
        throw new Error(`Xero invoice sync failed for online order: ${JSON.stringify(invoice)}`);
      }
    } else {
      xeroInvoiceId = invoice.InvoiceID;
    }
  }

  if (!xeroInvoiceId) throw new Error('Xero did not return an InvoiceID for online order');

  // Add audit note
  await addXeroInvoiceNote(xeroInvoiceId, auditNote);

  // Persist xero fields back to customer_order
  await supabase
    .from('customer_order')
    .update({
      xero_invoice_id: xeroInvoiceId,
      xero_synced_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  return xeroInvoiceId;
}

// ─── Bulk Sync ────────────────────────────────────────────────────────────────

/**
 * Sync all un-synced client orders and online orders to Xero.
 * Returns sync results.
 */
export async function syncAllPendingInvoices(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const supabase = getAdminSupabase();

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // ── Client orders ──
  const { data: orders, error } = await supabase
    .from('client_order')
    .select(`
      *,
      items:client_order_item(*),
      client:client_user(*)
    `)
    .neq('status', 'Cancelled')
    .is('xero_invoice_id', null);

  if (error) throw error;

  for (const order of orders ?? []) {
    try {
      await syncInvoiceToXero(order, order.items ?? [], order.client);
      synced++;
    } catch (e) {
      failed++;
      errors.push(`Client Order ${order.invoice_id}: ${(e as Error).message}`);
    }
  }

  // ── Online (customer) orders ──
  const { data: onlineOrders, error: onlineError } = await supabase
    .from('customer_order')
    .select(`*, items:customer_order_item(*)`)
    .neq('status', 'Cancelled')
    .is('xero_invoice_id', null);

  if (onlineError) throw onlineError;

  for (const order of onlineOrders ?? []) {
    try {
      await syncOnlineOrderToXero(order, order.items ?? []);
      synced++;
    } catch (e) {
      failed++;
      errors.push(`Online Order ${order.invoice_id || order.order_id}: ${(e as Error).message}`);
    }
  }

  return { synced, failed, errors };
}
