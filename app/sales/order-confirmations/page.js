'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, OC_STATUS_BADGES, ORDER_STATUS_BADGES, StandardBadge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['draft', 'sent', 'confirmed', 'cancelled'];
const MODE_LABELS = { oc: 'Order Confirmation', direct: 'Direct Buyer Contract' };

export default function OrderConfirmationsPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyers, setBuyers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [brands, setBrands] = useState([]);
  const [page, setPage] = useState(1);

  const fetchOcs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (buyerFilter) params.append('buyer_id', buyerFilter);
      if (brandFilter) params.append('brand_id', brandFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('page', page);

      const res = await apiClient.get(`/sales/order-confirmations?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, last_page: 1 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Order Confirmations');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, companyFilter, buyerFilter, brandFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    queueMicrotask(fetchOcs);
  }, [statusFilter, companyFilter, buyerFilter, brandFilter, dateFrom, dateTo, page]);

  // Brand filter options need brand.view; without it the filter is hidden.
  useEffect(() => {
    if (!can('brand.view')) return;
    apiClient.get('/masters/brands?limit=500')
      .then((res) => setBrands(res.data?.data || []))
      .catch(() => setBrands([]));
  }, [can]);

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
    fetchOcs();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCompanyFilter('');
    setBuyerFilter('');
    setBrandFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const deleteOc = async (id, ocNum) => {
    if (!confirm(`Delete OC "${ocNum}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/sales/order-confirmations/${id}`);
      fetchOcs();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete Order Confirmation');
    }
  };

  const pagination = toPaginationFromMeta(meta);

  return (
    <DashboardLayout>
      <PageHeading
        title="Order Confirmations"
        actions={can('order-confirmation.create') && (
          <Link href="/sales/order-confirmations/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> New OC
          </Link>
        )}
      />

      <Card title="Order Confirmations" variant="primary">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Contract no., buyer"
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
          {can('brand.view') && (
            <div className="w-44">
              <label className="block text-xs text-gray-500 mb-1">Brand</label>
              <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">All Brands</option>
                {brands.filter((b) => !companyFilter || String(b.company_id) === String(companyFilter)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{OC_STATUS_BADGES[s].label}</option>)}
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
                <th className="px-4 py-2 font-medium">Contract No.</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Buyer / Brand</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Source Inquiry</th>
                <th className="px-4 py-2 font-medium">Order Status</th>
                <th className="px-4 py-2 font-medium">Production</th>
                <th className="px-4 py-2 font-medium text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading Order Confirmations...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={9} icon="bi-check2-square" title="No Order Confirmations yet" message="Convert a confirmed inquiry, or raise a direct buyer contract." />
              ) : (
                rows.map((oc) => (
                  <tr key={oc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{oc.oc_num}</td>
                    <td className="px-4 py-2"><CompanyBadge label={oc.company_label} code={oc.company_code} /></td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(oc.oc_date)}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{oc.buyer_company_name || '—'}</div>
                      {oc.buyer_display_code && <div className="text-xs text-gray-500">{oc.buyer_display_code}</div>}
                      {oc.brand_name && <div className="text-xs text-gray-500">Brand: {oc.brand_name}</div>}
                    </td>
                    <td className="px-4 py-2">
                      {oc.mode === 'direct' ? (
                        <span className="badge rounded-md px-2 py-1 text-xs font-medium bg-gray-800 text-white">{MODE_LABELS.direct}</span>
                      ) : (
                        <StandardBadge>{MODE_LABELS.oc}</StandardBadge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{oc.source_inquiry_id ? `#${oc.source_inquiry_id}` : '—'}</td>
                    <td className="px-4 py-2"><WorkflowBadge status={oc.order_status || oc.status} config={oc.order_status ? ORDER_STATUS_BADGES : OC_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {oc.items_count > 0 ? `${oc.produced_items_count}/${oc.items_count} lines produced` : '—'}
                      {oc.allocated_items_count > oc.produced_items_count && <div className="text-amber-700">{oc.allocated_items_count - oc.produced_items_count} in progress</div>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {can('order-confirmation.view') && (
                          <Link href={`/sales/order-confirmations/${oc.id}`} className="text-gray-500 hover:text-gray-900" title="View"><i className="bi bi-eye"></i></Link>
                        )}
                        {can('order-confirmation.edit') && oc.status !== 'cancelled' && (
                          <Link href={`/sales/order-confirmations/${oc.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Edit"><i className="bi bi-pencil"></i></Link>
                        )}
                        {can('order-confirmation.delete') && (
                          <button onClick={() => deleteOc(oc.id, oc.oc_num)} className="text-red-600 hover:text-red-900" title="Delete"><i className="bi bi-trash"></i></button>
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
