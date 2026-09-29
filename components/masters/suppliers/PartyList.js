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
      <div className="mb-4"><h2 className="text-2xl font-semibold text-fg m-0">{isJobber ? 'Jobbers' : 'Suppliers'}</h2></div>
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] border-t-[3px] border-t-blue-600">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="text-[1.1rem] font-semibold text-fg m-0">{isJobber ? 'Jobber Master' : 'Supplier Master'}</h3>
          {allowed('create') && (
            <Link href={`${base}/create`} className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm inline-flex items-center no-underline">
              <i className="bi bi-plus-lg mr-1"></i> Add {isJobber ? 'Jobber' : 'Supplier'}
            </Link>
          )}
        </div>
        <div className="p-4">
          <form onSubmit={applyFilters} className="filter-bar mb-4">
            <div className={isJobber ? 'w-72' : 'w-60'}>
              <label className="block text-xs text-fg-subtle mb-1">Search</label>
              <input type="text" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="Code, company, GST, contact or city" className="form-input" />
            </div>
            {!isJobber && (
              <div>
                <label className="block text-xs text-fg-subtle mb-1">Party Type</label>
                <select value={draft.party_type} onChange={(e) => setDraft({ ...draft, party_type: e.target.value })} className="form-select">
                  <option value="">All</option>
                  {Object.entries(PARTY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            )}
            {categories.length > 0 && (
              <div>
                <label className="block text-xs text-fg-subtle mb-1">Category</label>
                <select value={draft.category_id} onChange={(e) => setDraft({ ...draft, category_id: e.target.value })} className="form-select">
                  <option value="">All</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-fg-subtle mb-1">Status</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="form-select">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <CompanyFilter value={draft.company_id} onChange={(e) => setDraft({ ...draft, company_id: e.target.value })} emptyOptionLabel="Shared only" />
            <div className="filter-bar-actions">
              <button type="submit" className="px-3 py-1.5 rounded text-sm btn-neutral"><i className="bi bi-funnel me-1"></i>Filter</button>
              <button type="button" onClick={reset} className="px-3 py-1.5 rounded text-sm border border-line-strong text-fg-muted hover:bg-surface-hover">Reset</button>
            </div>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th className="text-right">Credit</th>
                  <th className="text-center">Categories</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="text-center">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <EmptyState colspan={10} icon={isJobber ? 'bi-tools' : 'bi-truck'} title={isJobber ? 'No jobbers yet' : 'No suppliers yet'}
                    message={isJobber ? 'Add the first jobber — work orders are assigned to them.' : 'Add the first supplier or jobber — a purchase order is raised against one.'} />
                ) : rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{first + i}</td>
                    <td><span className="inline-block bg-surface-raised border rounded px-2 font-mono text-xs">{r.display_code}</span></td>
                    <td>
                      <div className="font-semibold">{r.company_name}</div>
                      {r.supplier_type_name && <div className="text-xs text-fg-subtle">{r.supplier_type_name}</div>}
                      <CompanyBadge label={r.company_label} code={r.company_code} emptyLabel="Shared" />
                    </td>
                    <td><span className="inline-block bg-surface-raised border rounded px-2 text-xs">{TYPE_BADGE[r.party_type]}</span></td>
                    <td className="text-fg-muted">{r.primary_contact_name || '—'}{r.primary_contact_designation_name && <div className="text-xs">{r.primary_contact_designation_name}</div>}</td>
                    <td className="text-fg-muted">{r.city_name || '—'}{r.state_name && <div className="text-xs">{r.state_name}</div>}</td>
                    <td className="text-right text-fg-muted">{creditTermsLabel(r.credit_days) || '—'}</td>
                    <td className="text-center text-fg-muted">{r.categories_count}</td>
                    <td>
                      {allowed('edit')
                        ? <button type="button" onClick={() => toggleStatus(r)} title="Click to toggle" className="p-0 border-0 bg-transparent"><StatusBadge active={r.status === 'active'} /></button>
                        : <StatusBadge active={r.status === 'active'} />}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="inline-flex border border-line rounded overflow-hidden">
                        {allowed('view') && <Link href={`${base}/${r.id}`} title="View" className="px-2 py-1 text-fg-muted hover:bg-surface-hover"><i className="bi bi-eye"></i></Link>}
                        {allowed('edit') && <Link href={`${base}/${r.id}/edit`} title="Edit" className="px-2 py-1 text-link hover:bg-surface-hover border-l border-line"><i className="bi bi-pencil"></i></Link>}
                        {allowed('delete') && <button type="button" onClick={() => remove(r)} title="Delete" className="px-2 py-1 text-[var(--danger)] hover:bg-red-50 border-l border-line"><i className="bi bi-trash"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.total > meta.limit && <div className="mt-3"><Pagination pagination={toPaginationFromPageLimit(meta)} onPageChange={setPage} /></div>}
          <div className="text-fg-subtle text-xs mt-2">Showing {first}–{last} of {meta.total}</div>
        </div>
      </div>
    </DashboardLayout>
  );
}
