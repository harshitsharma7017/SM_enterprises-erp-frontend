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

export default function FormatIndex() {
  const { can } = useAuth(true);
  const [formats, setFormats] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
  });

  const fetchFormats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.status) query.set('status', filters.status);
      const limit = 15;
      const offset = (filters.page - 1) * limit;
      query.set('limit', limit);
      query.set('offset', offset);

      const res = await apiClient.get(`/masters/formats?${query.toString()}`);
      if (res.success && res.data) {
        setFormats(res.data.rows || []);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(res.data.count / limit),
          total: res.data.count,
          from: res.data.count > 0 ? offset + 1 : 0,
          to: Math.min(offset + limit, res.data.count),
        });
      }
    } catch (err) {
      console.error('Failed to fetch formats:', err);
      setError(err.data?.message || err.message || 'Failed to fetch order formats');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(fetchFormats);
  }, [fetchFormats]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', page: 1 });
  };

  const toggleStatus = async (format) => {
    if (!can('po-format.edit')) return;
    try {
      await apiClient.patch(`/masters/formats/${format.id}/toggle-status`);
      fetchFormats();
    } catch (error) {
      alert('Failed to toggle status: ' + error.message);
    }
  };

  const deleteFormat = async (format) => {
    if (!confirm(`Delete order format "${format.name}"?`)) return;
    try {
      await apiClient.delete(`/masters/formats/${format.id}`);
      fetchFormats();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const Actions = (
    can('po-format.create') ? (
      <Link href="/masters/formats/create" className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add Format
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Order Formats</h2>
      </div>

      <Card title="Order Format Master" variant="primary" actions={Actions}>
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
              placeholder="Format name or description"
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
            <button type="submit" onClick={fetchFormats} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center">
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
                <th className="px-4 py-2 font-medium">Format Name</th>
                <th className="px-4 py-2 font-medium w-36">Multi-colour</th>
                <th className="px-4 py-2 font-medium text-center w-24">Units</th>
                <th className="px-4 py-2 font-medium text-center w-28">Categories</th>
                <th className="px-4 py-2 font-medium text-center w-24">Images</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading formats...</td></tr>
              ) : formats.length === 0 ? (
                <EmptyState colspan={8} icon="bi-file-earmark-ruled" title="No order formats yet" message="A format decides the shape of the item table on every inquiry, OC and PO." />
              ) : (
                formats.map((format, index) => (
                  <tr key={format.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{index + 1 + (filters.page - 1) * 15}</td>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-gray-800">{format.name}</div>
                      {format.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {format.description.length > 70 ? format.description.substring(0, 70) + '...' : format.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${format.allow_multiple_colours ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                        {format.allow_multiple_colours ? 'Several per item' : 'One per row'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">{format.units_count || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{format.categories_count || 0}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{format.images_count || 0}</td>
                    <td className="px-4 py-2">
                      <StatusBadge 
                        status={format.status} 
                        onClick={can('po-format.edit') ? () => toggleStatus(format) : undefined}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('po-format.view') && (
                          <Link href={`/masters/formats/${format.id}`} className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        {can('po-format.edit') && (
                          <Link href={`/masters/formats/${format.id}`} className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('po-format.delete') && (
                          <button
                            type="button"
                            onClick={() => deleteFormat(format)}
                            className="px-2 py-1 text-sm bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-r-md"
                            title="Delete"
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
