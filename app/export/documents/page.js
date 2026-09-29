'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, EXPORT_DOC_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['draft', 'in_progress', 'closed'];

export default function ExportDocumentsPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyers, setBuyers] = useState([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [page, setPage] = useState(1);

  // The Export Document list endpoint only supports `status` and `buyer_id`
  // filters — no `search` (see Phase 5A report), unlike Inquiry/OC/PO lists.
  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (buyerFilter) params.append('buyer_id', buyerFilter);
      params.append('page', page);

      const res = await apiClient.get(`/export/documents?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, limit: 15 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Export Documents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companyFilter, buyerFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchDocs);
  }, [statusFilter, companyFilter, buyerFilter, page]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/masters/buyers?status=active&limit=1000');
        if (res.success) setBuyers(res.data.data || []);
      } catch (err) {
        console.error('Failed to load buyers for filter', err);
      }
    });
  }, []);

  const handleReset = () => {
    setStatusFilter('');
    setCompanyFilter('');
    setBuyerFilter('');
    setPage(1);
  };

  const pagination = toPaginationFromMeta(meta, meta.limit);

  return (
    <DashboardLayout>
      <PageHeading title="Export Documents" />

      <Card title="Export Documents" variant="primary">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="w-64">
            <label className="block text-xs text-fg-subtle mb-1">Buyer</label>
            <select value={buyerFilter} onChange={(e) => { setBuyerFilter(e.target.value); setPage(1); }} className="form-select">
              <option value="">All Buyers</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
            </select>
          </div>
          <CompanyFilter
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
            emptyOptionLabel="Unassigned"
            className="w-56"
          />
          <div className="w-48">
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-select">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{EXPORT_DOC_STATUS_BADGES[s].label}</option>)}
            </select>
          </div>
          <button type="button" onClick={handleReset} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
            Reset
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Doc No.</th>
                <th>Company</th>
                <th>OC No.</th>
                <th>Buyer</th>
                <th>Shipment Date</th>
                <th>Status</th>
                <th className="text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center">Loading Export Documents...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-files" title="No Export Documents yet" message="Raise one from a confirmed Order Confirmation's item list." />
              ) : (
                rows.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-mono cell-strong">{doc.doc_num}</td>
                    <td><CompanyBadge label={doc.company_label} code={doc.company_code} /></td>
                    <td className="text-fg-muted">{doc.order_confirmation_num || '—'}</td>
                    <td className="text-fg-muted">{doc.buyer_name || '—'}</td>
                    <td>{doc.shipment_date ? formatDate(doc.shipment_date) : '—'}</td>
                    <td><WorkflowBadge status={doc.status} config={EXPORT_DOC_STATUS_BADGES} /></td>
                    <td className="text-right">
                      {can('export-document.view') && (
                        <Link href={`/export/documents/${doc.id}`} className="text-fg-subtle hover:text-fg" title="View"><i className="bi bi-eye"></i></Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
