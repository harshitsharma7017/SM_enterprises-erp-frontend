'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';

/**
 * Reports — mirrors the original ERP's reports/index.blade.php exactly:
 * four dashboard stat cards (counts, not lists) plus a "Report Links" card
 * pointing at Outstanding. No filters, no pagination, no exports — the
 * original has none either.
 */
export default function ReportsIndexPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/reports');
      setStats(res.data || null);
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchStats);
  }, [fetchStats]);

  return (
    <DashboardLayout>
      <PageHeading title="Reports" />

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="p-4 text-gray-500">Loading reports...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card title="Purchase Orders">
              <div className="text-2xl font-semibold text-gray-900">{(stats?.purchase_orders ?? 0).toLocaleString('en-IN')}</div>
            </Card>
            <Card title="Export Documents">
              <div className="text-2xl font-semibold text-gray-900">{(stats?.export_documents ?? 0).toLocaleString('en-IN')}</div>
            </Card>
            <Card title="Open Shipments">
              <div className="text-2xl font-semibold text-gray-900">{(stats?.open_shipments ?? 0).toLocaleString('en-IN')}</div>
            </Card>
            <Card title="Closed Shipments">
              <div className="text-2xl font-semibold text-gray-900">{(stats?.closed_shipments ?? 0).toLocaleString('en-IN')}</div>
            </Card>
          </div>

          <div className="mt-4">
            <Card title="Report Links">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><Link href="/reports/outstanding" className="text-blue-600 hover:underline">Outstanding</Link></li>
                <li className="text-gray-500 list-none -ml-5">More report exports can be added on this page based on demo feedback.</li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
