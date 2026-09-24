'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';
import { creditTermsLabel } from '@/components/masters/suppliers/PartyShow';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

/** Guru Traders' masters/{suppliers,jobbers}/index.blade.php. */
const PARTY_TYPES = { supplier: 'Supplier (trading — finished goods)', jobber: 'Jobber (jobwork — we supply the material)', both: 'Both' };
const TYPE_BADGE = { supplier: 'Trading', jobber: 'Jobwork', both: 'Both' };
const PER_PAGE = 15;
const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';
const EMPTY = { search: '', party_type: '', category_id: '', status: '', company_id: '' };

function StatusBadge({ active }) {
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

export default function PartyList({ kind = 'supplier' }) {
  const isJobber = kind === 'jobber';
  const base = isJobber ? '/masters/jobbers' : '/masters/suppliers';
  const { can } = useAuth(true);
  // The jobber screens accept either the jobber or the supplier permission.
  const allowed = (action) => (isJobber ? can(`jobber.${action}`) || can(`supplier.${action}`) : can(`supplier.${action}`));
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PER_PAGE });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page, limit: PER_PAGE });
      Object.entries(filters).forEach(([k, v]) => { if (v && !(isJobber && k === 'party_type')) params.append(k, v); });
      const res = await apiClient.get(`${base}?${params}`);
      setRows(res.data?.data || []);
      setMeta({ total: res.data?.total || 0, page: res.data?.page || page, limit: res.data?.limit || PER_PAGE });
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [base, filters, page, isJobber]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // Category choices for the filter (from the form data; hidden if the user cannot open it).
  useEffect(() => {
    apiClient.get(`${base}/create`).then((res) => setCategories(res.data?.categories || [])).catch(() => setCategories([]));
  }, [base]);

  const applyFilters = (e) => {
    e.preventDefault();
    setFilters(draft);
    setPage(1);
  };
  const reset = () => {
    setDraft(EMPTY);
    setFilters(EMPTY);
    setPage(1);
  };

  const toggleStatus = async (row) => {
    try {
      const res = await apiClient.patch(`${base}/${row.id}/toggle-status`);
      setNotice(res.message || null);
      fetchRows();
    } catch (err) {
      setError(err.message || 'Failed to change the status');
    }
  };
  const remove = async (row) => {
    if (!confirm(`Delete ${isJobber ? 'jobber' : 'supplier'} "${row.company_name}"?`)) return;
    try {
      const res = await apiClient.delete(`${base}/${row.id}`);
      setNotice(res.message || null);
      fetchRows();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const first = meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <DashboardLayout>
      <div className="mb-4"><h2 className="text-2xl font-semibold text-gray-900 m-0">{isJobber ? 'Jobbers' : 'Suppliers'}</h2></div>
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] border-t-[3px] border-t-blue-600">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="text-[1.1rem] font-semibold text-gray-900 m-0">{isJobber ? 'Jobber Master' : 'Supplier Master'}</h3>
          {allowed('create') && (
            <Link href={`${base}/create`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm inline-flex items-center no-underline">
              <i className="bi bi-plus-lg mr-1"></i> Add {isJobber ? 'Jobber' : 'Supplier'}
            </Link>
          )}
        </div>
        <div className="p-4">
          <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 mb-4">
            <div className={isJobber ? 'w-72' : 'w-60'}>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input type="text" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Code, company, GST, contact or city" className={INPUT} />
            </div>
            {!isJobber && (
              <div className="w-60">
                <label className="block text-xs text-gray-500 mb-1">Party Type</label>
                <select value={draft.party_type} onChange={(e) => setDraft({ ...draft, party_type: e.target.value })} className={INPUT}>
                  <option value="">All</option>
                  {Object.entries(PARTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            )}
            {categories.length > 0 && (
              <div className="w-44">
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })} className={INPUT}>
                  <option value="">All</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={INPUT}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <CompanyFilter value={draft.company_id} onChange={(e) => setDraft({ ...draft, company_id: e.target.value })} emptyOptionLabel="Shared only" className="w-44" />
            <div className="flex gap-2">
              <button type="submit" className="px-3 py-1.5 rounded text-sm bg-gray-600 hover:bg-gray-700 text-white"><i className="bi bi-funnel me-1"></i>Filter</button>
              <button type="button" onClick={reset} className="px-3 py-1.5 rounded text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">Reset</button>
            </div>
          </form>

          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium w-12">#</th>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">City</th>
                  <th className="px-3 py-2 font-medium text-right">Credit</th>
                  <th className="px-3 py-2 font-medium text-center">Categories</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr><td colSpan="10" className="text-center py-8 text-gray-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <EmptyState colspan={10} icon={isJobber ? 'bi-tools' : 'bi-truck'} title={isJobber ? 'No jobbers yet' : 'No suppliers yet'}
                    message={isJobber ? 'Add the first jobber — work orders are assigned to them.' : 'Add the first supplier or jobber — a purchase order is raised against one.'} />
                ) : rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{first + i}</td>
                    <td className="px-3 py-2"><span className="inline-block bg-gray-100 border rounded px-2 font-mono text-xs">{r.display_code}</span></td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{r.company_name}</div>
                      {r.supplier_type_name && <div className="text-xs text-gray-500">{r.supplier_type_name}</div>}
                      <CompanyBadge label={r.company_label} code={r.company_code} emptyLabel="Shared" />
                    </td>
                    <td className="px-3 py-2"><span className="inline-block bg-gray-100 border rounded px-2 text-xs">{TYPE_BADGE[r.party_type]}</span></td>
                    <td className="px-3 py-2 text-gray-600">{r.primary_contact_name || '—'}{r.primary_contact_designation_name && <div className="text-xs">{r.primary_contact_designation_name}</div>}</td>
                    <td className="px-3 py-2 text-gray-600">{r.city_name || '—'}{r.state_name && <div className="text-xs">{r.state_name}</div>}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{creditTermsLabel(r.credit_days) || '—'}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{r.categories_count}</td>
                    <td className="px-3 py-2">
                      {allowed('edit')
                        ? <button type="button" onClick={() => toggleStatus(r)} title="Click to toggle" className="p-0 border-0 bg-transparent"><StatusBadge active={r.status === 'active'} /></button>
                        : <StatusBadge active={r.status === 'active'} />}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex border border-gray-200 rounded overflow-hidden">
                        {allowed('view') && <Link href={`${base}/${r.id}`} title="View" className="px-2 py-1 text-gray-600 hover:bg-gray-50"><i className="bi bi-eye"></i></Link>}
                        {allowed('edit') && <Link href={`${base}/${r.id}/edit`} title="Edit" className="px-2 py-1 text-blue-600 hover:bg-blue-50 border-l border-gray-200"><i className="bi bi-pencil"></i></Link>}
                        {allowed('delete') && <button type="button" onClick={() => remove(r)} title="Delete" className="px-2 py-1 text-red-600 hover:bg-red-50 border-l border-gray-200"><i className="bi bi-trash"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.total > meta.limit && <div className="mt-3"><Pagination pagination={toPaginationFromPageLimit(meta)} onPageChange={setPage} /></div>}
          <div className="text-gray-500 text-xs mt-2">Showing {first}–{last} of {meta.total}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
