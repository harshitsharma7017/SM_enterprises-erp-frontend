'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);

      const res = await apiClient.get(`/masters/products?${params.toString()}`);
      if (res.data.success) {
        setProducts(res.data.data.data || []);
      }

      // Also grab categories just for the filter if we don't have them
      if (Object.keys(categories).length === 0) {
        const catRes = await apiClient.get('/masters/products/create');
        if (catRes.data.success && catRes.data.data.categories) {
          setCategories(catRes.data.data.categories);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchProducts);
  }, [statusFilter, categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const deleteProduct = async (id, code) => {
    if (confirm(`Are you sure you want to delete product ${code}?`)) {
      try {
        await apiClient.delete(`/masters/products/${id}`);
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  return (
    <DashboardLayout>
      <Header title="Products" breadcrumbs={[{ label: 'Masters', href: '/masters' }, { label: 'Products' }]} />
      
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
          <Link href="/masters/products/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
            <i className="bi bi-plus-lg me-1"></i> Add Product
          </Link>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Group Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No products found.</td></tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{product.item_group_code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.category_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.hsn_code || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.unit_po_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Link href={`/masters/products/${product.id}`} className="text-blue-600 hover:text-blue-900 mx-2" title="Edit">
                          <i className="bi bi-pencil-square"></i>
                        </Link>
                        <button onClick={() => deleteProduct(product.id, product.item_group_code)} className="text-red-600 hover:text-red-900 mx-2" title="Delete">
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
