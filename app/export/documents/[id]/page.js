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
        <div className="p-4 text-fg-subtle">Loading Export Document...</div>
      </DashboardLayout>
    );
  }

  if (error || !doc) {
    return (
      <DashboardLayout>
        <div className="alert alert-danger">{error || 'Export Document not found'}</div>
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
              <Link href={`/export/documents/${id}/edit`} className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded text-sm font-medium">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            <Link href="/export/documents" className="border border-line-strong px-3 py-1.5 rounded text-sm text-fg-muted hover:bg-surface-hover">
              Back
            </Link>
          </>
        )}
      />

      <div className="bg-surface border rounded shadow-sm p-4 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <WorkflowBadge status={doc.status} config={EXPORT_DOC_STATUS_BADGES} />
        <span className="text-fg-subtle">{checklists.length > 0 ? `${checklists.filter((c) => c.status === 'uploaded' || c.status === 'generated').length} / ${checklists.length}` : '0 / 0'} checklist items complete</span>
        {doc.buyer_name && <span className="text-fg-subtle">· {doc.buyer_name}</span>}
        {doc.shipment_date && <span className="text-fg-subtle">· {formatDate(doc.shipment_date)}</span>}
      </div>

      <div className="bg-surface border rounded shadow-sm overflow-hidden">
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
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-blue-600 text-link' : 'border-transparent text-fg-subtle hover:text-fg-muted'}`}
              >
                {tab}
                {badge != null && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-surface-raised text-fg-muted text-xs px-1.5 py-0.5">{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4">
          {activeTab === 'Overview' && (
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-fg-subtle">Order Confirmation</dt><dd className="mt-0.5 text-fg">{doc.order_confirmation_id ? <Link href={`/sales/order-confirmations/${doc.order_confirmation_id}`} className="text-link hover:underline">{doc.order_confirmation_num}</Link> : '—'}</dd></div>
              <div><dt className="text-fg-subtle">Buyer</dt><dd className="mt-0.5 text-fg">{doc.buyer_name || '—'}</dd></div>
              <div><dt className="text-fg-subtle">Currency / Incoterm</dt><dd className="mt-0.5 text-fg">{doc.currency_code || '—'} / {doc.incoterm_name || '—'}</dd></div>
              <div><dt className="text-fg-subtle">Shipment</dt><dd className="mt-0.5 text-fg">{[doc.shipment_method_name, doc.shipment_date ? formatDate(doc.shipment_date) : null, doc.port_of_loading_name ? `POL: ${doc.port_of_loading_name}` : null, doc.port_of_discharge_name ? `POD: ${doc.port_of_discharge_name}` : null].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div className="md:col-span-2"><dt className="text-fg-subtle">Remarks</dt><dd className="mt-0.5 text-fg">{doc.remarks || '—'}</dd></div>
              <div><dt className="text-fg-subtle">Created</dt><dd className="mt-0.5 text-fg">{formatDateTime(doc.created_at)}{doc.creator_name ? ` by ${doc.creator_name}` : ''}</dd></div>
              <div><dt className="text-fg-subtle">Last updated</dt><dd className="mt-0.5 text-fg">{formatDateTime(doc.updated_at)}</dd></div>
            </dl>
          )}

          {activeTab === 'Generate Documents' && (
            <GenerateDocumentsPanel documentId={id} checklists={checklists} can={can} />
          )}

          {activeTab === 'Items Shipped' && (
            (doc.items || []).length === 0 ? (
              <p className="text-sm text-fg-subtle">No items on this Export Document yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Design No.</th>
                      <th>Product</th>
                      <th>Colour / Size</th>
                      <th>Unit</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map((item, i) => (
                      <tr key={item.id}>
                        <td>{i + 1}</td>
                        <td className="cell-strong">{item.design_no || '—'}</td>
                        <td className="text-fg-muted">{item.product_name || (item.product_id ? `#${item.product_id}` : '—')}</td>
                        <td className="text-fg-muted">
                          {(item.colours || []).map((c, ci) => (
                            <div key={ci} className="mb-0.5">
                              {c.colour && <span className="font-medium">{c.colour}: </span>}
                              {(c.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ') || '—'}
                            </div>
                          ))}
                        </td>
                        <td className="text-fg-muted">{item.unit || '—'}</td>
                        <td className="text-right cell-strong">{item.qty}</td>
                        <td className="text-right cell-strong">{formatAmount(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan="6" className="text-right font-semibold text-fg-muted">Total</td>
                      <td className="text-right cell-strong">{formatAmount(itemsTotal)}</td>
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
