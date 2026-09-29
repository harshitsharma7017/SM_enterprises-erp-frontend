'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Pagination from '../../../components/ui/Pagination';
import { StatusBadge, StandardBadge } from '../../../components/ui/Badge';
import CompanyFilter from '../../../components/company/CompanyFilter';
import CompanyBadge from '../../../components/company/CompanyBadge';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';

const LIMIT = 15;

export default function BrandIndex() {
  const { can } = useAuth(true);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', company_id: '', page: 1 });

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.status) query.set('status', filters.status);
      if (filters.company_id) query.set('company_id', filters.company_id);
      query.set('page', filters.page);
      query.set('limit', LIMIT);

      const res = await apiClient.get(`/masters/brands?${query.toString()}`);
      if (res.success && res.data) {
        const count = res.data.total || 0;
        const offset = (filters.page - 1) * LIMIT;
        setBrands(res.data.data || []);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(count / LIMIT),
          total: count,
          from: count > 0 ? offset + 1 : 0,
          to: Math.min(offset + LIMIT, count),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(fetchBrands);
  }, [fetchBrands]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', company_id: '', page: 1 });
  };

  const toggleStatus = async (brand) => {
    if (!can('brand.edit')) return;
    try {
      await apiClient.patch(`/masters/brands/${brand.id}/toggle-status`);
      fetchBrands();
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const deleteBrand = async (brand) => {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    try {
      await apiClient.delete(`/masters/brands/${brand.id}`);
      fetchBrands();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const Actions = (
    can('brand.create') ? (
      <Link href="/masters/brands/create" className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add Brand
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">Brands</h2>
      </div>

      <Card title="Brand Master" variant="primary" actions={Actions}>
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
              placeholder="Code or name"
            />
          </div>
          <CompanyFilter value={filters.company_id} onChange={handleFilterChange} emptyOptionLabel={null} />
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
                <th>Brand Name</th>
                <th>Company</th>
                <th className="w-28">Status</th>
                <th className="text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading brands...</td></tr>
              ) : brands.length === 0 ? (
                <EmptyState colspan={6} icon="bi-award" title="No brands found" message="Add the brands whose material requirements each company handles." />
              ) : (
                brands.map((brand, index) => (
                  <tr key={brand.id}>
                    <td>{index + 1 + (filters.page - 1) * LIMIT}</td>
                    <td>
                      <StandardBadge className="font-mono text-fg-muted bg-surface">{brand.code}</StandardBadge>
                    </td>
                    <td className="cell-strong">{brand.name}</td>
                    <td><CompanyBadge label={brand.company_label} code={brand.company_code} /></td>
                    <td>
                      <StatusBadge status={brand.status} onClick={can('brand.edit') ? () => toggleStatus(brand) : undefined} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('brand.edit') && (
                          <Link href={`/masters/brands/${brand.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('brand.delete') && (
                          <button
                            type="button"
                            onClick={() => deleteBrand(brand)}
                            className={`px-2 py-1 text-sm bg-surface border border-line-strong text-[var(--danger)] hover:bg-red-50 rounded-r-md ${can('brand.edit') ? '' : 'rounded-l-md'}`}
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
