/**
 * Xero OAuth2 Client
 * Handles token management, refresh, and authenticated API calls.
 * Tokens are stored in the system_settings table (Supabase).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.invoices',
  'accounting.contacts',
].join(' ');

function getAdminSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ─── Token Storage (system_settings table) ───────────────────────────────────

async function saveSetting(key: string, value: string) {
  const supabase = getAdminSupabase();
  await supabase.from('system_settings').upsert(
    { setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
    { onConflict: 'setting_key' }
  );
}

async function getSetting(key: string): Promise<string | null> {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .single();
  return data?.setting_value ?? null;
}

async function deleteSetting(key: string) {
  const supabase = getAdminSupabase();
  await supabase.from('system_settings').delete().eq('setting_key', key);
}

// ─── Token Management ─────────────────────────────────────────────────────────

export async function saveXeroTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  tenant_id?: string;
}) {
  const expiry = Date.now() + tokens.expires_in * 1000;
  await Promise.all([
    saveSetting('xero_access_token', tokens.access_token),
    saveSetting('xero_refresh_token', tokens.refresh_token),
    saveSetting('xero_token_expiry', expiry.toString()),
    tokens.tenant_id ? saveSetting('xero_tenant_id', tokens.tenant_id) : Promise.resolve(),
  ]);
}

export async function getXeroTokens() {
  const [accessToken, refreshToken, expiry, tenantId] = await Promise.all([
    getSetting('xero_access_token'),
    getSetting('xero_refresh_token'),
    getSetting('xero_token_expiry'),
    getSetting('xero_tenant_id'),
  ]);
  return { accessToken, refreshToken, expiry: expiry ? parseInt(expiry) : null, tenantId };
}

export async function clearXeroTokens() {
  await Promise.all([
    deleteSetting('xero_access_token'),
    deleteSetting('xero_refresh_token'),
    deleteSetting('xero_token_expiry'),
    deleteSetting('xero_tenant_id'),
  ]);
}

export async function isXeroConnected(): Promise<boolean> {
  const { refreshToken } = await getXeroTokens();
  return !!refreshToken;
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed: ${body}`);
  }

  const data = await res.json();
  await saveXeroTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  });
  return data.access_token;
}

async function getValidAccessToken(): Promise<string> {
  const { accessToken, refreshToken, expiry } = await getXeroTokens();

  if (!refreshToken) throw new Error('Xero is not connected. Please authorise in Xero Settings.');

  // Refresh if expired or expiring within 60 seconds
  const needsRefresh = !accessToken || !expiry || Date.now() > expiry - 60_000;
  if (needsRefresh) {
    return await refreshAccessToken(refreshToken);
  }
  return accessToken!;
}

// ─── OAuth URL Builder ────────────────────────────────────────────────────────

export function buildXeroAuthUrl(state: string): string {
  const clientId = process.env.XERO_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/xero/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });

  return `https://login.xero.com/identity/connect/authorize?${params}`;
}

// ─── Token Exchange (after OAuth callback) ───────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const clientId = process.env.XERO_CLIENT_ID!;
  const clientSecret = process.env.XERO_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/xero/callback`;

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token exchange failed: ${body}`);
  }

  const data = await res.json();

  // Get tenant ID from connections
  const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const connections = await connectionsRes.json();
  const tenantId = connections?.[0]?.tenantId ?? null;

  await saveXeroTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    tenant_id: tenantId,
  });
}

// ─── Authenticated Xero API Fetch ─────────────────────────────────────────────

export async function xeroFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken();
  const { tenantId } = await getXeroTokens();

  if (!tenantId) throw new Error('Xero tenant ID not found. Please reconnect.');

  return fetch(`${XERO_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Xero-tenant-id': tenantId,
      ...(options.headers ?? {}),
    },
  });
}
