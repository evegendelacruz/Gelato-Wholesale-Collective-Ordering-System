import { NextRequest, NextResponse } from 'next/server';
import { syncContactToXero } from '@/lib/xeroSync';

/**
 * POST /api/xero/contacts
 * Body: { clientAuthId: string }
 * Syncs a single GWC client → Xero Contact.
 */
export async function POST(req: NextRequest) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { clientAuthId } = await req.json();
    if (!clientAuthId) {
      return NextResponse.json({ error: 'clientAuthId is required' }, { status: 400 });
    }

    const { data: client, error } = await supabase
      .from('client_user')
      .select('*')
      .eq('client_auth_id', clientAuthId)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const contactId = await syncContactToXero(client);
    return NextResponse.json({ success: true, xeroContactId: contactId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Contact sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
