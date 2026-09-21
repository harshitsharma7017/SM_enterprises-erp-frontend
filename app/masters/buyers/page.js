'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState({});

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);

      const res = await apiClient.get(`/masters/buyers?${params.toString()}`);
      if (res.data.success) {
        setBuyers(res.data.data.data || []);
      }

      // Also grab categories just for the filter if we don't have them
      if (Object.keys(categories).length === 0) {
        const catRes = await apiClient.get('/masters/buyers/create');
        if (catRes.data.success && catRes.data.data.categories) {
          setCategories(catRes.data.data.categories);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch buyers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchBuyers);
  }, [statusFilter, categoryFilter]);

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

  return (
    <DashboardLayout>
      <Header title="Buyers" breadcrumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Buyers' }]} />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search..." 
                className="form-input rounded border-gray-300 text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <i className="bi bi-search"></i>
              </button>
            </form>
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)} 
              className="form-select rounded border-gray-300 text-sm"
            >
              <option value="">All Categories</option>
              {Object.entries(categories).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="form-select rounded border-gray-300 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <Link href="/masters/buyers/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> Add Buyer
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : buyers.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No buyers found.</td></tr>
                ) : (
                  buyers.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{b.display_code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{b.company_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{b.destination || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{b.port_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Link href={`/masters/buyers/${b.id}`} className="text-blue-600 hover:text-blue-900 mx-2" title="Edit">
                          <i className="bi bi-pencil-square"></i>
                        </Link>
                        <button onClick={() => deleteBuyer(b.id, b.company_name)} className="text-red-600 hover:text-red-900 mx-2" title="Delete">
                          <i className="bi bi-trash"></i>
                        </button>
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
