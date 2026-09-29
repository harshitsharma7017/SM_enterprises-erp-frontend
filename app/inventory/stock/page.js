'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, STOCK_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import InventoryFilters from '@/components/inventory/InventoryFilters';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const EMPTY_FILTERS = { search: '', company_id: '', product_id: '', material_type_id: '', supplier_id: '', location_id: '', lot: '', lot_source: '', stock_status: '', date_from: '', date_to: '' };
const LOT_FIELDS = ['product_id', 'material_type_id', 'supplier_id', 'location_id', 'lot', 'lot_source', 'stock_status', 'dates', 'received_dates'];
const PRODUCT_FIELDS = ['product_id', 'material_type_id', 'location_id'];
const TAB = 'px-3 py-1.5 text-sm font-medium rounded-md';

/** Usable stock: per lot and location (the stock identity), or totalled per product and UOM. */
export default function StockPage() {
  const { can } = useAuth(true);
  const [view, setView] = useState('lot');
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState([]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page);
      const res = await apiClient.get(`/inventory/stock${view === 'product' ? '/products' : ''}?${params.toString()}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setError(err.message || 'Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  }, [filters, page, view]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  // Completed inspections whose accepted quantity has not been posted to stock yet.
  useEffect(() => {
    if (!can('stock.post')) return;
    const company = filters.company_id ? `?company_id=${filters.company_id}` : '';
    apiClient.get(`/inventory/stock/postable${company}`)
      .then((res) => setPending(res.data?.inspections || []))
      .catch(() => setPending([]));
  }, [can, filters.company_id]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };
  const switchView = (next) => {
    setView(next);
    setPage(1);
    setRows([]);
  };

  return (
    <DashboardLayout>
      <PageHeading title="Stock" breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock' }]} />

      {pending.length > 0 && (
        <Card title={`Awaiting stock posting (${pending.length})`} variant="info">
          <p className="text-xs text-fg-subtle mt-0 mb-2">Completed inspections whose accepted quantity is not in stock yet. Open the inspection and use Post to Stock.</p>
          <ul className="list-none p-0 m-0 space-y-1 text-sm">
            {pending.slice(0, 10).map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2">
                <CompanyBadge label={q.company_label} code={q.company_code} />
                <Link href={`/quality-control/${q.id}`} className="font-mono text-link hover:underline">{q.qc_no}</Link>
                <span className="text-fg-muted">{q.lot_no} · {q.product_name} · accepted {formatQuantity(q.accepted_quantity, q.uom_decimal_places)} {q.unit}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Usable stock (QC-accepted material and posted production output)" variant="primary" actions={(
        <div className="flex gap-1">
          <button type="button" onClick={() => switchView('lot')} className={`${TAB} ${view === 'lot' ? 'bg-accent text-white' : 'border border-line-strong text-fg-muted'}`}>By lot</button>
          <button type="button" onClick={() => switchView('product')} className={`${TAB} ${view === 'product' ? 'bg-accent text-white' : 'border border-line-strong text-fg-muted'}`}>By product</button>
        </div>
      )}>
        {error && <div className="alert alert-danger">{error}</div>}

        <InventoryFilters
          filters={filters}
          setFilter={setFilter}
          onReset={() => { setFilters(EMPTY_FILTERS); setPage(1); }}
          fields={view === 'product' ? PRODUCT_FIELDS : LOT_FIELDS}
          searchPlaceholder={view === 'product' ? 'Product name or code' : 'Lot, mill lot, material, supplier, GRN, PO or location'}
        />

        <div className="table-wrap">
          {view === 'lot' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Company</th>
                  <th>Material</th>
                  <th className="text-right">Width</th>
                  <th>Location</th>
                  <th>Supplier</th>
                  <th>Source (GRN / PO or production)</th>
                  <th>Received</th>
                  <th className="text-right">Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="text-center">Loading stock...</td></tr>
                ) : rows.length === 0 ? (
                  <EmptyState colspan={10} icon="bi-boxes" title="No stock" message="Stock is created when a completed inspection's accepted quantity is posted." />
                ) : rows.map((b) => (
                  <tr key={`${b.lot_id}-${b.location_id}`}>
                    <td><Link href={`/inventory/stock/${b.lot_id}`} className="font-mono font-semibold text-fg hover:text-link">{b.lot_no}</Link></td>
                    <td><CompanyBadge label={b.company_label} code={b.company_code} /></td>
                    <td>
                      <div className="text-fg">{b.product_name}</div>
                      <div className="text-xs text-fg-subtle">{b.material_type_name || '—'}</div>
                    </td>
                    <td className="text-right">{b.width_inch === null ? '—' : `${formatQuantity(b.width_inch, 3)}"`}</td>
                    <td className="text-fg-muted"><span className="font-mono">{b.location_code}</span> <span className="text-xs text-fg-subtle">{b.location_name}</span></td>
                    <td className="text-fg-muted">{b.supplier_name || '—'}</td>
                    <td className="font-mono text-fg-muted">
                      {b.lot_source_type === 'opening' ? <span className="font-sans">Opening stock</span> : b.lot_source_type === 'production' ? <span className="font-sans">Produced · <span className="font-mono">{b.lot_processing_no}</span></span> : <>{b.inward_no}<div>{b.po_num}</div></>}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(b.received_date)}</td>
                    <td className="text-right font-semibold whitespace-nowrap">{formatQuantity(b.quantity, b.uom_decimal_places)} <span className="text-xs font-normal text-fg-subtle">{b.unit}</span></td>
                    <td><WorkflowBadge status={b.stock_status} config={STOCK_STATUS_BADGES} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Company</th>
                  <th>Material Type</th>
                  <th className="text-center">Lots</th>
                  <th className="text-center">Locations</th>
                  <th className="text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center">Loading stock...</td></tr>
                ) : rows.length === 0 ? (
                  <EmptyState colspan={6} icon="bi-boxes" title="No stock" message="No product has usable stock for these filters." />
                ) : rows.map((p) => (
                  <tr key={`${p.company_id}-${p.product_id}-${p.uom_id}-${p.unit}`}>
                    <td>
                      <button type="button" onClick={() => { setFilters({ ...EMPTY_FILTERS, company_id: String(p.company_id), product_id: String(p.product_id) }); switchView('lot'); }} className="text-left text-fg hover:text-link">
                        {p.product_name} <span className="text-xs text-fg-subtle">({p.item_group_code})</span>
                      </button>
                    </td>
                    <td><CompanyBadge label={p.company_label} code={p.company_code} /></td>
                    <td className="text-fg-muted">{p.material_type_name || '—'}</td>
                    <td className="text-center">{p.lots_count}</td>
                    <td className="text-center">{p.locations_count}</td>
                    <td className="text-right font-semibold whitespace-nowrap">{formatQuantity(p.quantity, p.uom_decimal_places)} <span className="text-xs font-normal text-fg-subtle">{p.unit}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
