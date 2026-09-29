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
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
  });

  const fetchCategories = useCallback(async () => {
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

      const res = await apiClient.get(`/masters/categories?${query.toString()}`);
      if (res.success && res.data) {
        // Backend returns: data: { data, total } or { rows, count } depending on the module
        const rows = res.data.data || res.data.rows || [];
        const count = res.data.total || res.data.count || 0;
        
        setCategories(rows);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(count / limit),
          total: count,
          from: count > 0 ? offset + 1 : 0,
          to: Math.min(offset + limit, count),
        });
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err.data?.message || err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(fetchCategories);
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
      <Link href="/masters/categories/create" className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add Category
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">Categories</h2>
      </div>

      <Card title="Category Master" variant="primary" actions={Actions}>
        {error && <div className="alert alert-danger">{error}</div>}

        <form className="filter-bar mb-4" onSubmit={(e) => e.preventDefault()}>
          <div className="filter-bar-wide">
            <label className="block text-xs text-fg-subtle mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="form-input focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
              placeholder="Code, name or remarks"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-subtle mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            className="form-select">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="filter-bar-actions">
            <button type="submit" onClick={fetchCategories} className="px-3 py-1.5 btn-neutral rounded text-sm flex items-center">
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
                <th className="w-32">Code</th>
                <th>Category Name</th>
                <th>Order Formats</th>
                <th className="text-center w-24">Products</th>
                <th className="w-28">Status</th>
                <th className="text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center">Loading categories...</td></tr>
              ) : categories.length === 0 ? (
                <EmptyState colspan={7} icon="bi-tags" title="No categories yet" message="Add the first category — products and jobbers are linked to it." />
              ) : (
                categories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{index + 1 + (filters.page - 1) * 15}</td>
                    <td>
                      <StandardBadge className="font-mono text-fg-muted bg-surface">{category.code}</StandardBadge>
                    </td>
                    <td className="cell-strong">{category.name}</td>
                    <td>
                      {category.formats && category.formats.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {category.formats.map(format => (
                            <StandardBadge key={format.id} className="bg-surface">{format.name}</StandardBadge>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="text-center">{category.products_count || 0}</td>
                    <td>
                      <StatusBadge 
                        status={category.status} 
                        onClick={can('category.edit') ? () => toggleStatus(category) : undefined}
                      />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('category.view') && (
                          <Link href={`/masters/categories/${category.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-fg-muted hover:bg-surface-hover rounded-l-md border-r-0" title="View">
                            <i className="bi bi-eye"></i>
                          </Link>
                        )}
                        {can('category.edit') && (
                          <Link href={`/masters/categories/${category.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('category.delete') && (
                          <button
                            type="button"
                            disabled={category.products_count > 0}
                            onClick={() => deleteCategory(category)}
                            className={`px-2 py-1 text-sm bg-surface border border-line-strong rounded-r-md ${category.products_count > 0 ? 'text-[var(--control-fg-disabled)] border-line cursor-not-allowed' : 'text-[var(--danger)] hover:bg-red-50'}`}
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
