'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import CompanySelect from '@/components/company/CompanySelect';
import BarcodeScanInput from '@/components/barcode/BarcodeScanInput';
import LotScanPanel from '@/components/barcode/LotScanPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/components/sales/shared/format';

const LABEL = 'block text-xs font-medium text-gray-700 mb-1';
const SELECT = 'form-select w-full rounded border-gray-300 text-sm';

/**
 * Scan → identify. Works with a handheld (keyboard-wedge) scanner, typed
 * input or the device camera. A scan shows the lot's current, authoritative
 * state and whether this barcode was already scanned here; it changes no
 * stock and no status.
 */
export default function BarcodeScanPage() {
  const { can } = useAuth(true);
  const [companyId, setCompanyId] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);

  const changeCompany = (e) => {
    const value = e.target.value;
    setCompanyId(value);
    setLocationId('');
    setResult(null);
    setError(null);
    setLocations([]);
    // The optional "scanning at" picker appears only when the user may list locations (403 → no picker).
    if (value) {
      apiClient.get(`/inventory/locations?company_id=${value}&status=active&limit=500`).then((res) => setLocations(res.data || [])).catch(() => setLocations([]));
    }
  };

  const onResult = (data) => {
    setError(null);
    setResult(data);
    setRecent((prev) => [{ key: data.scan.id, value: data.barcode.barcode_value, lot: data.lot.lot_no, duplicate: data.duplicate, at: data.scan.scanned_at }, ...prev].slice(0, 10));
  };
  const onError = (message, value) => {
    setResult(null);
    setError(message);
    if (value) setRecent((prev) => [{ key: `e${Date.now()}`, value: value.toUpperCase(), lot: null, error: true, at: new Date().toISOString() }, ...prev].slice(0, 10));
  };

  return (
    <DashboardLayout>
      <PageHeading title="Scan Barcode" breadcrumbs={[{ label: 'Barcode' }, { label: 'Scan' }]} />

      <Card title="Scan" variant="primary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={LABEL}>Company you are working in *</label>
            <CompanySelect value={companyId} onChange={changeCompany} required className={SELECT} />
          </div>
          {locations.length > 0 && (
            <div>
              <label className={LABEL}>Scanning at (optional)</label>
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={SELECT}>
                <option value="">—</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <BarcodeScanInput companyId={companyId} locationId={locationId} onResult={onResult} onError={onError} disabled={!companyId} autoFocus />
        {!companyId && <p className="text-xs text-gray-500 mt-2 mb-0">Select the company first — a barcode only resolves in its own company.</p>}
        <p className="text-xs text-gray-500 mt-2 mb-0">Scanning only identifies the lot and records the scan. Stock moves only through GRN / QC, material issue, production and dispatch.</p>
      </Card>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm"><i className="bi bi-exclamation-octagon me-1"></i> {error}</div>}

      {result && (
        <>
          {result.duplicate ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded mb-4 text-sm">
              <i className="bi bi-exclamation-triangle me-1"></i> <strong>Already scanned.</strong> Last scanned {formatDateTime(result.previous_scan.scanned_at)} by {result.previous_scan.scanned_by_name || '—'}
              {result.previous_scan.location_code ? ` at ${result.previous_scan.location_code}` : ''} · {result.context_scans_count} scan(s) in total.
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded mb-4 text-sm"><i className="bi bi-check-circle me-1"></i> <strong>First scan</strong> of this barcode.</div>
          )}
          {can('barcode.view') && <p className="text-sm mb-2"><Link href={`/barcode/codes/${result.barcode.id}`} className="text-blue-600 hover:underline">Open barcode {result.barcode.barcode_value}</Link></p>}
          <LotScanPanel data={result} barcode={result.barcode} />
        </>
      )}

      {recent.length > 0 && (
        <Card title="This session" variant="info">
          <ul className="list-none p-0 m-0 space-y-1 text-sm">
            {recent.map((r) => (
              <li key={r.key}>
                <span className="font-mono">{r.value}</span>
                {r.error ? <span className="text-red-600"> · not resolved</span> : <span className="text-gray-600"> · lot {r.lot}{r.duplicate ? ' · already scanned' : ' · first scan'}</span>}
                <span className="text-gray-400"> · {formatDateTime(r.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </DashboardLayout>
  );
}
