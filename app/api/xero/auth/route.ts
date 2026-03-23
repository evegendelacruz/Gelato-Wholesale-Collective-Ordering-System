import { NextResponse } from 'next/server';
import { buildXeroAuthUrl } from '@/lib/xeroClient';

export async function GET() {
  const state = Math.random().toString(36).substring(2);
  const authUrl = buildXeroAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
