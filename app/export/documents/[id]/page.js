'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, EXPORT_DOC_STATUS_BADGES } from '@/components/ui/Badge';
import ChecklistPanel from '@/components/export-documents/ChecklistPanel';
import GenerateDocumentsPanel from '@/components/export-documents/GenerateDocumentsPanel';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatAmount } from '@/components/sales/shared/format';

const TABS = ['Overview', 'Generate Documents', 'Items Shipped', 'Checklist'];

export default function ExportDocumentShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const fetchDoc = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/export/documents/${id}`);
      if (res.success) setDoc(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load Export Document');
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
        <div className="p-4 text-gray-500">Loading Export Document...</div>
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

  const checklists = doc.checklists || [];
  const pendingChecklistCount = checklists.filter((c) => c.checklist_type_category !== 'generated' && c.status === 'pending').length;
  const generatedPendingCount = checklists.filter((c) => c.checklist_type_category === 'generated' && c.status !== 'uploaded' && c.status !== 'generated').length;
  const itemsTotal = (doc.items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  return (
    <DashboardLayout>
      <PageHeading
        title={doc.doc_num}
        breadcrumbs={[{ label: 'Export Documents', href: '/export/documents' }, { label: doc.doc_num }]}
        actions={(
          <>
            {can('export-document.edit') && doc.status !== 'closed' && (
              <Link href={`/export/documents/${id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/export/documents" className="border border-gray-300 px-3 py-1.5 rounded text-sm text-gray-700 hover:bg-gray-50">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-white border rounded shadow-sm p-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <WorkflowBadge status={doc.status} config={EXPORT_DOC_STATUS_BADGES} />
        <span className="text-gray-500">{checklists.length > 0 ? `${checklists.filter((c) => c.status === 'uploaded' || c.status === 'generated').length} / ${checklists.length}` : '0 / 0'} checklist items complete</span>
        {doc.buyer_name && <span className="text-gray-500">· {doc.buyer_name}</span>}
        {doc.shipment_date && <span className="text-gray-500">· {formatDate(doc.shipment_date)}</span>}
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <div className="border-b flex flex-wrap">
          {TABS.map((tab) => {
            const badge = tab === 'Generate Documents' && generatedPendingCount > 0 ? generatedPendingCount
              : tab === 'Items Shipped' ? (doc.items || []).length
              : tab === 'Checklist' && pendingChecklistCount > 0 ? pendingChecklistCount
              : null;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
                {badge != null && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5">{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {activeTab === 'Overview' && (
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Order Confirmation</dt><dd className="mt-0.5 text-gray-900">{doc.order_confirmation_id ? <Link href={`/sales/order-confirmations/${doc.order_confirmation_id}`} className="text-blue-600 hover:underline">{doc.order_confirmation_num}</Link> : '—'}</dd></div>
              <div><dt className="text-gray-500">Buyer</dt><dd className="mt-0.5 text-gray-900">{doc.buyer_name || '—'}</dd></div>
              <div><dt className="text-gray-500">Currency / Incoterm</dt><dd className="mt-0.5 text-gray-900">{doc.currency_code || '—'} / {doc.incoterm_name || '—'}</dd></div>
              <div><dt className="text-gray-500">Shipment</dt><dd className="mt-0.5 text-gray-900">{[doc.shipment_method_name, doc.shipment_date ? formatDate(doc.shipment_date) : null, doc.port_of_loading_name ? `POL: ${doc.port_of_loading_name}` : null, doc.port_of_discharge_name ? `POD: ${doc.port_of_discharge_name}` : null].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div className="md:col-span-2"><dt className="text-gray-500">Remarks</dt><dd className="mt-0.5 text-gray-900">{doc.remarks || '—'}</dd></div>
              <div><dt className="text-gray-500">Created</dt><dd className="mt-0.5 text-gray-900">{formatDateTime(doc.created_at)}{doc.creator_name ? ` by ${doc.creator_name}` : ''}</dd></div>
              <div><dt className="text-gray-500">Last updated</dt><dd className="mt-0.5 text-gray-900">{formatDateTime(doc.updated_at)}</dd></div>
            </dl>
          )}

          {activeTab === 'Generate Documents' && (
            <GenerateDocumentsPanel documentId={id} checklists={checklists} can={can} />
          )}

          {activeTab === 'Items Shipped' && (
            (doc.items || []).length === 0 ? (
              <p className="text-sm text-gray-500">No items on this Export Document yet.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Design No.</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Colour / Size</th>
                      <th className="px-3 py-2 font-medium">Unit</th>
                      <th className="px-3 py-2 font-medium text-right">Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {doc.items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 text-gray-900">{item.design_no || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{item.product_name || (item.product_id ? `#${item.product_id}` : '—')}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {(item.colours || []).map((c, ci) => (
                            <div key={ci} className="mb-0.5">
                              {c.colour && <span className="font-medium">{c.colour}: </span>}
                              {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                            </div>
                          ))}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{item.unit || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{item.qty}</td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatAmount(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-gray-50">
                      <td colSpan="6" className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatAmount(itemsTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )}

          {activeTab === 'Checklist' && (
            <ChecklistPanel documentId={id} checklists={checklists} can={can} onChanged={fetchDoc} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
