'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PROJECTION_STATUS_BADGES, REQUIREMENT_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';

const BTN = 'px-3 py-1.5 rounded text-sm font-medium disabled:opacity-60';

export default function BrandProjectionShowPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth(true);
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchProjection = useCallback(async () => {
    try {
      const res = await apiClient.get(`/planning/brand-projections/${id}`);
      setProjection(res.data?.projection || null);
    } catch (err) {
      setError(err.message || 'Failed to load brand projection');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchProjection);
  }, [fetchProjection]);

  const run = async (request, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await request();
      setNotice(res.message || null);
      await fetchProjection();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete draft projection ${projection.projection_no}?`)) return;
    try {
      await apiClient.delete(`/planning/brand-projections/${id}`);
      router.push('/planning/brand-projections');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <DashboardLayout><div className="p-4 text-gray-500">Loading brand projection...</div></DashboardLayout>;
  if (!projection) {
    return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error || 'Brand projection not found'}</div></DashboardLayout>;
  }

  const isDraft = projection.status === 'draft';
  const ungenerated = projection.items.filter((i) => !i.requirement_id).length;
  const hasRequirements = projection.items.some((i) => i.requirement_id);

  return (
    <DashboardLayout>
      <PageHeading
        title={projection.projection_no}
        breadcrumbs={[{ label: 'Brand Projections', href: '/planning/brand-projections' }, { label: projection.projection_no }]}
        actions={(
          <>
            {isDraft && can('brand-projection.edit') && (
              <Link href={`/planning/brand-projections/${id}/edit`} className={`${BTN} border border-blue-300 text-blue-700 hover:bg-blue-50`}>
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {isDraft && can('brand-projection.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/brand-projections/${id}/finalize`), 'Finalize this projection? Its lines are locked once finalized.')} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}>
                <i className="bi bi-check2-circle me-1"></i> Finalize
              </button>
            )}
            {!isDraft && ungenerated > 0 && can('material-requirement.create') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post('/planning/material-requirements/generate', { brand_projection_id: Number(id) }))} className={`${BTN} bg-blue-600 hover:bg-blue-700 text-white`}>
                <i className="bi bi-list-check me-1"></i> Generate Requirements ({ungenerated})
              </button>
            )}
            {!isDraft && !hasRequirements && can('brand-projection.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/brand-projections/${id}/reopen`), 'Reopen this projection as a draft?')} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reopen
              </button>
            )}
            {isDraft && can('brand-projection.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-red-300 text-red-600 hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/brand-projections" className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Projection Details" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={projection.company_label} code={projection.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Brand</dt><dd className="mt-1 font-medium text-gray-900">{projection.brand_name} <span className="text-gray-500 font-mono text-xs">({projection.brand_code})</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Period</dt><dd className="mt-1 text-gray-900">{formatDate(projection.period_start)} – {formatDate(projection.period_end)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={projection.status} config={PROJECTION_STATUS_BADGES} /></dd></div>
          <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Title</dt><dd className="mt-1 text-gray-900">{projection.title}</dd></div>
          <div><dt className="text-gray-500 text-xs">Financial Year</dt><dd className="mt-1 text-gray-900">{projection.financial_year}</dd></div>
          <div><dt className="text-gray-500 text-xs">Finalized</dt><dd className="mt-1 text-gray-900">{projection.finalized_at ? `${formatDateTime(projection.finalized_at)} · ${projection.finalizer_name || '—'}` : '—'}</dd></div>
          {projection.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{projection.remarks}</dd></div>}
        </dl>
      </Card>

      <Card title="Projected Materials" variant="info">
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium">Product / Material</th>
                <th className="px-3 py-2 font-medium">Material Type</th>
                <th className="px-3 py-2 font-medium text-right">Projected Qty</th>
                <th className="px-3 py-2 font-medium">UOM</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                <th className="px-3 py-2 font-medium">Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {projection.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{item.product_name} <span className="text-xs text-gray-500">({item.item_group_code})</span></td>
                  <td className="px-3 py-2 text-gray-500">{item.material_type_name || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatQuantity(item.quantity, item.uom_decimal_places)}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{item.uom_code}</td>
                  <td className="px-3 py-2 text-gray-500">{item.remarks || '—'}</td>
                  <td className="px-3 py-2">
                    {item.requirement_id ? (
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/planning/material-requirements/${item.requirement_id}`} className="font-mono text-blue-600 hover:underline">{item.requirement_no}</Link>
                        <WorkflowBadge status={item.requirement_status} config={REQUIREMENT_STATUS_BADGES} />
                      </span>
                    ) : <span className="text-gray-400">Not generated</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
