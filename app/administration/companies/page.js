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
import { resetCompaniesCache } from '../../../hooks/useCompanies';

const LIMIT = 15;

export default function CompanyIndex() {
  const { can } = useAuth(true);
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.set('search', filters.search);
      if (filters.status) query.set('status', filters.status);
      const offset = (filters.page - 1) * LIMIT;
      query.set('limit', LIMIT);
      query.set('offset', offset);

      const res = await apiClient.get(`/administration/companies?${query.toString()}`);
      if (res.success && res.data) {
        const rows = res.data.data || [];
        const count = res.data.total || 0;
        setCompanies(rows);
        setPagination({
          current_page: filters.page,
          last_page: Math.ceil(count / LIMIT),
          total: count,
          from: count > 0 ? offset + 1 : 0,
          to: Math.min(offset + LIMIT, count),
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    queueMicrotask(fetchCompanies);
  }, [fetchCompanies]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const resetFilters = (e) => {
    e.preventDefault();
    setFilters({ search: '', status: '', page: 1 });
  };

  const toggleStatus = async (company) => {
    if (!can('company.edit')) return;
    const action = company.is_active ? 'Deactivate' : 'Activate';
    if (company.is_active && !confirm(`${action} "${company.name}"? Existing records keep this company, but it can no longer be selected for new records.`)) return;
    try {
      await apiClient.patch(`/administration/companies/${company.id}/toggle-status`);
      resetCompaniesCache();
      fetchCompanies();
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  const deleteCompany = async (company) => {
    if (!confirm(`Delete company "${company.name}"?`)) return;
    try {
      await apiClient.delete(`/administration/companies/${company.id}`);
      resetCompaniesCache();
      fetchCompanies();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const Actions = (
    can('company.create') ? (
      <Link href="/administration/companies/create" className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
        <i className="bi bi-plus-lg mr-1"></i> Add Company
      </Link>
    ) : null
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">Companies</h2>
      </div>

      <Card title="Company Master" variant="primary" actions={Actions}>
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
              placeholder="Code, name or GSTIN"
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
                <th className="w-24">Code</th>
                <th>Company Name</th>
                <th>Short Name</th>
                <th>GSTIN</th>
                <th>Contact</th>
                <th className="w-28">Status</th>
                <th className="text-right w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="text-center">Loading companies...</td></tr>
              ) : companies.length === 0 ? (
                <EmptyState colspan={8} icon="bi-buildings" title="No companies found" message="Adjust the filters or add a company." />
              ) : (
                companies.map((company, index) => (
                  <tr key={company.id}>
                    <td>{index + 1 + (filters.page - 1) * LIMIT}</td>
                    <td>
                      <StandardBadge className="font-mono text-fg-muted bg-surface">{company.code}</StandardBadge>
                    </td>
                    <td className="cell-strong">{company.name}</td>
                    <td className="text-fg-muted">{company.short_name || '—'}</td>
                    <td className="font-mono text-fg-muted">{company.gstin || '—'}</td>
                    <td className="text-fg-muted">
                      {company.phone || company.email ? (
                        <div className="flex flex-col">
                          {company.phone && <span>{company.phone}</span>}
                          {company.email && <span className="text-xs text-fg-subtle">{company.email}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <StatusBadge
                        status={company.is_active ? 'active' : 'inactive'}
                        onClick={can('company.edit') ? () => toggleStatus(company) : undefined}
                      />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        {can('company.edit') && (
                          <Link href={`/administration/companies/${company.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil"></i>
                          </Link>
                        )}
                        {can('company.delete') && (
                          <button
                            type="button"
                            onClick={() => deleteCompany(company)}
                            className={`px-2 py-1 text-sm bg-surface border border-line-strong text-[var(--danger)] hover:bg-red-50 rounded-r-md ${can('company.edit') ? '' : 'rounded-l-md'}`}
                            title="Delete (only possible while no record uses this company)"
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
