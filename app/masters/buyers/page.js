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
      if (res.success) {
        setBuyers(res.data?.data || []);
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

  const Actions = (
    <Link href="/masters/buyers/create" className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> Add Buyer
    </Link>
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">Buyers</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800 m-0">Buyer Master</h3>
          {Actions}
        </div>
        
        <div className="p-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

          <div className="flex flex-wrap items-end gap-3 mb-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Search</label>
                <div className="flex">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-300 border-l-0 rounded-r px-3 py-1.5 text-sm text-gray-600">
                    <i className="bi bi-search"></i>
                  </button>
                </div>
              </div>
            </form>
            
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)} 
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {Object.entries(categories).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Buyer Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Company Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Destination</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Port</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Loading buyers...</td></tr>
                ) : buyers.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No buyers found.</td></tr>
                ) : (
                  buyers.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 text-sm">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{b.display_code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900">{b.company_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{b.destination || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{b.port_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <Link href={`/masters/buyers/${b.id}`} className="px-2 py-1 text-sm bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil-square"></i>
                          </Link>
                          <button onClick={() => deleteBuyer(b.id, b.company_name)} className="px-2 py-1 text-sm bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-r-md" title="Delete">
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
