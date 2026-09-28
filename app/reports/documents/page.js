'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const TYPES = {
  purchase_order: 'Purchase Order',
  grn: 'Goods Receipt Note',
  quality_inspection: 'Quality Inspection Report',
  supplier_return: 'Return Challan',
  debit_note: 'Debit Note',
  material_issue: 'Material Issue Slip',
  processing_record: 'Processing Record',
  dispatch: 'Delivery Challan',
  proforma_invoice: 'Proforma Invoice',
  invoice: 'Invoice',
};
const EVENTS = { issued: 'Issued', posted: 'Posted', confirmed: 'Confirmed', completed: 'Completed', output_posted: 'Output posted', backfilled: 'Backfilled' };
const EMPTY_FILTERS = { search: '', company_id: '', entity_type: '', date_from: '', date_to: '' };
const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

/**
 * Document Archive (requirement 18): the copy of each document kept when its
 * transaction was issued / posted, linked back to the record.
 */
export default function DocumentArchivePage() {
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 25 });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/documents?${params.toString()}`);
      setRows(res.data?.data || []);
      setPageInfo({ total: res.data?.total || 0, page: res.data?.page || 1, limit: res.data?.limit || 25 });
    } catch (err) {
      setError(err.message || 'Failed to load documents');
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
  const download = (row) => apiClient.download(`/documents/${row.id}/download`, row.file_name).catch((err) => setError(err.message));

  return (
    <DashboardLayout>
      <PageHeading title="Document Archive" breadcrumbs={[{ label: 'Reports' }, { label: 'Document Archive' }]} />
      <Card title="Copies kept when documents were issued or posted" variant="primary">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => { e.preventDefault(); fetchRows(); }}>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Document number" className={INPUT} />
          </div>
          <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-52" />
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Document</label>
            <select value={filters.entity_type} onChange={(e) => setFilter('entity_type', e.target.value)} className={INPUT}>
              <option value="">All</option>
              {Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Archived from</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Archived to</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
          </div>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">Reset</button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Document</th><th className="px-4 py-2 font-medium">Number</th><th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Archived</th><th className="px-4 py-2 font-medium">Event</th><th className="px-4 py-2 font-medium text-right">Size</th><th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-archive" title="No archived documents" message="A copy is kept automatically when a document is issued or posted." />
              ) : rows.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{d.document_type}</td>
                  <td className="px-4 py-2 font-mono">{d.record_path ? <Link href={`${d.record_path}/${d.entity_id}`} className="text-blue-600 hover:underline">{d.document_no}</Link> : d.document_no}</td>
                  <td className="px-4 py-2">{d.company_id ? <CompanyBadge label={d.company_label} code={d.company_code} /> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2 text-gray-700">{formatDateTime(d.created_at)}{d.creator_name && <div className="text-xs text-gray-500">{d.creator_name}</div>}</td>
                  <td className="px-4 py-2 text-gray-700">{EVENTS[d.event] || d.event}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{(d.file_size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-2 text-right"><button type="button" onClick={() => download(d)} className="text-blue-600 hover:text-blue-800 text-sm"><i className="bi bi-download me-1"></i>PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">&quot;Backfilled&quot; copies were made when the archive was introduced, from the record as it stood then; every later copy is the document exactly as it was when issued or posted.</p>
        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
