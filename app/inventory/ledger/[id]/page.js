'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { STOCK_MOVEMENT_LABELS } from '@/components/ui/Badge';
import TraceChain from '@/components/quality/TraceChain';
import ProductionTrace from '@/components/production/ProductionTrace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity } from '@/components/sales/shared/format';

/** One stock movement and its trace: movement → QC → lot → GRN → PO → OC or plan/requirement/projection. */
export default function StockMovementPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [movement, setMovement] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.get(`/inventory/ledger/${id}`)
      .then((res) => { if (mounted) setMovement(res.data || null); })
      .catch((err) => { if (mounted) setError(err.message || 'Failed to load movement'); });
    return () => { mounted = false; };
  }, [id]);

  if (error) return <DashboardLayout><div className="bg-red-50 text-red-600 p-3 rounded">{error}</div></DashboardLayout>;
  if (!movement) return <DashboardLayout><div className="p-4 text-gray-500">Loading movement...</div></DashboardLayout>;

  const q = (v) => `${formatQuantity(v, movement.uom_decimal_places)} ${movement.unit || ''}`;

  return (
    <DashboardLayout>
      <PageHeading
        title={movement.movement_no}
        breadcrumbs={[{ label: 'Stock Ledger', href: '/inventory/ledger' }, { label: movement.movement_no }]}
        actions={<Link href="/inventory/ledger" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>}
      />

      <Card title="Movement" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Type</dt><dd className="mt-1 text-gray-900">{STOCK_MOVEMENT_LABELS[movement.movement_type]}</dd></div>
          <div><dt className="text-gray-500 text-xs">Date</dt><dd className="mt-1 text-gray-900">{formatDate(movement.movement_date)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Quantity</dt><dd className={`mt-1 text-lg font-semibold ${movement.direction === 'in' ? 'text-green-700' : 'text-red-700'}`}>{movement.direction === 'in' ? '+' : '−'}{q(movement.quantity)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Lot balance after</dt><dd className="mt-1 text-lg font-semibold">{q(movement.balance_after)}</dd></div>
          <div><dt className="text-gray-500 text-xs">Location</dt><dd className="mt-1 text-gray-900"><span className="font-mono">{movement.location_code}</span> · {movement.location_name}</dd></div>
          <div>
            <dt className="text-gray-500 text-xs">Source</dt>
            <dd className="mt-1 text-gray-900">
              {movement.quality_inspection_id ? (
                <>Inspection <Link href={`/quality-control/${movement.quality_inspection_id}`} className="font-mono text-blue-600 hover:underline">{movement.qc_no}</Link></>
              ) : movement.processing_record_id ? (
                <>Production output of <Link href={`/production/processing/${movement.processing_record_id}`} className="font-mono text-blue-600 hover:underline">{movement.processing_no}</Link></>
              ) : movement.material_issue_id ? (
                <>Material issue <Link href={`/production/material-issues/${movement.material_issue_id}`} className="font-mono text-blue-600 hover:underline">{movement.issue_no}</Link>{movement.job_reference ? ` · job ${movement.job_reference}` : ''}</>
              ) : 'Stock adjustment'}
            </dd>
          </div>
          {movement.reason && <div className="md:col-span-2"><dt className="text-gray-500 text-xs">Reason</dt><dd className="mt-1 text-gray-900">{movement.reason}</dd></div>}
          {movement.remarks && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{movement.remarks}</dd></div>}
          <div><dt className="text-gray-500 text-xs">Posted by</dt><dd className="mt-1 text-gray-900">{movement.creator_name || '—'} · {formatDateTime(movement.created_at)}</dd></div>
          {can('stock.view') && <div><dt className="text-gray-500 text-xs">Lot stock</dt><dd className="mt-1"><Link href={`/inventory/stock/${movement.lot_id}`} className="text-blue-600 hover:underline">View lot stock</Link></dd></div>}
        </dl>
      </Card>

      <Card title="Traceability" variant="info">
        {movement.production
          ? <ProductionTrace production={movement.production} companyLabel={movement.company_label} companyCode={movement.company_code} />
          : <TraceChain doc={movement} />}
      </Card>
    </DashboardLayout>
  );
}
