'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import CompanySelect from '@/components/company/CompanySelect';
import { LOT_SOURCE_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';


/** Pick a received lot (of one company) that has no active barcode, and generate one. */
export default function GenerateBarcodePage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [lots, setLots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyLot, setBusyLot] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (company, term) => {
    if (!company) return;
    try {
      const res = await apiClient.get(`/barcodes/form-data?company_id=${company}${term ? `&search=${encodeURIComponent(term)}` : ''}`);
      setLots(res.data?.lots || []);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const generate = async (lot) => {
    setBusyLot(lot.id);
    setError(null);
    try {
      const res = await apiClient.post('/barcodes', { lot_id: lot.id, company_id: Number(companyId) });
      router.push(`/barcode/codes/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Failed to generate barcode');
      setBusyLot(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeading title="Generate Barcode" breadcrumbs={[{ label: 'Barcodes', href: '/barcode/codes' }, { label: 'Generate' }]} />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      <Card title="Received lots without a barcode" variant="primary">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" onSubmit={(e) => { e.preventDefault(); load(companyId, search); }}>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Company *</label>
            <CompanySelect value={companyId} onChange={(e) => { setCompanyId(e.target.value); setLots([]); setLoaded(false); load(e.target.value, search); }} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Lot, material, GRN or processing</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="form-input" />
          </div>
          <div className="flex items-end"><button type="submit" disabled={!companyId} className="px-3 py-1.5 border border-line-strong rounded text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-60">Search</button></div>
        </form>
        {!companyId ? <p className="text-sm text-fg-subtle m-0">Select a company.</p> : !loaded ? null : lots.length === 0 ? <p className="text-sm text-fg-subtle m-0">Every received lot here already has a barcode.</p> : (
          <table className="data-table">
            <thead><tr><th>Lot</th><th>Source</th><th>Material</th><th className="text-right">Quantity</th><th className="text-right">In stock</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono">{l.lot_no}</td>
                  <td>{LOT_SOURCE_LABELS[l.source_type]} <span className="font-mono text-fg-subtle">{l.inward_no || l.processing_no}</span></td>
                  <td>{l.product_name}</td>
                  <td className="text-right">{formatQuantity(l.quantity, l.uom_decimal_places)} {l.unit}</td>
                  <td className="text-right">{formatQuantity(l.stock_quantity, l.uom_decimal_places)}</td>
                  <td>{formatDate(l.received_date)}</td>
                  <td className="text-right"><button type="button" disabled={busyLot !== null} onClick={() => generate(l)} className="px-2.5 py-1 rounded text-xs font-medium bg-accent hover:bg-accent-hover text-white disabled:opacity-60"><i className="bi bi-upc me-1"></i> Generate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Link href="/barcode/codes" className="text-sm text-link hover:underline">Back to barcodes</Link>
    </DashboardLayout>
  );
}
