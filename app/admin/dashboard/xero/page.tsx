'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidepanel from '@/app/components/sidepanel/page';
import Header from '@/app/components/header/page';
import { CheckCircle, XCircle, RefreshCw, Link, Link2Off, FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
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

interface XeroLineItem {
  Description: string;
  Quantity: number;
  UnitAmount: number;
  LineAmount: number;
}

interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Reference?: string;
  Status: string;
  DateString: string;
  DueDateString: string;
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  CurrencyCode: string;
  Contact: { Name: string };
  LineItems: XeroLineItem[];
}

function statusBadge(status: string) {
  switch (status) {
    case 'PAID': return 'bg-green-100 text-green-700';
    case 'AUTHORISED': return 'bg-blue-100 text-blue-700';
    case 'DRAFT': return 'bg-gray-100 text-gray-600';
    case 'VOIDED': return 'bg-red-100 text-red-600';
    default: return 'bg-yellow-100 text-yellow-700';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'PAID': return 'Paid';
    case 'AUTHORISED': return 'Awaiting Payment';
    case 'DRAFT': return 'Draft';
    case 'VOIDED': return 'Voided';
    default: return status;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function XeroPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Xero invoices mirror
  const [invoices, setInvoices] = useState<XeroInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const fetchXeroInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setInvoiceError(null);
    try {
      const res = await fetch('/api/xero/invoices');
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load');
      setInvoices(data.invoices ?? []);
    } catch (e) {
      setInvoiceError(e instanceof Error ? e.message : 'Failed to load Xero invoices');
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (status?.connected) fetchXeroInvoices();
  }, [status?.connected, fetchXeroInvoices]);

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

  const handleConnect = () => { window.location.href = '/api/xero/auth'; };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Xero? Existing synced invoices will remain in Xero.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/xero/disconnect', { method: 'POST' });
      setStatus({ connected: false });
      setInvoices([]);
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
      // Refresh Xero invoices after sync
      fetchXeroInvoices();
    } catch {
      showToast('error', 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const filtered = invoices.filter(inv =>
    inv.InvoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    inv.Contact?.Name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.Reference?.toLowerCase().includes(search.toLowerCase()) ||
    statusLabel(inv.Status).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FCF0E3', fontFamily: '"Roboto Condensed", sans-serif' }}>
      <Sidepanel />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Toast */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {toast.msg}
            </div>
          )}

          <div className="max-w-6xl mx-auto space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#0D909A' }}>Xero Integration</h1>
              <p className="text-sm text-gray-500 mt-1">Sync invoices and audit trail between GWC and Xero.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column — controls */}
              <div className="space-y-6">
                {/* Connection Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Link size={18} className="text-[#0D909A]" />
                    Connection Status
                  </h2>
                  {loadingStatus ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <RefreshCw size={16} className="animate-spin" />Checking connection...
                    </div>
                  ) : status?.connected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle size={20} />Connected to Xero
                      </div>
                      {status.tenantId && <p className="text-xs text-gray-400">Tenant ID: {status.tenantId}</p>}
                      {status.tokenExpiresAt && (
                        <p className="text-xs text-gray-400">Token expires: {new Date(status.tokenExpiresAt).toLocaleString('en-SG')}</p>
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
                      <div className="flex items-center gap-2 text-gray-500"><XCircle size={20} />Not connected</div>
                      <p className="text-sm text-gray-500">Connect your Xero account to start syncing.</p>
                      <button
                        onClick={handleConnect}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white"
                        style={{ backgroundColor: '#0D909A' }}
                      >
                        <Link size={16} />Connect to Xero
                      </button>
                    </div>
                  )}
                </div>

                {/* Sync Card */}
                {status?.connected && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <RefreshCw size={18} className="text-[#0D909A]" />Sync to Xero
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Syncs all unsynced invoices to Xero with audit trail.
                    </p>
                    <button
                      onClick={handleSyncAll}
                      disabled={syncing}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white w-full justify-center"
                      style={{ backgroundColor: syncing ? '#9ca3af' : '#0D909A' }}
                    >
                      <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Syncing...' : 'Sync All Invoices'}
                    </button>
                    {syncResult && (
                      <div className="mt-4 rounded-lg border p-3 text-sm space-y-1">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle size={15} />{syncResult.synced} invoice(s) synced
                        </div>
                        {syncResult.failed > 0 && (
                          <>
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle size={15} />{syncResult.failed} failed
                            </div>
                            <ul className="list-disc list-inside text-red-500 text-xs ml-4">
                              {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
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
                    <FileText size={18} className="text-[#0D909A]" />What Gets Synced
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                        <FileText size={14} />Invoices
                      </h3>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Invoice Number → Xero InvoiceNumber</li>
                        <li>• Item description & amount</li>
                        <li>• Order total & GST</li>
                        <li>• Due date & status</li>
                        <li>• Audit trail (last modified by)</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right column — Xero invoices mirror */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <FileText size={18} className="text-[#0D909A]" />
                      Xero Invoices
                      {invoices.length > 0 && (
                        <span className="text-xs font-normal text-gray-400">({invoices.length} total)</span>
                      )}
                    </h2>
                    {status?.connected && (
                      <button
                        onClick={fetchXeroInvoices}
                        disabled={loadingInvoices}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        <RefreshCw size={12} className={loadingInvoices ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  {status?.connected && (
                    <div className="px-5 py-3 border-b border-gray-100">
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search invoice, client, reference or status..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>
                    </div>
                  )}

                  {!status?.connected ? (
                    <div className="px-5 py-16 text-center text-gray-400 text-sm">
                      Connect to Xero to see your invoices here.
                    </div>
                  ) : invoiceError ? (
                    <div className="px-5 py-6 text-center text-red-500 text-sm">{invoiceError}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50 text-left">
                            <th className="px-4 py-3 font-bold text-gray-500">INVOICE NO.</th>
                            <th className="px-4 py-3 font-bold text-gray-500">CLIENT</th>
                            <th className="px-4 py-3 font-bold text-gray-500">REF</th>
                            <th className="px-4 py-3 font-bold text-gray-500">DATE</th>
                            <th className="px-4 py-3 font-bold text-gray-500">DUE</th>
                            <th className="px-4 py-3 font-bold text-gray-500 text-right">TOTAL</th>
                            <th className="px-4 py-3 font-bold text-gray-500 text-right">DUE AMT</th>
                            <th className="px-4 py-3 font-bold text-gray-500">STATUS</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingInvoices ? (
                            Array.from({ length: 6 }).map((_, i) => (
                              <tr key={i} className="border-b border-gray-100">
                                {Array.from({ length: 9 }).map((_, j) => (
                                  <td key={j} className="px-4 py-3">
                                    <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                                  </td>
                                ))}
                              </tr>
                            ))
                          ) : filtered.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                                {search ? 'No invoices match your search.' : 'No invoices found.'}
                              </td>
                            </tr>
                          ) : filtered.map(inv => (
                            <>
                              <tr
                                key={inv.InvoiceID}
                                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setExpanded(expanded === inv.InvoiceID ? null : inv.InvoiceID)}
                              >
                                <td className="px-4 py-3 font-semibold text-gray-800">{inv.InvoiceNumber}</td>
                                <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">{inv.Contact?.Name ?? '-'}</td>
                                <td className="px-4 py-3 text-gray-500">{inv.Reference || '-'}</td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.DateString)}</td>
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.DueDateString)}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                  {inv.CurrencyCode} {inv.Total?.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-medium" style={{ color: '#0D909A' }}>
                                  {inv.CurrencyCode} {inv.AmountDue?.toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(inv.Status)}`}>
                                    {statusLabel(inv.Status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400">
                                  {expanded === inv.InvoiceID ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </td>
                              </tr>

                              {/* Expanded line items */}
                              {expanded === inv.InvoiceID && (
                                <tr key={`${inv.InvoiceID}-exp`}>
                                  <td colSpan={9} className="px-6 py-4 bg-teal-50 border-b border-teal-100">
                                    <p className="text-xs font-bold text-gray-500 mb-2">LINE ITEMS</p>
                                    <table className="w-full text-xs mb-3">
                                      <thead>
                                        <tr className="text-gray-400">
                                          <th className="text-left py-1 font-medium w-1/2">DESCRIPTION</th>
                                          <th className="text-center py-1 font-medium">QTY</th>
                                          <th className="text-right py-1 font-medium">UNIT PRICE</th>
                                          <th className="text-right py-1 font-medium">AMOUNT</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(inv.LineItems ?? []).map((item, i) => (
                                          <tr key={i} className="border-t border-teal-100">
                                            <td className="py-1.5 text-gray-700">{item.Description}</td>
                                            <td className="py-1.5 text-center text-gray-600">{item.Quantity}</td>
                                            <td className="py-1.5 text-right text-gray-600">{item.UnitAmount?.toFixed(2)}</td>
                                            <td className="py-1.5 text-right font-medium text-gray-800">{item.LineAmount?.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="flex justify-end gap-6 text-xs pt-2 border-t border-teal-100">
                                      <span className="text-gray-500">Subtotal: <strong>{inv.SubTotal?.toFixed(2)}</strong></span>
                                      <span className="text-gray-500">Tax: <strong>{inv.TotalTax?.toFixed(2)}</strong></span>
                                      <span className="text-gray-700">Total: <strong>{inv.Total?.toFixed(2)}</strong></span>
                                      <span style={{ color: '#0D909A' }}>Amount Due: <strong>{inv.AmountDue?.toFixed(2)}</strong></span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                      {!loadingInvoices && filtered.length > 0 && (
                        <div className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
                          Showing {filtered.length} of {invoices.length} invoices · Click a row to see line items
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
