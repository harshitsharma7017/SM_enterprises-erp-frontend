'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Pagination from '../../../components/ui/Pagination';
import { StatusBadge, StandardBadge } from '../../../components/ui/Badge';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';

const LIMIT = 15;

export default function UomIndex() {
  const { can } = useAuth(true);
  const [uoms, setUoms] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });

  const fetchUoms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.status) query.set('status', filters.status);
      query.set('page', filters.page);
      query.set('limit', LIMIT);

      const res = await apiClient.get(`/masters/uoms?${query.toString()}`);
      if (res.success && res.data) {
        const count = res.data.total || 0;
        const offset = (filters.page - 1) * LIMIT;
        setUoms(res.data.data || []);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(count / LIMIT),
          total: count,
          from: count > 0 ? offset + 1 : 0,
          to: Math.min(offset + LIMIT, count),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch UOMs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(fetchUoms);
  }, [fetchUoms]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', page: 1 });
  };

  const toggleStatus = async (uom) => {
    if (!can('uom.edit')) return;
    try {
      await apiClient.patch(`/masters/uoms/${uom.id}/toggle-status`);
      fetchUoms();
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const deleteUom = async (uom) => {
    if (!confirm(`Delete UOM "${uom.name}"?`)) return;
    try {
      await apiClient.delete(`/masters/uoms/${uom.id}`);
      fetchUoms();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const Actions = (
    can('uom.create') ? (
      <Link href="/masters/uoms/create" className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add UOM
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Units of Measure</h2>
      </div>

      <Card title="UOM Master" variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Code or name, e.g. MTR"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
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
                <th className="px-4 py-2 font-medium w-32">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium text-center w-32">Decimal Places</th>
                <th className="px-4 py-2 font-medium text-center w-24">Products</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading UOMs...</td></tr>
              ) : uoms.length === 0 ? (
                <EmptyState colspan={7} icon="bi-rulers" title="No UOMs found" message="Add the units products are measured in, e.g. MTR for metres." />
              ) : (
                uoms.map((uom, index) => (
                  <tr key={uom.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{index + 1 + (filters.page - 1) * LIMIT}</td>
                    <td className="px-4 py-2">
                      <StandardBadge className="font-mono text-gray-700 bg-white">{uom.code}</StandardBadge>
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{uom.name}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{uom.decimal_places}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{uom.products_count || 0}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={uom.status} onClick={can('uom.edit') ? () => toggleStatus(uom) : undefined} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('uom.edit') && (
                          <Link href={`/masters/uoms/${uom.id}`} className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('uom.delete') && (
                          <button
                            type="button"
                            disabled={uom.products_count > 0}
                            onClick={() => deleteUom(uom)}
                            className={`px-2 py-1 text-sm bg-white border rounded-r-md ${can('uom.edit') ? '' : 'rounded-l-md'} ${uom.products_count > 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                            title={uom.products_count > 0 ? 'In use by products — deactivate instead' : 'Delete'}
                          >
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

        <Pagination pagination={pagination} onPageChange={(page) => setFilters(prev => ({ ...prev, page }))} />
      </Card>
    </DashboardLayout>
  );
}
