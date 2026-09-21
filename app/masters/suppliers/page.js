'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('supplier');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (partyTypeFilter) params.append('party_type', partyTypeFilter);

      const res = await apiClient.get(`/masters/suppliers?${params.toString()}`);
      if (res.data.success) {
        setSuppliers(res.data.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchSuppliers);
  }, [statusFilter, categoryFilter, partyTypeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSuppliers();
  };

  const deleteSupplier = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await apiClient.delete(`/masters/suppliers/${id}`);
        fetchSuppliers();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete supplier');
      }
    }
  };

  return (
    <DashboardLayout>
      <Header title="Suppliers & Jobbers" breadcrumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Suppliers & Jobbers' }]} />
      
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search name, GST..." 
                className="form-input rounded border-gray-300 text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-1.5 text-sm">
                <i className="bi bi-search"></i>
              </button>
            </form>
            <select 
              value={partyTypeFilter} 
              onChange={e => setPartyTypeFilter(e.target.value)} 
              className="form-select rounded border-gray-300 text-sm"
            >
              <option value="">All Party Types</option>
              <option value="supplier">Supplier</option>
              <option value="jobber">Jobber</option>
              <option value="both">Both</option>
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
          <Link href={`/masters/suppliers/create?party_type=${partyTypeFilter || 'supplier'}`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> Add Party
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No parties found.</td></tr>
                ) : (
                  suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{s.display_code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{s.party_type}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{s.supplier_type_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{s.city_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Link href={`/masters/suppliers/${s.id}`} className="text-blue-600 hover:text-blue-900 mx-2" title="Edit">
                          <i className="bi bi-pencil-square"></i>
                        </Link>
                        <button onClick={() => deleteSupplier(s.id, s.name)} className="text-red-600 hover:text-red-900 mx-2" title="Delete">
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
