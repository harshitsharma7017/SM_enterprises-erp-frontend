'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import { apiClient } from '@/lib/api-client';
import CompanyFilter from '@/components/company/CompanyFilter';
import CompanyBadge from '@/components/company/CompanyBadge';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState({});
  const [materialTypeFilter, setMaterialTypeFilter] = useState('');
  const [materialTypes, setMaterialTypes] = useState([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('company_id', companyFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (materialTypeFilter) params.append('material_type_id', materialTypeFilter);

      const res = await apiClient.get(`/masters/products?${params.toString()}`);
      if (res.success) {
        setProducts(res.data?.data || []);
      }

      // Also grab categories just for the filter if we don't have them
      if (Object.keys(categories).length === 0) {
        const catRes = await apiClient.get('/masters/products/create');
        if (catRes.success && catRes.data?.categories) {
          setCategories(catRes.data.categories);
          setMaterialTypes(catRes.data.materialTypes || []);
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
  }, [statusFilter, companyFilter, categoryFilter, materialTypeFilter]);

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

  const Actions = (
    <Link href="/masters/products/create" className="btn btn-sm btn-primary bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center no-underline">
      <i className="bi bi-plus-lg mr-1"></i> Add Product
    </Link>
  );

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">Products</h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-surface-raised/50">
          <h3 className="text-lg font-semibold text-fg m-0">Product Master</h3>
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
                {/* The API sends [{ id, name }]; an { id: name } map is still accepted (same as ProductForm). */}
                {(Array.isArray(categories) ? categories : Object.entries(categories).map(([id, name]) => ({ id, name }))).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-48">
              <label className="block text-xs text-fg-subtle mb-1">Material Type</label>
              <select
                value={materialTypeFilter}
                onChange={e => setMaterialTypeFilter(e.target.value)}
              className="form-select">
                <option value="">All Material Types</option>
                {materialTypes
                  .filter(m => !companyFilter || companyFilter === 'unassigned' || String(m.company_id) === String(companyFilter))
                  .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <CompanyFilter
              value={companyFilter}
              onChange={e => { setCompanyFilter(e.target.value); setMaterialTypeFilter(''); }}
              emptyOptionLabel="Unassigned"
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
                  <th>Item Group Code</th>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Material Type</th>
                  <th>UOM</th>
                  <th>Product Name</th>
                  <th>HSN Code</th>
                  <th>Unit</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="text-center">Loading products...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="10" className="text-center">No products found.</td></tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap cell-strong">{product.item_group_code}</td>
                      <td className="whitespace-nowrap"><CompanyBadge label={product.company_label} code={product.company_code} emptyLabel="Unassigned" /></td>
                      <td className="whitespace-nowrap">{product.category_name}</td>
                      <td className="whitespace-nowrap">{product.material_type_name || '-'}</td>
                      <td className="whitespace-nowrap font-mono">{product.uom_code || '-'}</td>
                      <td className="whitespace-nowrap cell-strong">{product.name}</td>
                      <td className="whitespace-nowrap">{product.hsn_code || '-'}</td>
                      <td className="whitespace-nowrap">{product.unit_po_name || '-'}</td>
                      <td className="whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <Link href={`/masters/products/${product.id}`} className="px-2 py-1 text-sm bg-surface border border-line-strong text-link hover:bg-surface-hover rounded-l-md border-r-0" title="Edit">
                            <i className="bi bi-pencil-square"></i>
                          </Link>
                          <button onClick={() => deleteProduct(product.id, product.item_group_code)} className="px-2 py-1 text-sm bg-surface border border-line-strong text-[var(--danger)] hover:bg-red-50 rounded-r-md" title="Delete">
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
