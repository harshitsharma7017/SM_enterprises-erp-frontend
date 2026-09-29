'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

export default function FobValueIndex() {
  const { can } = useAuth(true);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });
  const LIMIT = 15;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (filters.search) q.set('search', filters.search);
      if (filters.status) q.set('status', filters.status);
      q.set('limit', LIMIT);
      q.set('page', filters.page);
      const res = await apiClient.get(`/masters/fob-values?${q}`);
      if (res.success && res.data) {
        setItems(res.data.data || []);
        setPagination({
          current_page: res.data.page,
          last_page: Math.ceil(res.data.total / LIMIT),
          total: res.data.total,
          from: res.data.total > 0 ? (res.data.page - 1) * LIMIT + 1 : 0,
          to: Math.min(res.data.page * LIMIT, res.data.total),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch FOB Values');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { queueMicrotask(fetchItems); }, [fetchItems]);

  const handleFilterChange = (e) =>
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', page: 1 });
  };

  const toggleStatus = async (item) => {
    if (!can('fob-value.edit')) return;
    try {
      await apiClient.patch(`/masters/fob-values/${item.id}/toggle-status`);
      fetchItems();
    } catch (err) { alert('Failed to toggle status: ' + err.message); }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete FOB Value "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/masters/fob-values/${item.id}`);
      fetchItems();
    } catch (err) { alert('Failed to delete: ' + err.message); }
  };

  const Actions = can('fob-value.create') ? (
    <Link href="/masters/fob-values/create"
      className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> Add FOB Value
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">FOB Values</h2>
      </div>
      <Card title="FOB Value Master" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={e => e.preventDefault()}>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input type="text" name="search" value={filters.search} onChange={handleFilterChange}
              className="form-input focus:ring-[var(--focus-ring)]"
              placeholder="Name or remarks" />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="filter-bar-actions">
            <button type="submit" onClick={fetchItems} className="px-3 py-1.5 btn-neutral rounded text-sm flex items-center">
              <i className="bi bi-funnel mr-1"></i>Filter
            </button>
            <button type="button" onClick={resetFilters} className="px-3 py-1.5 border border-line-strong text-fg-muted hover:bg-surface-hover rounded text-sm">
              Reset
            </button>
          </div>
        </form>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>FOB Value Name</th>
                <th>Remarks</th>
                <th className="w-28">Status</th>
                <th className="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">Loading FOB Values…</td></tr>
              ) : items.length === 0 ? (
                <EmptyState colspan={5} icon="bi-currency-dollar" title="No FOB Values yet" message="Add the first FOB Value — it appears on export document pricing lines." />
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{(filters.page - 1) * LIMIT + idx + 1}</td>
                    <td className="cell-strong">{item.name}</td>
                    <td>{item.remarks || '—'}</td>
                    <td>
                      <StatusBadge status={item.status} onClick={can('fob-value.edit') ? () => toggleStatus(item) : undefined} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('fob-value.view') && (
                          <Link href={`/masters/fob-values/${item.id}`}
                            className="px-2 py-1 text-sm bg-surface border border-line-strong text-fg-muted hover:bg-surface-hover rounded-l-md border-r-0" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        {can('fob-value.edit') && (
                          <Link href={`/masters/fob-values/${item.id}`}
                            className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('fob-value.delete') && (
                          <button type="button" onClick={() => deleteItem(item)}
                            className="px-2 py-1 text-sm bg-surface border border-line-strong text-[var(--danger)] hover:bg-red-50 rounded-r-md" title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={page => setFilters(prev => ({ ...prev, page }))} />
      </Card>
    </DashboardLayout>
  );
}
