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

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      {!company ? (
        <div className="p-4 text-gray-500">Select a company (or All companies) to see Outstanding.</div>
      ) : loading ? (
        <div className="p-4 text-gray-500">Loading Outstanding...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Card title="Supplier Outstanding (Payables)">
              <div className="text-2xl font-semibold text-gray-900">{formatAmount(data?.supplier_outstanding)}</div>
              <div className="text-xs text-gray-500 mt-1">From Purchase Orders</div>
            </Card>
            <Card title="Buyer Outstanding (Receivables)">
              <div className="text-2xl font-semibold text-gray-900">{formatAmount(data?.buyer_outstanding)}</div>
              <div className="text-xs text-gray-500 mt-1">From Export Documents</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Supplier Side">
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">PO No.</th>
                      <th className="px-3 py-2 font-medium">Supplier</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {purchaseOrders.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-gray-500">No data.</td></tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{po.company_code || 'Unassigned'}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{po.po_num}</td>
                          <td className="px-3 py-2 text-gray-700">{po.supplier_name || '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatAmount(po.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Buyer Side">
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">Company</th>
                      <th className="px-3 py-2 font-medium">Export Doc</th>
                      <th className="px-3 py-2 font-medium">Buyer</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {exportDocuments.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-gray-500">No data.</td></tr>
                    ) : (
                      exportDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{doc.company_code || 'Unassigned'}</td>
                          <td className="px-3 py-2 font-mono text-gray-900">{doc.doc_num}</td>
                          <td className="px-3 py-2 text-gray-700">{doc.buyer_name || '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatAmount(doc.total_amount)}</td>
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
