'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import LotScanPanel from '@/components/barcode/LotScanPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatQuantity } from '@/components/sales/shared/format';

/**
 * Lot traceability: find a lot by number or barcode in one company and show
 * the existing trace (purchase source → PO → GRN → lot → QC → material issue
 * → processing → finished lot → order → dispatch → PI → invoice), only the
 * links that actually exist. A lookup here is not a scan.
 */
export default function TraceabilityPage() {
  const { can } = useAuth(true);
  const [company, setCompany] = useState('');
  const [by, setBy] = useState('lot');
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!company || !value.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.get(`/reports/traceability?company_id=${company}&${by}=${encodeURIComponent(value.trim())}`);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Not found');
    } finally {
      setBusy(false);
    }
  };

  const barcode = result ? (result.lot.barcodes || []).find((b) => b.status === 'active') || null : null;

  return (
    <DashboardLayout>
      <PageHeading title="Lot Traceability" breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: 'Lot Traceability' }]} />
      <Card title="Find a lot" variant="primary">
        <form onSubmit={search} className="filter-bar">
          <ReportCompanySelect value={company} onChange={(v) => { setCompany(v); setResult(null); }} allowAll={false} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Search by</label>
            <select value={by} onChange={(e) => setBy(e.target.value)} className="form-select">
              <option value="lot">Lot number</option>
              {can('barcode.view') && <option value="barcode">Barcode</option>}
            </select>
          </div>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">{by === 'lot' ? 'Lot number' : 'Barcode (scan or type)'}</label>
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className="form-input" autoComplete="off" />
          </div>
          <button type="submit" disabled={!company || !value.trim() || busy} className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm disabled:opacity-60"><i className="bi bi-diagram-3 me-1"></i> {busy ? 'Tracing…' : 'Trace'}</button>
        </form>
        <p className="text-xs text-fg-subtle mt-2 mb-0">A lot is found only in the selected company.</p>
      </Card>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      {result && (
        <>
          <LotScanPanel data={result} barcode={barcode} />
          {result.finished_lots.length > 0 && (
            <Card title="Made into (finished lots)" variant="info">
              <ul className="list-none p-0 m-0 space-y-1 text-sm">
                {result.finished_lots.map((l) => (
                  <li key={l.id}>
                    <Link href={`/procurement/lots/${l.id}`} className="font-mono text-link hover:underline">{l.lot_no}</Link>
                    <span className="text-fg-subtle"> · {formatQuantity(l.quantity, 3)} {l.unit} · by processing </span>
                    {can('processing.view') ? <Link href={`/production/processing/${l.processing_record_id}`} className="font-mono text-link hover:underline">{l.processing_no}</Link> : <span className="font-mono">{l.processing_no}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
