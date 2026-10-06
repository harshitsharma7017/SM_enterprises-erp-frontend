'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import ReportCompanySelect from '@/components/reports/ReportCompanySelect';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Reports — the original ERP's reports/index.blade.php: four dashboard stat
 * cards (counts, not lists) plus report links. Phase 14: the counts run for
 * an explicitly chosen company (or all), and the links list the Excel-ready
 * reports this user may open, plus lot traceability and imports.
 */
export default function ReportsIndexPage() {
  const { can } = useAuth(true);
  const [company, setCompany] = useState('');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!company) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/reports?company_id=${company}`);
      setStats(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    queueMicrotask(fetchStats);
  }, [fetchStats]);

  useEffect(() => {
    apiClient.get('/reports/definitions').then((res) => setReports(res.data || [])).catch(() => setReports([]));
  }, []);

  return (
    <DashboardLayout>
      <PageHeading title="Reports" />

      <div className="mb-4"><ReportCompanySelect value={company} onChange={(v) => { setCompany(v); setStats(null); }} allowUnassigned /></div>
      {error && <div className="alert alert-danger">{error}</div>}

      {!company ? (
        <div className="p-4 text-fg-subtle text-sm">Select a company (or All companies) to see the counts.</div>
      ) : loading ? (
        <div className="p-4 text-fg-subtle">Loading reports...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card title="Purchase Orders">
            <div className="text-2xl font-semibold text-fg">{(stats?.purchase_orders ?? 0).toLocaleString('en-IN')}</div>
          </Card>
          <Card title="Export Documents">
            <div className="text-2xl font-semibold text-fg">{(stats?.export_documents ?? 0).toLocaleString('en-IN')}</div>
          </Card>
          <Card title="Open Shipments">
            <div className="text-2xl font-semibold text-fg">{(stats?.open_shipments ?? 0).toLocaleString('en-IN')}</div>
          </Card>
          <Card title="Closed Shipments">
            <div className="text-2xl font-semibold text-fg">{(stats?.closed_shipments ?? 0).toLocaleString('en-IN')}</div>
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Card title="Report Links">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {can('outstanding.view') && <li><Link href="/reports/outstanding" className="text-link hover:underline">Outstanding</Link></li>}
            {reports.map((r) => <li key={r.key}><Link href={`/reports/${r.key}`} className="text-link hover:underline">{r.title}</Link> <span className="text-fg-subtle text-xs">· Excel export{r.can_export ? '' : ' (needs report.export)'}</span></li>)}
            {can('inward-entry.view') && <li><Link href="/reports/traceability" className="text-link hover:underline">Lot Traceability</Link></li>}
            {can('report.import') && <li><Link href="/reports/import" className="text-link hover:underline">Excel Import</Link> <span className="text-fg-subtle text-xs">· masters, opening stock, draft brand projections</span></li>}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
