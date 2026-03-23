import { NextResponse } from 'next/server';
import { getXeroTokens, isXeroConnected } from '@/lib/xeroClient';

export async function GET() {
  const connected = await isXeroConnected();
  if (!connected) {
    return NextResponse.json({ connected: false });
  }

  const { tenantId, expiry } = await getXeroTokens();
  return NextResponse.json({
    connected: true,
    tenantId,
    tokenExpiresAt: expiry ? new Date(expiry).toISOString() : null,
  });
}
