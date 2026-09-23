'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, STOCK_STATUS_BADGES, STOCK_MOVEMENT_LABELS, QC_STATUS_BADGES, qcBadgeStatus } from '@/components/ui/Badge';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, todayDateInputValue } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const EMPTY_ADJUSTMENT = { location_id: '', direction: 'out', quantity: '', reason: '', movement_date: todayDateInputValue(), remarks: '' };

function Figure({ label, value, tone = 'text-gray-900' }) {
  return (
    <div className="rounded border border-gray-200 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

/** Stock of one lot: QC → stock figures, balance per location, movement history, restricted adjustment. */
export default function LotStockPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [adjustment, setAdjustment] = useState(EMPTY_ADJUSTMENT);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get(`/inventory/stock/lots/${id}`);
      setData(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load lot stock');
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  const submitAdjustment = async (e) => {
    e.preventDefault();
    const verb = adjustment.direction === 'out' ? 'Remove' : 'Add';
    if (!confirm(`${verb} ${adjustment.quantity} ${data.lot.unit || ''}? A posted adjustment cannot be edited.`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.post('/inventory/stock/adjustments', { ...adjustment, lot_id: Number(id), location_id: Number(adjustment.location_id) });
      setNotice(res.message || null);
      setAdjustment(EMPTY_ADJUSTMENT);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return <DashboardLayout>{error ? <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div> : <div className="p-4 text-gray-500">Loading lot stock...</div>}</DashboardLayout>;
  }

  const { lot, balances, movements } = data;
  const dp = lot.uom_decimal_places;
  const q = (v) => `${formatQuantity(v, dp)} ${lot.unit || ''}`;

  return (
    <DashboardLayout>
      <PageHeading
        title={`Stock · ${lot.lot_no}`}
        breadcrumbs={[{ label: 'Stock', href: '/inventory/stock' }, { label: lot.lot_no }]}
        actions={(
          <>
            <Link href={`/procurement/lots/${lot.id}`} className="px-3 py-1.5 rounded text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50">Lot</Link>
            <Link href="/inventory/stock" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>
          </>
        )}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Receipt → Quality → Stock" variant="primary">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <Figure label="Received (GRN)" value={q(lot.quantity)} />
          <Figure label="QC inspected" value={q(lot.qc_inspected_quantity)} />
          <Figure label="QC accepted" value={q(lot.qc_accepted_quantity)} tone="text-green-700" />
          <Figure label="QC rejected" value={q(lot.qc_rejected_quantity)} tone="text-red-700" />
          <Figure label="Returned to supplier" value={q(lot.returned_quantity)} />
          <Figure label="Accepted posted to stock" value={q(lot.stock_received_quantity)} />
          <Figure label="Usable stock now" value={q(lot.stock_quantity)} tone="text-blue-800" />
        </div>
        <p className="text-xs text-gray-500 mt-2 mb-0">Only QC-accepted quantity enters usable stock. Rejected material stays outside stock and is tracked through QC and supplier returns.</p>
      </Card>

      <Card title="Source & Traceability" variant="info">
        <TraceChain doc={{ ...lot, lot_id: lot.id, lot_quantity: lot.quantity }} quantityLabel="Received quantity" />
      </Card>

      <Card title="Balance by Location" variant="info">
        {balances.length === 0 ? <p className="text-sm text-gray-500 m-0">Nothing of this lot has been posted to stock.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Location</th><th className="py-1.5 font-medium text-right">Received from QC</th><th className="py-1.5 font-medium text-right">Available</th><th className="py-1.5 font-medium">Last movement</th><th className="py-1.5 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map((b) => (
                <tr key={b.location_id}>
                  <td className="py-1.5"><span className="font-mono">{b.location_code}</span> <span className="text-gray-500">{b.location_name}</span></td>
                  <td className="py-1.5 text-right">{q(b.received_quantity)}</td>
                  <td className="py-1.5 text-right font-semibold">{q(b.quantity)}</td>
                  <td className="py-1.5 text-gray-600">{formatDate(b.last_movement_date)}</td>
                  <td className="py-1.5"><WorkflowBadge status={b.stock_status} config={STOCK_STATUS_BADGES} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Inspections" variant="info">
        {lot.inspections.length === 0 ? <p className="text-sm text-gray-500 m-0">Not inspected yet.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">QC No.</th><th className="py-1.5 font-medium text-right">Accepted</th><th className="py-1.5 font-medium text-right">Rejected</th><th className="py-1.5 font-medium">Status</th><th className="py-1.5 font-medium">Stock</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {lot.inspections.map((qc) => (
                <tr key={qc.id}>
                  <td className="py-1.5"><Link href={`/quality-control/${qc.id}`} className="font-mono text-blue-600 hover:underline">{qc.qc_no}</Link></td>
                  <td className="py-1.5 text-right">{qc.accepted_quantity === null ? '—' : q(qc.accepted_quantity)}</td>
                  <td className="py-1.5 text-right">{qc.rejected_quantity === null ? '—' : q(qc.rejected_quantity)}</td>
                  <td className="py-1.5"><WorkflowBadge status={qcBadgeStatus(qc)} config={QC_STATUS_BADGES} /></td>
                  <td className="py-1.5 font-mono text-xs">{qc.stock_movement_no || <span className="font-sans text-gray-400">not posted</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Stock Movements" variant="info">
        {movements.length === 0 ? <p className="text-sm text-gray-500 m-0">No movements.</p> : (
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left"><tr><th className="py-1.5 font-medium">Movement</th><th className="py-1.5 font-medium">Date</th><th className="py-1.5 font-medium">Type</th><th className="py-1.5 font-medium">Location</th><th className="py-1.5 font-medium">Source / Reason</th><th className="py-1.5 font-medium text-right">In</th><th className="py-1.5 font-medium text-right">Out</th><th className="py-1.5 font-medium text-right">Balance</th><th className="py-1.5 font-medium">By</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5">{can('stock.ledger') ? <Link href={`/inventory/ledger/${m.id}`} className="font-mono text-blue-600 hover:underline">{m.movement_no}</Link> : <span className="font-mono">{m.movement_no}</span>}</td>
                  <td className="py-1.5 text-gray-600 whitespace-nowrap">{formatDate(m.movement_date)}</td>
                  <td className="py-1.5">{STOCK_MOVEMENT_LABELS[m.movement_type]}</td>
                  <td className="py-1.5 font-mono text-xs">{m.location_code}</td>
                  <td className="py-1.5 text-gray-700">{m.qc_no ? <Link href={`/quality-control/${m.quality_inspection_id}`} className="font-mono text-blue-600 hover:underline">{m.qc_no}</Link> : m.reason}</td>
                  <td className="py-1.5 text-right text-green-700">{Number(m.quantity_in) > 0 ? formatQuantity(m.quantity_in, dp) : ''}</td>
                  <td className="py-1.5 text-right text-red-700">{Number(m.quantity_out) > 0 ? formatQuantity(m.quantity_out, dp) : ''}</td>
                  <td className="py-1.5 text-right font-medium">{formatQuantity(m.balance_after, dp)}</td>
                  <td className="py-1.5 text-xs text-gray-500">{m.creator_name || '—'} · {formatDateTime(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {can('stock.adjust') && balances.length > 0 && (
        <Card title="Stock Adjustment (restricted)" variant="info">
          <p className="text-xs text-gray-500 mt-0 mb-3">
            Corrects an existing balance of this lot. Removing cannot make stock negative; adding can only restore stock removed earlier
            (never above the QC-accepted quantity). A reason is required and the movement cannot be edited afterwards.
          </p>
          <form onSubmit={submitAdjustment} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
              <select required value={adjustment.location_id} onChange={(e) => setAdjustment({ ...adjustment, location_id: e.target.value })} className={INPUT}>
                <option value="">—</option>
                {balances.map((b) => <option key={b.location_id} value={b.location_id}>{b.location_code} ({formatQuantity(b.quantity, dp)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Direction *</label>
              <select value={adjustment.direction} onChange={(e) => setAdjustment({ ...adjustment, direction: e.target.value })} className={INPUT}>
                <option value="out">Remove (out)</option>
                <option value="in">Restore (in)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity ({lot.unit}) *</label>
              <input type="number" required min="0" step={stepFor(dp)} value={adjustment.quantity} onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })} className={`${INPUT} text-right`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={adjustment.movement_date} onChange={(e) => setAdjustment({ ...adjustment, movement_date: e.target.value })} className={INPUT} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
              <input type="text" required minLength={3} maxLength={255} value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} className={INPUT} />
            </div>
            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
              <input type="text" maxLength={2000} value={adjustment.remarks} onChange={(e) => setAdjustment({ ...adjustment, remarks: e.target.value })} className={INPUT} />
            </div>
            <div>
              <button type="submit" disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-60">Post Adjustment</button>
            </div>
          </form>
        </Card>
      )}
    </DashboardLayout>
  );
}
