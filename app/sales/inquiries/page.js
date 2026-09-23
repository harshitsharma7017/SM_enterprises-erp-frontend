'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, INQUIRY_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['draft', 'price_working', 'quote_sent', 'confirmed', 'converted_to_oc', 'lost'];

const STAT_CARDS = [
  { key: 'total', label: 'Total', color: 'text-blue-600' },
  { key: 'draft', label: 'Drafts', color: 'text-gray-600' },
  { key: 'price_working', label: 'Price Working', color: 'text-amber-600' },
  { key: 'quote_sent', label: 'Quote Sent', color: 'text-cyan-600' },
  { key: 'confirmed', label: 'Confirmed', color: 'text-green-600' },
];

export default function InquiriesPage() {
  const { can } = useAuth(true);
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyers, setBuyers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (buyerFilter) params.append('buyer_id', buyerFilter);
      params.append('page', page);

      const res = await apiClient.get(`/inquiries?${params.toString()}`);
      if (res.success) {
        setInquiries(res.data.data || []);
        setStats(res.data.stats || null);
        setPageInfo({ total: res.data.total, page: res.data.page, limit: res.data.limit });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, companyFilter, buyerFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchInquiries);
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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInquiries();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCompanyFilter('');
    setBuyerFilter('');
    setPage(1);
  };

  const deleteInquiry = async (id, inquiryNo) => {
    if (!confirm(`Delete inquiry "${inquiryNo}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/inquiries/${id}`);
      fetchInquiries();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete inquiry');
    }
  };

  const pagination = toPaginationFromPageLimit(pageInfo);

  return (
    <DashboardLayout>
      <PageHeading
        title="Inquiries"
        actions={can('inquiry.create') && (
          <Link href="/sales/inquiries/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> New Inquiry
          </Link>
        )}
      />

      <Card title="Inquiries" variant="primary">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {STAT_CARDS.map((c) => (
              <div key={c.key} className="border rounded p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">{c.label}</div>
                <div className={`text-2xl font-semibold ${c.color}`}>{stats[c.key] ?? 0}</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Inquiry no., buyer ref, buyer name"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Buyer</label>
            <select value={buyerFilter} onChange={(e) => { setBuyerFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
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
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{INQUIRY_STATUS_BADGES[s].label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center">
              <i className="bi bi-funnel mr-1"></i>Filter
            </button>
            <button type="button" onClick={handleReset} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
              Reset
            </button>
          </div>
        </form>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Inquiry No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Order Format</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading inquiries...</td></tr>
              ) : inquiries.length === 0 ? (
                <EmptyState colspan={8} icon="bi-chat-square-text" title="No inquiries yet" message="Raise the first inquiry against a buyer and an order format." />
              ) : (
                inquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{inq.inquiry_no}</td>
                    <td className="px-4 py-2"><CompanyBadge label={inq.company_label} code={inq.company_code} /></td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(inq.inquiry_date)}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{inq.buyer_company_name || '—'}</div>
                      {inq.buyer_display_code && <div className="text-xs text-gray-500">{inq.buyer_display_code}</div>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{inq.category_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{inq.format_name || '—'}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={inq.status} config={INQUIRY_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {can('inquiry.view') && (
                          <>
                            <Link href={`/sales/inquiries/${inq.id}`} className="text-gray-500 hover:text-gray-900" title="View"><i className="bi bi-eye"></i></Link>
                            <button type="button" onClick={() => apiClient.download(`/inquiries/${inq.id}/pdf`, `${inq.inquiry_no.replace(/\//g, '-')}.pdf`)} className="text-gray-500 hover:text-gray-900" title="Download PDF"><i className="bi bi-file-earmark-pdf"></i></button>
                            <button type="button" onClick={() => apiClient.download(`/inquiries/${inq.id}/xlsx`, `${inq.inquiry_no.replace(/\//g, '-')}.xlsx`)} className="text-gray-500 hover:text-gray-900" title="Download Excel"><i className="bi bi-file-earmark-excel"></i></button>
                          </>
                        )}
                        {can('inquiry.edit') && (
                          <Link href={`/sales/inquiries/${inq.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Edit"><i className="bi bi-pencil"></i></Link>
                        )}
                        {can('inquiry.delete') && (
                          <button onClick={() => deleteInquiry(inq.id, inq.inquiry_no)} className="text-red-600 hover:text-red-900" title="Delete"><i className="bi bi-trash"></i></button>
                        )}
                      </div>
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
