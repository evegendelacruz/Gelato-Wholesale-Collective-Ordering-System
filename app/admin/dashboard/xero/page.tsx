'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import { CheckCircle, XCircle, RefreshCw, Link, Link2Off, AlertCircle, FileText, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface XeroStatus {
  connected: boolean;
  tenantId?: string;
  tokenExpiresAt?: string;
}

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

function XeroPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/xero/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle redirect back from Xero OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected === '1') {
      showToast('success', 'Xero connected successfully!');
      fetchStatus();
    }
    if (error) {
      showToast('error', `Connection failed: ${decodeURIComponent(error)}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/xero/auth';
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Xero? Existing synced invoices will remain in Xero.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' });
      setStatus({ connected: false });
      showToast('success', 'Xero disconnected.');
    } catch {
      showToast('error', 'Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/xero/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast('error', `Sync failed: ${data.error ?? 'Unknown error'}`);
        return;
      }
      const result = data as SyncResult;
      setSyncResult(result);
      if (result.failed === 0) {
        showToast('success', `${result.synced} invoice(s) synced to Xero.`);
      } else {
        showToast('error', `${result.synced} synced, ${result.failed} failed.`);
      }
    } catch {
      showToast('error', 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FCF0E3' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Toast */}
          {toast && (
            <div
              className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
                toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {toast.msg}
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0D909A' }}>
                Xero Integration
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Sync invoices, contacts and audit trail between GWC and Xero.
              </p>
            </div>

            {/* Connection Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Link size={18} className="text-[#0D909A]" />
                Connection Status
              </h2>

              {loadingStatus ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <RefreshCw size={16} className="animate-spin" />
                  Checking connection...
                </div>
              ) : status?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle size={20} />
                    Connected to Xero
                  </div>
                  {status.tenantId && (
                    <p className="text-xs text-gray-400">Tenant ID: {status.tenantId}</p>
                  )}
                  {status.tokenExpiresAt && (
                    <p className="text-xs text-gray-400">
                      Token expires: {new Date(status.tokenExpiresAt).toLocaleString('en-SG')}
                    </p>
                  )}
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="mt-2 flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-red-600 border border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <Link2Off size={15} />
                    {disconnecting ? 'Disconnecting...' : 'Disconnect Xero'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <XCircle size={20} />
                    Not connected
                  </div>
                  <p className="text-sm text-gray-500">
                    Connect your Xero account to start syncing invoices and contacts.
                  </p>
                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors"
                    style={{ backgroundColor: '#0D909A' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0a7a82')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D909A')}
                  >
                    <Link size={16} />
                    Connect to Xero
                  </button>
                </div>
              )}
            </div>

            {/* Sync Card — only shown when connected */}
            {status?.connected && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <RefreshCw size={18} className="text-[#0D909A]" />
                  Sync to Xero
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Syncs all invoices that have not yet been sent to Xero, or have been updated since
                  the last sync. Audit trail (last modified by) is included as a note on each invoice.
                </p>
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors"
                  style={{ backgroundColor: syncing ? '#9ca3af' : '#0D909A' }}
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync All Invoices'}
                </button>

                {syncResult && (
                  <div className="mt-4 rounded-lg border p-4 text-sm space-y-1">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={15} />
                      {syncResult.synced} invoice(s) synced successfully
                    </div>
                    {syncResult.failed > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle size={15} />
                          {syncResult.failed} invoice(s) failed
                        </div>
                        <ul className="list-disc list-inside text-red-500 text-xs ml-4 space-y-0.5">
                          {syncResult.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* What Gets Synced */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-[#0D909A]" />
                What Gets Synced
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoices */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                    <FileText size={14} /> Invoices
                  </h3>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• GWC Invoice Number → Xero InvoiceNumber</li>
                    <li>• Item description → Xero LineItem Description</li>
                    <li>• Item amount → Xero LineItem Amount</li>
                    <li>• Order total → Xero Total</li>
                    <li>• GST (9%) → Xero Tax</li>
                    <li>• Due date (30 days default)</li>
                    <li>• Order status → Xero status</li>
                    <li>• Audit trail note (last modified by)</li>
                  </ul>
                </div>
                {/* Contacts */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                    <Users size={14} /> Contacts
                  </h3>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Business name</li>
                    <li>• Email address</li>
                    <li>• Phone number</li>
                    <li>• Billing address</li>
                    <li>• Delivery address</li>
                    <li>• Person in charge</li>
                    <li>• GST registration (tax_id)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle size={16} />
                Setup Requirements
              </h2>
              <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
                <li>
                  Create a Xero app at{' '}
                  <span className="font-mono bg-amber-100 px-1 rounded">developer.xero.com</span>
                  {' '}→ My Apps → New App (Web App type)
                </li>
                <li>
                  Add these environment variables in Vercel and your <code>.env.local</code>:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li><code>XERO_CLIENT_ID</code></li>
                    <li><code>XERO_CLIENT_SECRET</code></li>
                    <li>
                      <code>NEXT_PUBLIC_APP_URL</code> = your Vercel URL (e.g.{' '}
                      <code>https://your-app.vercel.app</code>)
                    </li>
                  </ul>
                </li>
                <li>
                  In your Xero app, set Redirect URI to:{' '}
                  <code className="bg-amber-100 px-1 rounded">{'{NEXT_PUBLIC_APP_URL}'}/api/xero/callback</code>
                </li>
                <li>Click &quot;Connect to Xero&quot; above to authorise.</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function XeroPage() {
  return (
    <Suspense>
      <XeroPageContent />
    </Suspense>
  );
}
