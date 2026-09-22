'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, CHECKLIST_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';
import { storageUrl, slugifyVariant } from '@/components/export-documents/exportDocumentHelpers';

// Mirrors ExportDocumentChecklist::variantLabel() — null variant_code means
// "Standard"; a set variant_code is matched back to its label by slug.
function variantLabel(row) {
  if (!row.variant_code) return 'Standard';
  const labels = Array.isArray(row.checklist_type_variant_labels) ? row.checklist_type_variant_labels : [];
  return labels.find((label) => slugifyVariant(label) === row.variant_code) || row.variant_code;
}

/**
 * Purchase Bills — mirrors the original ERP's finance/purchase-bills/index.blade.php
 * exactly: Export Document checklist rows filtered to type code
 * 'purchase_bills' only, showing the type's variant label (falls back to
 * "Standard" when no variant has been chosen), status, generated-at, and a
 * file link when one exists. The original has no generate action on this
 * screen — that only lives on the Export Document's own "Generate
 * Documents" tab (Phase 5A) — so this stays read-only, matching source.
 */
export default function PurchaseBillsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 20, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/finance/purchase-bills?page=${page}&limit=20`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 20, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to fetch Purchase Bills');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    queueMicrotask(fetchRows);
  }, [page]);

  const pagination = toPaginationFromCurrentPageMeta(meta);

  return (
    <DashboardLayout>
      <PageHeading title="Purchase Bills" />

      <Card title="Purchase Bills (E-Sanchit)" variant="primary">
        <p className="text-sm text-gray-500 mb-4">
          Generated purchase-bills entries from Export Documents. Use this screen for finance-side tracking and quick file access.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Export Doc</th>
                <th className="px-4 py-2 font-medium">Buyer</th>
                <th className="px-4 py-2 font-medium">Variant</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Generated At</th>
                <th className="px-4 py-2 font-medium">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading Purchase Bills...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={6} icon="bi-receipt" title="No purchase-bill checklist entries yet" message="Raise an Export Document to auto-create its checklist rows." />
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{row.export_document_num || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{row.buyer_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{variantLabel(row)}</td>
                    <td className="px-4 py-2">
                      <WorkflowBadge status={row.status} config={CHECKLIST_STATUS_BADGES} />
                    </td>
                    <td className="px-4 py-2 text-gray-700">{row.generated_at ? formatDateTime(row.generated_at) : '—'}</td>
                    <td className="px-4 py-2">
                      {row.file_path ? (
                        <a href={storageUrl(row.file_path)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </Card>
    </DashboardLayout>
  );
}
