'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import { apiClient } from '@/lib/api-client';
import { formatAmount } from '@/components/sales/shared/format';

/**
 * Outstanding — mirrors the original ERP's reports/outstanding/index.blade.php
 * exactly: two headline totals (Supplier/Buyer Outstanding) and two
 * unpaginated tables (ALL Purchase Orders / ALL Export Documents, not just
 * open ones — the original's ->get() has no status filter). No date
 * filters or pagination exist on this screen in the original.
 * Phase 14: it runs for an explicitly chosen company (or all), never a silent mix.
 */
export default function OutstandingReportPage() {
  const [company, setCompany] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!company) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/reports/outstanding?company_id=${company}`);
      setData(res.data || null);
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to load Outstanding');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  const purchaseOrders = data?.purchase_orders || [];
  const exportDocuments = data?.export_documents || [];

  return (
    <DashboardLayout>
      <PageHeading title="Outstanding" />

      <div className="mb-4"><ReportCompanySelect value={company} onChange={(v) => { setCompany(v); setData(null); }} allowUnassigned /></div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!company ? (
        <div className="p-4 text-fg-subtle">Select a company (or All companies) to see Outstanding.</div>
      ) : loading ? (
        <div className="p-4 text-fg-subtle">Loading Outstanding...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Card title="Supplier Outstanding (Payables)">
              <div className="text-2xl font-semibold text-fg">{formatAmount(data?.supplier_outstanding)}</div>
              <div className="text-xs text-fg-subtle mt-1">From Purchase Orders</div>
            </Card>
            <Card title="Buyer Outstanding (Receivables)">
              <div className="text-2xl font-semibold text-fg">{formatAmount(data?.buyer_outstanding)}</div>
              <div className="text-xs text-fg-subtle mt-1">From Export Documents</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Supplier Side">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>PO No.</th>
                      <th>Supplier</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr><td colSpan="4" className="text-center">No data.</td></tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.id}>
                          <td className="font-mono">{po.company_code || 'Unassigned'}</td>
                          <td className="font-mono cell-strong">{po.po_num}</td>
                          <td className="text-fg-muted">{po.supplier_name || '—'}</td>
                          <td className="text-right cell-strong">{formatAmount(po.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Buyer Side">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Export Doc</th>
                      <th>Buyer</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportDocuments.length === 0 ? (
                      <tr><td colSpan="4" className="text-center">No data.</td></tr>
                    ) : (
                      exportDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-mono">{doc.company_code || 'Unassigned'}</td>
                          <td className="font-mono cell-strong">{doc.doc_num}</td>
                          <td className="text-fg-muted">{doc.buyer_name || '—'}</td>
                          <td className="text-right cell-strong">{formatAmount(doc.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
