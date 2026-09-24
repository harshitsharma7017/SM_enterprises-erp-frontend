'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/components/sales/shared/format';
import { toPaginationFromPageLimit } from '@/components/sales/shared/pagination';

const INPUT = 'w-full px-3 py-1.5 border border-gray-300 rounded text-sm';
const LABELS = { grn: 'GRN', production: 'Production', in_process: 'In process', partially_accepted: 'Partially accepted', not_found: 'Not found', material_issue: 'Material issue', order_confirmation: 'Order confirmation', material_requirement: 'Material requirement', material_plan: 'Material plan', partially_fulfilled: 'Partially fulfilled', available: 'In stock', nil: 'Nil', 1: 'Duplicates', 0: 'First scans', po_price: 'PO price', po_line: 'PO line', grn_line: 'GRN line', qc: 'QC', supplier_return: 'Supplier return', debit_note: 'Debit note' };
const label = (v) => LABELS[v] || (typeof v === 'string' ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : v);

/** Quantities keep every recorded decimal (up to 6) — nothing is rounded for display. */
const cell = (column, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (column.type === 'number') return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 6 });
  if (column.type === 'date') return formatDate(value);
  if (column.type === 'datetime') return formatDateTime(String(value).replace(' ', 'T'));
  return typeof value === 'string' && /^[a-z_]+$/.test(value) ? label(value) : value;
};

/**
 * One report page, driven by the server's report definition (columns and
 * the filters that apply to this report). Nothing loads until a company (or
 * "All companies") is chosen; the Excel export sends exactly the filters
 * shown, and the server applies the same query to both.
 */
export default function ReportView({ reportKey }) {
  const [definition, setDefinition] = useState(null);
  const [defError, setDefError] = useState(null);
  const [company, setCompany] = useState('');
  const [filters, setFilters] = useState({});
  const [options, setOptions] = useState({});
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState({ total: 0, page: 1, limit: 25 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    apiClient.get('/reports/definitions')
      .then((res) => {
        const def = (res.data || []).find((d) => d.key === reportKey);
        if (def) setDefinition(def);
        else setDefError('You do not have access to this report.');
      })
      .catch((err) => setDefError(err.message || 'Failed to load the report'));
  }, [reportKey]);

  // Filter choices (suppliers, products, locations …) for the chosen company.
  useEffect(() => {
    if (!company || !definition || !definition.filters.some((f) => f.options)) return;
    apiClient.get(`/reports/data/${reportKey}/options?company_id=${company}`).then((res) => setOptions(res.data || {})).catch(() => setOptions({}));
  }, [company, definition, reportKey]);

  const query = useCallback((extra = {}) => {
    const params = new URLSearchParams({ company_id: company });
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) params.append(k, v); });
    return params.toString();
  }, [company, filters]);

  const fetchRows = useCallback(async () => {
    if (!company || !definition) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/reports/data/${reportKey}?${query({ page })}`);
      setRows(res.data || []);
      setPageInfo({ total: res.meta.total, page: res.meta.page, limit: res.meta.limit });
    } catch (err) {
      setRows([]);
      setError(err.message || 'Failed to load the report');
    } finally {
      setLoading(false);
    }
  }, [company, definition, reportKey, query, page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [fetchRows]);

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };
  const changeCompany = (value) => {
    setCompany(value);
    setOptions({});
    // Choices such as supplier or location belong to a company; clear them when it changes.
    setFilters((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !definition?.filters.some((f) => f.name === k && f.options))));
    setPage(1);
  };

  const exportExcel = async () => {
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      await apiClient.download(`/reports/data/${reportKey}/export?${query()}`, `${reportKey}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setNotice(`Exported ${pageInfo.total} row(s).`);
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (defError) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{defError}</div></DashboardLayout>;
  if (!definition) return <DashboardLayout><div className="p-4 text-gray-500">Loading report...</div></DashboardLayout>;

  const Actions = definition.can_export ? (
    <button type="button" onClick={exportExcel} disabled={!company || exporting} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm inline-flex items-center disabled:opacity-60">
      <i className="bi bi-file-earmark-excel mr-1"></i> {exporting ? 'Exporting…' : 'Export Excel'}
    </button>
  ) : null;
  const cols = definition.columns;

  return (
    <DashboardLayout>
      <PageHeading title={definition.title} breadcrumbs={[{ label: 'Reports', href: '/reports' }, { label: definition.title }]} />
      <Card title={company ? `${pageInfo.total.toLocaleString('en-IN')} row(s)` : 'Select a company to run the report'} variant="primary" actions={Actions}>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        {notice && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
        <form className="flex flex-wrap items-end gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
          <ReportCompanySelect value={company} onChange={changeCompany} allowUnassigned={['purchase-orders', 'grns', 'orders', 'supplier-history'].includes(reportKey)} />
          {definition.search && (
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input type="text" value={filters.search || ''} onChange={(e) => setFilter('search', e.target.value)} className={INPUT} />
            </div>
          )}
          {definition.filters.map((f) => (
            <div key={f.name} className="w-44">
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              {f.kind === 'like' ? (
                <input type="text" value={filters[f.name] || ''} onChange={(e) => setFilter(f.name, e.target.value)} className={INPUT} />
              ) : (
                <select value={filters[f.name] || ''} onChange={(e) => setFilter(f.name, e.target.value)} disabled={f.options && !company} className={`${INPUT} disabled:bg-gray-50`}>
                  <option value="">All</option>
                  {f.kind === 'enum'
                    ? f.values.map((v) => <option key={v} value={v}>{label(v)}</option>)
                    : (options[f.options] || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              )}
            </div>
          ))}
          {definition.date && (
            <>
              <div className="w-36">
                <label className="block text-xs text-gray-500 mb-1">{definition.date.label} from</label>
                <input type="date" value={filters.date_from || ''} onChange={(e) => setFilter('date_from', e.target.value)} className={INPUT} />
              </div>
              <div className="w-36">
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={filters.date_to || ''} onChange={(e) => setFilter('date_to', e.target.value)} className={INPUT} />
              </div>
            </>
          )}
          <button type="button" onClick={() => { setFilters({}); setPage(1); }} className="px-3 py-1.5 border border-gray-400 text-gray-600 hover:bg-gray-50 rounded text-sm">Reset</button>
        </form>

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>{cols.map((c) => <th key={c.key} className={`px-3 py-2 font-medium whitespace-nowrap ${c.type === 'number' ? 'text-right' : ''}`}>{c.label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {!company ? (
                <tr><td colSpan={cols.length} className="text-center py-8 text-gray-500">Choose a company (or All companies) above.</td></tr>
              ) : loading ? (
                <tr><td colSpan={cols.length} className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={cols.length} icon="bi-table" title="No rows" message="Nothing matches these filters." />
              ) : rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {cols.map((c) => <td key={c.key} className={`px-3 py-1.5 ${c.type === 'number' ? 'text-right whitespace-nowrap' : ''} ${c.key === 'company_code' ? 'font-mono text-xs' : ''}`}>{cell(c, row[c.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {company && <Pagination pagination={toPaginationFromPageLimit(pageInfo)} onPageChange={setPage} />}
      </Card>
    </DashboardLayout>
  );
}
