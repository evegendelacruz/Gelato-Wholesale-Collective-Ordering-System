import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/xeroClient';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    const msg = error ?? 'No code returned from Xero';
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/xero?error=${encodeURIComponent(msg)}`
    );
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/xero?connected=1`
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Xero connection failed';
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/xero?error=${encodeURIComponent(msg)}`
    );
  }
}
