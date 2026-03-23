import { NextRequest, NextResponse } from 'next/server';
import { syncInvoiceToXero, syncAllPendingInvoices, getXeroInvoice } from '@/lib/xeroSync';
import { createClient } from '@supabase/supabase-js';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/xero/invoices
 * Body: { orderId: number } — sync a single order
 *   OR: { syncAll: true }   — sync all pending orders
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk sync
    if (body.syncAll) {
      const result = await syncAllPendingInvoices();
      return NextResponse.json(result);
    }

    // Single order sync
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supabase = adminSupabase();

    const { data: order, error: orderError } = await supabase
      .from('client_order')
      .select('*, items:client_order_item(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: client, error: clientError } = await supabase
      .from('client_user')
      .select('*')
      .eq('client_auth_id', order.client_auth_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const xeroInvoiceId = await syncInvoiceToXero(order, order.items ?? [], client);
    return NextResponse.json({ success: true, xeroInvoiceId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invoice sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/xero/invoices?xeroInvoiceId=XXX
 * Fetch a Xero invoice by its Xero ID.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const xeroInvoiceId = searchParams.get('xeroInvoiceId');

    if (!xeroInvoiceId) {
      return NextResponse.json({ error: 'xeroInvoiceId is required' }, { status: 400 });
    }

    const invoice = await getXeroInvoice(xeroInvoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found in Xero' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch invoice';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
