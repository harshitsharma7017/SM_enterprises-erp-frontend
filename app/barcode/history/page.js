'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, SCAN_RESULT_BADGES, SCAN_CONTEXT_LABELS } from '@/components/ui/Badge';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';
const EMPTY_FILTERS = { search: '', company_id: '', context: '', result: '', duplicate: '', date_from: '', date_to: '' };

/** Immutable scan history: every scan, found or not, with who / when / where and the duplicate flag. */
export default function ScanHistoryPage() {
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      params.append('limit', 25);
      const res = await apiClient.get(`/barcodes/scans?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch scan history');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageHeading title="Scan History" breadcrumbs={[{ label: 'Barcode' }, { label: 'Scan History' }]} />
      <Card title="Every scan, as recorded (read-only)" variant="primary">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Scanned value, lot or user" className={INPUT} />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-44" />
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Context</label>
            <select value={filters.context} onChange={(e) => setFilter('context', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(SCAN_CONTEXT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Result</label>
            <select value={filters.result} onChange={(e) => setFilter('result', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(SCAN_RESULT_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Repeat scan</label>
            <select value={filters.duplicate} onChange={(e) => setFilter('duplicate', e.target.value)} className={INPUT}>
              <option value="">All</option>
              <option value="0">First scans</option>
              <option value="1">Duplicates</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">Reset</button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Scanned at</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Lot / material</th>
                <th className="px-4 py-2 font-medium">Context</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading scan history...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={8} icon="bi-clock-history" title="No scans" message="Scans appear here as they are made." />
              ) : rows.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(s.scanned_at)}</td>
                  <td className="px-4 py-2"><CompanyBadge label={s.company_label} code={s.company_code} /></td>
                  <td className="px-4 py-2 font-mono text-xs">{s.barcode_id ? <Link href={`/barcode/codes/${s.barcode_id}`} className="text-blue-600 hover:underline">{s.barcode_value}</Link> : s.barcode_value}</td>
                  <td className="px-4 py-2">{s.lot_no ? <><span className="font-mono text-xs">{s.lot_no}</span><div className="text-xs text-gray-500">{s.product_name}</div></> : '—'}</td>
                  <td className="px-4 py-2 text-xs">{SCAN_CONTEXT_LABELS[s.context]}</td>
                  <td className="px-4 py-2 font-mono text-xs">{s.location_code || '—'}</td>
                  <td className="px-4 py-2">{s.scanned_by_name || '—'}</td>
                  <td className="px-4 py-2">
                    <WorkflowBadge status={s.result} config={SCAN_RESULT_BADGES} />
                    {s.is_duplicate === 1 && <div className="text-xs text-amber-700 mt-0.5">Duplicate · previous {formatDateTime(s.previous_scanned_at)}{s.previous_scanned_by_name ? ` by ${s.previous_scanned_by_name}` : ''}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
