'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, BARCODE_STATUS_BADGES, SCAN_RESULT_BADGES, SCAN_CONTEXT_LABELS } from '@/components/ui/Badge';
import { Code128Svg } from '@/components/barcode/code128';
import LotScanPanel from '@/components/barcode/LotScanPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function BarcodeShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [barcode, setBarcode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchBarcode = useCallback(async () => {
    try {
      const res = await apiClient.get(`/barcodes/${id}`);
      setBarcode(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load barcode');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchBarcode);
  }, [fetchBarcode]);

  const retire = async () => {
    const reason = prompt(`Retire ${barcode.barcode_value}? It stays in the history but no longer identifies the lot; a new barcode can then be generated.\n\nReason (e.g. sticker damaged / lost):`);
    if (reason === null) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post(`/barcodes/${id}/retire`, { reason });
      setNotice(res.message || null);
      await fetchBarcode();
    } catch (err) {
      setError(err.message || 'Failed to retire barcode');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading barcode...</div></DashboardLayout>;
  if (!barcode) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Barcode not found'}</div></DashboardLayout>;

  const active = barcode.status === 'active';

  return (
    <DashboardLayout>
      <PageHeading
        title={barcode.barcode_value}
        breadcrumbs={[{ label: 'Barcodes', href: '/barcode/codes' }, { label: barcode.barcode_value }]}
        actions={(
          <>
            {active && <Link href={`/barcode/codes/${id}/label`} className={`${BTN} bg-blue-600 hover:bg-blue-700 text-white`}><i className="bi bi-printer me-1"></i> Print Label</Link>}
            {active && can('barcode.create') && <button type="button" disabled={busy} onClick={retire} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}><i className="bi bi-x-circle me-1"></i> Retire</button>}
            {!active && can('barcode.create') && <Link href="/barcode/codes/create" className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}>Generate replacement</Link>}
            <Link href="/barcode/codes" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {!active && <div className="bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded mb-4 text-sm">Retired {formatDateTime(barcode.retired_at)} by {barcode.retirer_name || '—'}{barcode.retirement_reason ? ` — ${barcode.retirement_reason}` : ''}. Scanning it is refused and recorded.</div>}

      <Card title="Barcode" variant="primary">
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-72 max-w-full">
            <Code128Svg value={barcode.barcode_value} height={50} className="w-full h-16" />
            <div className="text-center font-mono tracking-widest text-sm mt-1">{barcode.barcode_value}</div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-0.5"><WorkflowBadge status={barcode.status} config={BARCODE_STATUS_BADGES} /></dd></div>
            <div><dt className="text-gray-500 text-xs">Identifies</dt><dd className="mt-0.5">One lot (Code 128)</dd></div>
            <div><dt className="text-gray-500 text-xs">Created</dt><dd className="mt-0.5">{formatDateTime(barcode.created_at)} · {barcode.creator_name || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Scans</dt><dd className="mt-0.5">{barcode.scans_total}{barcode.last_scanned_at ? ` · last ${formatDateTime(barcode.last_scanned_at)}` : ''}</dd></div>
          </dl>
        </div>
      </Card>

      <LotScanPanel data={barcode} barcode={barcode} />

      <Card title="Scan history" variant="info">
        {barcode.scans.length === 0 ? <p className="text-sm text-gray-500 m-0">Not scanned yet.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Scanned at</th><th className="py-1.5 font-medium">User</th><th className="py-1.5 font-medium">Context</th><th className="py-1.5 font-medium">Location</th><th className="py-1.5 font-medium">Result</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {barcode.scans.map((s) => (
                <tr key={s.id}>
                  <td className="py-1.5 whitespace-nowrap">{formatDateTime(s.scanned_at)}</td>
                  <td className="py-1.5">{s.scanned_by_name || '—'}</td>
                  <td className="py-1.5 text-xs">{SCAN_CONTEXT_LABELS[s.context]}</td>
                  <td className="py-1.5 font-mono text-xs">{s.location_code || '—'}</td>
                  <td className="py-1.5"><WorkflowBadge status={s.result} config={SCAN_RESULT_BADGES} />{s.is_duplicate === 1 && <span className="text-xs text-amber-700 ms-2">duplicate</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {barcode.scans_total > barcode.scans.length && <p className="text-xs text-gray-500 mt-2 mb-0">Showing the latest {barcode.scans.length} of {barcode.scans_total}. <Link href="/barcode/history" className="text-blue-600 hover:underline">Full history</Link></p>}
      </Card>
    </DashboardLayout>
  );
}
