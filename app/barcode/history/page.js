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
        {error && <div className="alert alert-danger">{error}</div>}
        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Scanned value, lot or user" className="form-input" />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Context</label>
            <select value={filters.context} onChange={(e) => setFilter('context', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(SCAN_CONTEXT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Result</label>
            <select value={filters.result} onChange={(e) => setFilter('result', e.target.value)} className="form-select">
              <option value="">All</option>
              {Object.entries(SCAN_RESULT_BADGES).map(([value, b]) => <option key={value} value={value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Repeat scan</label>
            <select value={filters.duplicate} onChange={(e) => setFilter('duplicate', e.target.value)} className="form-select">
              <option value="">All</option>
              <option value="0">First scans</option>
              <option value="1">Duplicates</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">From</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className="form-input" />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">Reset</button>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Scanned at</th>
                <th>Company</th>
                <th>Value</th>
                <th>Lot / material</th>
                <th>Context</th>
                <th>Location</th>
                <th>User</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center">Loading scan history...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={8} icon="bi-clock-history" title="No scans" message="Scans appear here as they are made." />
              ) : rows.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{formatDateTime(s.scanned_at)}</td>
                  <td><CompanyBadge label={s.company_label} code={s.company_code} /></td>
                  <td className="font-mono">{s.barcode_id ? <Link href={`/barcode/codes/${s.barcode_id}`} className="text-link hover:underline">{s.barcode_value}</Link> : s.barcode_value}</td>
                  <td>{s.lot_no ? <><span className="font-mono text-xs">{s.lot_no}</span><div className="text-xs text-fg-subtle">{s.product_name}</div></> : '—'}</td>
                  <td>{SCAN_CONTEXT_LABELS[s.context]}</td>
                  <td className="font-mono">{s.location_code || '—'}</td>
                  <td>{s.scanned_by_name || '—'}</td>
                  <td>
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
