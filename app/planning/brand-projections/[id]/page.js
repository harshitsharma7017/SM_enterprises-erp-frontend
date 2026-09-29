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
import BrandSpecNote from '@/components/masters/brands/BrandSpecNote';

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

  if (loading) return <DashboardLayout><div className="p-4 text-fg-subtle">Loading brand projection...</div></DashboardLayout>;
  if (!projection) {
    return <DashboardLayout><div className="alert alert-danger">{error || 'Brand projection not found'}</div></DashboardLayout>;
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
              <Link href={`/planning/brand-projections/${id}/edit`} className={`${BTN} border border-line-strong text-link hover:bg-surface-hover`}>
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
            )}
            {isDraft && can('brand-projection.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/brand-projections/${id}/finalize`), 'Finalize this projection? Its lines are locked once finalized.')} className={`${BTN} bg-green-600 hover:bg-green-700 text-white`}>
                <i className="bi bi-check2-circle me-1"></i> Finalize
              </button>
            )}
            {!isDraft && ungenerated > 0 && can('material-requirement.create') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post('/planning/material-requirements/generate', { brand_projection_id: Number(id) }))} className={`${BTN} bg-accent hover:bg-accent-hover text-white`}>
                <i className="bi bi-list-check me-1"></i> Generate Requirements ({ungenerated})
              </button>
            )}
            {!isDraft && !hasRequirements && can('brand-projection.edit') && (
              <button type="button" disabled={busy} onClick={() => run(() => apiClient.post(`/planning/brand-projections/${id}/reopen`), 'Reopen this projection as a draft?')} className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>
                <i className="bi bi-arrow-counterclockwise me-1"></i> Reopen
              </button>
            )}
            {isDraft && can('brand-projection.delete') && (
              <button type="button" onClick={remove} className={`${BTN} border border-line-strong text-[var(--danger)] hover:bg-red-50`}>
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            )}
            <Link href="/planning/brand-projections" className={`${BTN} border border-line-strong text-fg-muted hover:bg-surface-hover`}>Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Projection Details" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-fg-subtle text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={projection.company_label} code={projection.company_code} /></dd></div>
          <div><dt className="text-fg-subtle text-xs">Brand</dt><dd className="mt-1 font-medium text-fg">{projection.brand_name} <span className="text-fg-subtle font-mono text-xs">({projection.brand_code})</span></dd></div>
          <div><dt className="text-fg-subtle text-xs">Period</dt><dd className="mt-1 text-fg">{formatDate(projection.period_start)} – {formatDate(projection.period_end)}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={projection.status} config={PROJECTION_STATUS_BADGES} /></dd></div>
          <div className="md:col-span-2"><dt className="text-fg-subtle text-xs">Title</dt><dd className="mt-1 text-fg">{projection.title}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Financial Year</dt><dd className="mt-1 text-fg">{projection.financial_year}</dd></div>
          <div><dt className="text-fg-subtle text-xs">Finalized</dt><dd className="mt-1 text-fg">{projection.finalized_at ? `${formatDateTime(projection.finalized_at)} · ${projection.finalizer_name || '—'}` : '—'}</dd></div>
          {projection.remarks && <div className="md:col-span-4"><dt className="text-fg-subtle text-xs">Remarks</dt><dd className="mt-1 text-fg whitespace-pre-line">{projection.remarks}</dd></div>}
        </dl>
      </Card>

      <Card title="Projected Materials" variant="info">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Product / Material</th>
                <th>Material Type</th>
                <th className="text-right">Projected Qty</th>
                <th>UOM</th>
                <th>Remarks</th>
                <th>Requirement</th>
              </tr>
            </thead>
            <tbody>
              {projection.items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="cell-strong">{item.product_name} <span className="text-xs text-fg-subtle">({item.item_group_code})</span><BrandSpecNote spec={item.brand_spec} /></td>
                  <td>{item.material_type_name || '—'}</td>
                  <td className="text-right">{formatQuantity(item.quantity, item.uom_decimal_places)}</td>
                  <td className="font-mono text-fg-muted">{item.uom_code}</td>
                  <td>{item.remarks || '—'}</td>
                  <td>
                    {item.requirement_id ? (
                      <span className="inline-flex items-center gap-2">
                        <Link href={`/planning/material-requirements/${item.requirement_id}`} className="font-mono text-link hover:underline">{item.requirement_no}</Link>
                        <WorkflowBadge status={item.requirement_status} config={REQUIREMENT_STATUS_BADGES} />
                      </span>
                    ) : <span className="text-fg-subtle">Not generated</span>}
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
