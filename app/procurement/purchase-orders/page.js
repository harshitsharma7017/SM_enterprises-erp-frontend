'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, PO_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/components/sales/shared/format';
import { toPaginationFromMeta } from '@/components/sales/shared/pagination';
import PageHeading from '@/components/sales/shared/PageHeading';

const STATUS_OPTIONS = ['draft', 'raised', 'partial', 'received'];

export default function PurchaseOrdersPage() {
  const { can } = useAuth(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchPos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (supplierFilter) params.append('supplier_id', supplierFilter);
      params.append('page', page);

      const res = await apiClient.get(`/procurement/purchase-orders?${params.toString()}`);
      if (res.success) {
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, page: 1, last_page: 1 });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch Purchase Orders');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, supplierFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchPos);
  }, [statusFilter, supplierFilter, page]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const res = await apiClient.get('/masters/suppliers?status=active&party_type=supplier&limit=1000');
        if (res.success) setSuppliers(res.data.data || []);
      } catch (err) {
        console.error('Failed to load suppliers for filter', err);
      }
    });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPos();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSupplierFilter('');
    setPage(1);
  };

  const deletePo = async (id, poNum) => {
    if (!confirm(`Delete PO "${poNum}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/procurement/purchase-orders/${id}`);
      fetchPos();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete Purchase Order');
    }
  };

  const pagination = toPaginationFromMeta(meta);

  return (
    <DashboardLayout>
      <PageHeading
        title="Purchase Orders"
        actions={can('purchase-order.create') && (
          <Link href="/procurement/purchase-orders/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> New PO
          </Link>
        )}
      />

      <Card title="Purchase Orders" variant="primary">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="PO no., contract no., supplier"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Supplier</label>
            <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PO_STATUS_BADGES[s].label}</option>)}
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
                <th className="px-4 py-2 font-medium">PO No.</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Contract No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading Purchase Orders...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-cart-check" title="No Purchase Orders yet" message="Raise a PO from a confirmed Order Confirmation, or create one directly." />
              ) : (
                rows.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{po.po_num}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(po.po_date)}</td>
                    <td className="px-4 py-2 text-gray-700">{po.oc_num || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{po.supplier_company_name || '—'}</div>
                      {po.supplier_display_code && <div className="text-xs text-gray-500">{po.supplier_display_code}</div>}
                    </td>
                    <td className="px-4 py-2"><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {can('purchase-order.view') && (
                          <Link href={`/procurement/purchase-orders/${po.id}`} className="text-gray-500 hover:text-gray-900" title="View"><i className="bi bi-eye"></i></Link>
                        )}
                        {can('purchase-order.edit') && (
                          <Link href={`/procurement/purchase-orders/${po.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Edit"><i className="bi bi-pencil"></i></Link>
                        )}
                        {can('purchase-order.delete') && (
                          <button onClick={() => deletePo(po.id, po.po_num)} className="text-red-600 hover:text-red-900" title="Delete"><i className="bi bi-trash"></i></button>
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
