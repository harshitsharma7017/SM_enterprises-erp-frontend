'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import GenerateDocumentsPanel from '@/components/export-documents/GenerateDocumentsPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatAmount } from '@/components/sales/shared/format';

/**
 * Packing — read-only per-shipment view. Mirrors the original ERP's
 * export/packing/show.blade.php exactly: a smaller field set than the full
 * Export Document (buyer, cartons, weights, marks & numbers, packing-list
 * generation only — no booking/BL/notify-party/freight fields, those live
 * on the Export Document's own Overview/Edit). Carton data is genuinely
 * read-only here in the original too — the only way to change it is the
 * "Edit cartons" link into the Export Document edit screen already built
 * in Phase 5A.
 */
export default function PackingShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoc = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/export/packing/${id}`);
      setDoc(res.data);
    } catch (err) {
      console.error(err);
      setError(err.data?.error || err.message || 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchDoc);
  }, [fetchDoc]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading shipment...</div>
      </DashboardLayout>
    );
  }

  if (error || !doc) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Export Document not found'}</div>
      </DashboardLayout>
    );
  }

  const packingListChecklists = (doc.checklists || []).filter((c) => c.checklist_type_code === 'packing_list');
  const cartons = doc.cartons || [];

  return (
    <DashboardLayout>
      <PageHeading
        title={`Packing — ${doc.doc_num}`}
        breadcrumbs={[{ label: 'Packing', href: '/export/packing' }, { label: doc.doc_num }]}
        actions={(
          <>
            <Link href={`/export/documents/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
              <i className="bi bi-pencil me-1"></i> Edit cartons
            </Link>
            <Link href="/export/packing" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Buyer</dt><dd className="mt-0.5 text-gray-900">{doc.buyer_name || '—'}</dd></div>
          <div><dt className="text-gray-500">Total Cartons</dt><dd className="mt-0.5 text-gray-900">{(doc.total_cartons ?? cartons.length) || '—'} {doc.package_kind || (doc.total_cartons ? 'CARTONS' : '')}</dd></div>
          <div><dt className="text-gray-500">Net / Gross Weight</dt><dd className="mt-0.5 text-gray-900">{doc.net_weight != null ? formatAmount(doc.net_weight) : '—'} / {doc.gross_weight != null ? formatAmount(doc.gross_weight) : '—'} kg</dd></div>
          <div><dt className="text-gray-500">Marks &amp; Nos.</dt><dd className="mt-0.5 text-gray-900">{doc.marks_and_numbers || '—'}</dd></div>
        </dl>
      </div>

      <div className="bg-white border rounded shadow-sm p-4 mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Generate Packing Lists</div>
        {packingListChecklists.length === 0 ? (
          <p className="text-sm text-gray-500">No packing-list checklist rows on this shipment yet.</p>
        ) : (
          <GenerateDocumentsPanel documentId={id} checklists={packingListChecklists} can={can} />
        )}
      </div>

      <div className="bg-white border rounded shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Cartons</div>
        {cartons.length === 0 ? (
          <p className="text-sm text-gray-500">
            No cartons recorded yet. Use <Link href={`/export/documents/${id}/edit`} className="text-blue-600 hover:underline font-medium">Edit cartons</Link> and add carton rows, then generate Packing List formats B and C.
          </p>
        ) : (
          <div className="space-y-3">
            {cartons.map((carton, i) => (
              <div key={carton.id} className="border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <span className="text-sm font-medium text-gray-800">Carton {carton.carton_no || i + 1}</span>
                  <span className="text-xs text-gray-500">
                    Net {carton.net_weight != null ? formatAmount(carton.net_weight) : '—'} · Gross {carton.gross_weight != null ? formatAmount(carton.gross_weight) : '—'} · {carton.dimensions || '—'}
                  </span>
                </div>
                {(carton.lines || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No lines recorded in this carton yet.</p>
                ) : (
                  <table className="min-w-full text-xs text-left">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="pr-4 py-1 font-medium">Description</th>
                        <th className="pr-4 py-1 font-medium text-right">Qty</th>
                        <th className="py-1 font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {carton.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="pr-4 py-1 text-gray-800">{line.description}</td>
                          <td className="pr-4 py-1 text-right text-gray-800">{line.qty}</td>
                          <td className="py-1 text-gray-600">{line.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
