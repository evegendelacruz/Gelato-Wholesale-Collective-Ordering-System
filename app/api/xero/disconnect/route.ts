import { NextResponse } from 'next/server';
import { clearXeroTokens } from '@/lib/xeroClient';

export async function POST() {
  await clearXeroTokens();
  return NextResponse.json({ success: true });
}
