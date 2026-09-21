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

export default function CategoryIndex() {
  const { can } = useAuth(true);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
  });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.status) query.set('status', filters.status);
      const limit = 15;
      const offset = (filters.page - 1) * limit;
      query.set('limit', limit);
      query.set('offset', offset);

      const res = await apiClient.get(`/masters/categories?${query.toString()}`);
      if (res.success && res.data) {
        // Backend returns: data: { rows, count }
        setCategories(res.data.rows || []);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(res.data.count / limit),
          total: res.data.count,
          from: res.data.count > 0 ? offset + 1 : 0,
          to: Math.min(offset + limit, res.data.count),
        });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', page: 1 });
  };

  const toggleStatus = async (category) => {
    if (!can('category.edit')) return;
    try {
      await apiClient.patch(`/masters/categories/${category.id}/toggle-status`);
      fetchCategories();
    } catch (error) {
      alert('Failed to toggle status: ' + error.message);
    }
  };

  const deleteCategory = async (category) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    try {
      await apiClient.delete(`/masters/categories/${category.id}`);
      fetchCategories();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const Actions = (
    can('category.create') ? (
      <Link href="/masters/categories/create" className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add Category
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Categories</h2>
      </div>

      <Card title="Category Master" variant="primary" actions={Actions}>
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Code, name or remarks"
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
            <button type="submit" onClick={fetchCategories} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center">
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
                <th className="px-4 py-2 font-medium w-32">Code</th>
                <th className="px-4 py-2 font-medium">Category Name</th>
                <th className="px-4 py-2 font-medium">Order Formats</th>
                <th className="px-4 py-2 font-medium text-center w-24">Products</th>
                <th className="px-4 py-2 font-medium w-28">Status</th>
                <th className="px-4 py-2 font-medium text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Loading categories...</td></tr>
              ) : categories.length === 0 ? (
                <EmptyState colspan={7} icon="bi-tags" title="No categories yet" message="Add the first category — products and jobbers are linked to it." />
              ) : (
                categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{index + 1 + (filters.page - 1) * 15}</td>
                    <td className="px-4 py-2">
                      <StandardBadge className="font-mono text-gray-700 bg-white">{category.code}</StandardBadge>
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{category.name}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {category.formats && category.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {category.formats.map(format => (
                            <StandardBadge key={format.id} className="bg-white">{format.name}</StandardBadge>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">{category.products_count || 0}</td>
                    <td className="px-4 py-2">
                      <StatusBadge 
                        status={category.status} 
                        onClick={can('category.edit') ? () => toggleStatus(category) : undefined}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('category.view') && (
                          <Link href={`/masters/categories/${category.id}`} className="px-2 py-1 text-sm bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-l-md border-r-0" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        {can('category.edit') && (
                          <Link href={`/masters/categories/${category.id}`} className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('category.delete') && (
                          <button
                            type="button"
                            disabled={category.products_count > 0}
                            onClick={() => deleteCategory(category)}
                            className={`px-2 py-1 text-sm bg-white border border-red-300 rounded-r-md ${category.products_count > 0 ? 'text-gray-300 border-gray-200 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                            title={category.products_count > 0 ? "In use by products" : "Delete"}
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
