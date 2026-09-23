'use client';

import { useState, useEffect } from 'react';
import CompanyFilter from '@/components/company/CompanyFilter';
import { STOCK_MOVEMENT_LABELS } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';

/**
 * Filters for the stock, ledger and production lists. Filtering happens on
 * the server. Option lists that need a master permission (products, material
 * types, suppliers) are only shown to users holding it.
 * `fields` picks which filters to show; `statuses` ([[value, label], ...])
 * adds a status filter.
 */
export default function InventoryFilters({ filters, setFilter, onReset, fields, searchPlaceholder, statuses = null }) {
  const { can } = useAuth(true);
  const [products, setProducts] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const show = (name) => fields.includes(name);

  useEffect(() => {
    if (!fields.includes('product_id') || !can('product.view')) return;
    apiClient.get('/masters/products?limit=1000').then((res) => setProducts(res.data?.data || [])).catch(() => setProducts([]));
  }, [can, fields]);

  useEffect(() => {
    if (!fields.includes('material_type_id') || !can('material-type.view')) return;
    apiClient.get('/masters/material-types?limit=500').then((res) => setMaterialTypes(res.data?.data || [])).catch(() => setMaterialTypes([]));
  }, [can, fields]);

  useEffect(() => {
    if (!fields.includes('supplier_id') || !can('supplier.view')) return;
    apiClient.get('/masters/suppliers?party_type=supplier&limit=1000').then((res) => setSuppliers(res.data?.data || [])).catch(() => setSuppliers([]));
  }, [can, fields]);

  useEffect(() => {
    if (!fields.includes('location_id')) return;
    apiClient.get('/inventory/locations?limit=500').then((res) => setLocations(res.data || [])).catch(() => setLocations([]));
  }, [fields]);

  // Only options of the selected company are offered.
  const inCompany = (row) => !filters.company_id || String(row.company_id) === String(filters.company_id) || row.company_id === null;

  return (
    <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs text-gray-500 mb-1">Search</label>
        <input type="text" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder={searchPlaceholder} className={INPUT} />
      </div>
      <CompanyFilter value={filters.company_id} onChange={(e) => setFilter('company_id', e.target.value)} emptyOptionLabel={null} className="w-44" />
      {show('product_id') && can('product.view') && (
        <div className="w-48">
          <label className="block text-xs text-gray-500 mb-1">Product</label>
          <select value={filters.product_id} onChange={(e) => setFilter('product_id', e.target.value)} className={INPUT}>
            <option value="">All Products</option>
            {products.filter(inCompany).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      {show('material_type_id') && can('material-type.view') && (
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">Material Type</label>
          <select value={filters.material_type_id} onChange={(e) => setFilter('material_type_id', e.target.value)} className={INPUT}>
            <option value="">All Types</option>
            {materialTypes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      {show('supplier_id') && can('supplier.view') && (
        <div className="w-44">
          <label className="block text-xs text-gray-500 mb-1">Supplier</label>
          <select value={filters.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)} className={INPUT}>
            <option value="">All Suppliers</option>
            {suppliers.filter(inCompany).map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
        </div>
      )}
      {show('location_id') && (
        <div className="w-40">
          <label className="block text-xs text-gray-500 mb-1">Location</label>
          <select value={filters.location_id} onChange={(e) => setFilter('location_id', e.target.value)} className={INPUT}>
            <option value="">All Locations</option>
            {locations.filter(inCompany).map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
          </select>
        </div>
      )}
      {show('lot') && (
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">Lot No.</label>
          <input type="text" value={filters.lot} onChange={(e) => setFilter('lot', e.target.value)} className={INPUT} />
        </div>
      )}
      {show('movement_type') && (
        <div className="w-44">
          <label className="block text-xs text-gray-500 mb-1">Movement Type</label>
          <select value={filters.movement_type} onChange={(e) => setFilter('movement_type', e.target.value)} className={INPUT}>
            <option value="">All</option>
            {Object.entries(STOCK_MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      )}
      {show('source') && (
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Source (QC / GRN / PO)</label>
          <input type="text" value={filters.source} onChange={(e) => setFilter('source', e.target.value)} className={INPUT} />
        </div>
      )}
      {statuses && (
        <div className="w-36">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
            <option value="">All</option>
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      )}
      {show('stock_status') && (
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">Stock</label>
          <select value={filters.stock_status} onChange={(e) => setFilter('stock_status', e.target.value)} className={INPUT}>
            <option value="">Available</option>
            <option value="nil">Nil</option>
            <option value="all">All</option>
          </select>
        </div>
      )}
      {show('dates') && (
        <>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">{fields.includes('received_dates') ? 'Received from' : 'From'}</label>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
          </div>
        </>
      )}
      <button type="button" onClick={onReset} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">
        Reset
      </button>
    </form>
  );
}
