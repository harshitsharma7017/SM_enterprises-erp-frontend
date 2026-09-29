'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { WorkflowBadge, PO_STATUS_BADGES, PO_ORIGIN_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
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
  const [companyFilter, setCompanyFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchPos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (supplierFilter) params.append('supplier_id', supplierFilter);
      if (originFilter) params.append('origin', originFilter);
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
  }, [searchTerm, statusFilter, companyFilter, supplierFilter, originFilter, page]);

  useEffect(() => {
    queueMicrotask(fetchPos);
  }, [statusFilter, companyFilter, supplierFilter, originFilter, page]);

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
    setCompanyFilter('');
    setSupplierFilter('');
    setOriginFilter('');
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
          <>
            <Link href="/procurement/purchase-orders/create-planning" className="border border-blue-600 text-link hover:bg-surface-hover px-4 py-2 rounded text-sm font-medium">
              <i className="bi bi-list-check me-1"></i> New Planning PO
            </Link>
            <Link href="/procurement/purchase-orders/create" className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium">
              <i className="bi bi-plus-lg me-1"></i> New PO
            </Link>
          </>
        )}
      />

      <Card title="Purchase Orders" variant="primary">
        <form onSubmit={handleSearch} className="filter-bar mb-4">
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="PO no., contract no., supplier"
              className="form-input focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Supplier</label>
            <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }} className="form-select">
              <option value="">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Origin</label>
            <select value={originFilter} onChange={(e) => { setOriginFilter(e.target.value); setPage(1); }} className="form-select">
              <option value="">All Origins</option>
              {Object.entries(PO_ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <CompanyFilter
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
            emptyOptionLabel="Unassigned"
          />
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-select">
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PO_STATUS_BADGES[s].label}</option>)}
            </select>
          </div>
          <div className="filter-bar-actions">
            <button type="submit" className="px-3 py-1.5 btn-neutral rounded text-sm flex items-center">
              <i className="bi bi-funnel mr-1"></i>Filter
            </button>
            <button type="button" onClick={handleReset} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
              Reset
            </button>
          </div>
        </form>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO No.</th>
                <th>Company</th>
                <th>Date</th>
                <th>Source</th>
                <th>Supplier</th>
                <th>Status</th>
                <th className="text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center">Loading Purchase Orders...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={7} icon="bi-cart-check" title="No Purchase Orders yet" message="Raise a PO from a confirmed Order Confirmation, or create one directly." />
              ) : (
                rows.map((po) => (
                  <tr key={po.id}>
                    <td className="font-mono cell-strong">{po.po_num}</td>
                    <td><CompanyBadge label={po.company_label} code={po.company_code} /></td>
                    <td>{formatDate(po.po_date)}</td>
                    <td className="text-fg-muted">
                      <div className="text-xs text-fg-subtle">{PO_ORIGIN_LABELS[po.origin] || '—'}</div>
                      <div className="font-mono">{po.origin === 'order_confirmation' ? (po.oc_num || '—') : (po.material_plan_no || 'Requirements')}</div>
                    </td>
                    <td>
                      <div className="text-fg">{po.supplier_company_name || '—'}</div>
                      {po.supplier_display_code && <div className="text-xs text-fg-subtle">{po.supplier_display_code}</div>}
                    </td>
                    <td><WorkflowBadge status={po.status} config={PO_STATUS_BADGES} /></td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {can('purchase-order.view') && (
                          <Link href={`/procurement/purchase-orders/${po.id}`} className="text-fg-subtle hover:text-fg" title="View"><i className="bi bi-eye"></i></Link>
                        )}
                        {can('purchase-order.edit') && po.status !== 'cancelled' && (
                          <Link href={`/procurement/purchase-orders/${po.id}/edit`} className="text-link hover:text-blue-900" title="Edit"><i className="bi bi-pencil"></i></Link>
                        )}
                        {can('purchase-order.delete') && (po.origin === 'order_confirmation' || po.status === 'draft') && (
                          <button onClick={() => deletePo(po.id, po.po_num)} className="text-[var(--danger)] hover:text-red-900" title="Delete"><i className="bi bi-trash"></i></button>
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
