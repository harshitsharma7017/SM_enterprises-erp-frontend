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
      className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> Add FOB Value
    </Link>
  ) : null;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">FOB Values</h2>
      </div>
      <Card title="FOB Value Master" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={e => e.preventDefault()}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" name="search" value={filters.search} onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Name or remarks" />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" onClick={fetchItems} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center">
              <i className="bi bi-funnel mr-1"></i>Filter
            </button>
            <button type="button" onClick={resetFilters} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
              Reset
            </button>
          </div>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium w-12">#</th>
                <th className="px-4 py-2 font-medium">FOB Value Name</th>
                <th className="px-4 py-2 font-medium">Remarks</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading FOB Values…</td></tr>
              ) : items.length === 0 ? (
                <EmptyState colspan={5} icon="bi-currency-dollar" title="No FOB Values yet" message="Add the first FOB Value — it appears on export document pricing lines." />
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{(filters.page - 1) * LIMIT + idx + 1}</td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{item.name}</td>
                    <td className="px-4 py-2 text-gray-500">{item.remarks || '—'}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={item.status} onClick={can('fob-value.edit') ? () => toggleStatus(item) : undefined} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('fob-value.view') && (
                          <Link href={`/masters/fob-values/${item.id}`}
                            className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        {can('fob-value.edit') && (
                          <Link href={`/masters/fob-values/${item.id}`}
                            className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('fob-value.delete') && (
                          <button type="button" onClick={() => deleteItem(item)}
                            className="px-2 py-1 text-sm bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-r-md" title="Delete">
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
