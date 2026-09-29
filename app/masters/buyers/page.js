'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);

      const res = await apiClient.get(`/masters/buyers?${params.toString()}`);
      if (res.success) {
        setBuyers(res.data?.data || []);
      }

    } catch (err) {
      console.error(err);
      setError('Failed to fetch buyers');
    } finally {
      setLoading(false);
    }
  };

  // Category choices for the filter — the create form's data ([{ id, name }]), loaded once.
  useEffect(() => {
    apiClient.get('/masters/buyers/create')
      .then((res) => setCategories(Array.isArray(res.data?.categories) ? res.data.categories : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    queueMicrotask(fetchBuyers);
  }, [statusFilter, companyFilter, categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBuyers();
  };

  const deleteBuyer = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await apiClient.delete(`/masters/buyers/${id}`);
        fetchBuyers();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete buyer');
      }
    }
  };

  const Actions = (
    <Link href="/masters/buyers/create" className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> Add Buyer
    </Link>
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">Buyers</h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-surface-raised/50">
          <h3 className="text-lg font-semibold text-fg m-0">Buyer Master</h3>
          {Actions}
        </div>
        
        <div className="p-6">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="filter-bar mb-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-fg-subtle mb-1">Search</label>
                <div className="flex">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="form-input rounded-l focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="bg-surface-raised hover:bg-gray-200 border border-line-strong border-l-0 rounded-r px-3 py-1.5 text-sm text-fg-muted">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </div>
            </form>
            
            <div className="w-48">
              <label className="block text-xs text-fg-subtle mb-1">Category</label>
              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
              className="form-select">
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <CompanyFilter
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              emptyOptionLabel="Shared only"
              className="w-56"
            />

            <div className="w-48">
              <label className="block text-xs text-fg-subtle mb-1">Status</label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
              className="form-select">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Buyer Code</th>
                  <th>Our Company</th>
                  <th>Company Name</th>
                  <th>Destination</th>
                  <th>Port</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center">Loading buyers...</td></tr>
                ) : buyers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center">No buyers found.</td></tr>
                ) : (
                  buyers.map(b => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap cell-strong">{b.display_code}</td>
                      <td className="whitespace-nowrap"><CompanyBadge label={b.company_label} code={b.company_code} emptyLabel="Shared" /></td>
                      <td className="whitespace-nowrap cell-strong">{b.company_name}</td>
                      <td className="whitespace-nowrap">{b.destination || '-'}</td>
                      <td className="whitespace-nowrap">{b.port_name || '-'}</td>
                      <td className="whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <Link href={`/masters/buyers/${b.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil-square"></i>
                          </Link>
                          <button onClick={() => deleteBuyer(b.id, b.company_name)} className="px-2 py-1 text-sm bg-surface border border-line-strong text-[var(--danger)] hover:bg-red-50 rounded-r-md" title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
