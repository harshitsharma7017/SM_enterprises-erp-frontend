'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { WorkflowBadge, PROCESSING_STATUS_BADGES } from '@/components/ui/Badge';
import CompanyBadge from '@/components/company/CompanyBadge';
import TraceChain from '@/components/quality/TraceChain';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDateTime, formatQuantity, toDateInputValue, todayDateInputValue } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');
const asInput = (v) => (v === null || v === undefined ? '' : String(Number(v)));
const LINE_FIELDS = [['consumed_quantity', 'Consumed'], ['wastage_quantity', 'Wastage'], ['balance_quantity', 'Balance']];

const formFrom = (record) => ({
  start_date: toDateInputValue(record.start_date),
  produced_product_id: record.produced_product_id || '',
  produced_uom_id: record.produced_uom_id || '',
  produced_quantity: asInput(record.produced_quantity),
  remarks: record.remarks || '',
  items: record.items.map((i) => ({
    id: i.id,
    consumed_quantity: asInput(i.consumed_quantity),
    wastage_quantity: asInput(i.wastage_quantity),
    balance_quantity: asInput(i.balance_quantity),
    remarks: i.remarks || '',
  })),
});

/**
 * Processing record: per issued lot the consumed / wastage / balance
 * quantities and, for the job, the produced quantity. These are recorded as
 * reported — no formula between them is applied (none has been defined).
 */
export default function ProcessingShowPage({ params }) {
  const { id } = use(params);
  const { can } = useAuth(true);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [options, setOptions] = useState({ products: [], uoms: [] });
  const [completionDate, setCompletionDate] = useState(todayDateInputValue());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchRecord = useCallback(async () => {
    try {
      const res = await apiClient.get(`/production/processing/${id}`);
      setRecord(res.data || null);
      setForm(res.data ? formFrom(res.data) : null);
    } catch (err) {
      setError(err.message || 'Failed to load processing record');
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchRecord);
  }, [fetchRecord]);

  const companyId = record?.company_id;
  const editable = record?.status === 'in_process' && can('processing.edit');
  useEffect(() => {
    if (!companyId || !editable) return;
    apiClient.get(`/production/processing/form-data?company_id=${companyId}`)
      .then((res) => setOptions(res.data || { products: [], uoms: [] }))
      .catch(() => setOptions({ products: [], uoms: [] }));
  }, [companyId, editable]);

  const act = async (work) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await work();
      setNotice(res.message || null);
      setRecord(res.data);
      setForm(formFrom(res.data));
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    act(() => apiClient.put(`/production/processing/${id}`, form));
  };
  const complete = () => {
    if (!confirm(`Complete ${record.processing_no}? The recorded quantities become final.`)) return;
    act(() => apiClient.post(`/production/processing/${id}/complete`, { completion_date: completionDate }));
  };

  if (!record || !form) {
    return <DashboardLayout>{error ? <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div> : <div className="p-4 text-gray-500">Loading processing record...</div>}</DashboardLayout>;
  }

  const setItem = (itemId, patch) => setForm((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  const selectedUom = options.uoms.find((u) => String(u.id) === String(form.produced_uom_id));
  const chooseProduct = (value) => {
    const product = options.products.find((p) => String(p.id) === String(value));
    setForm((prev) => ({ ...prev, produced_product_id: value, produced_uom_id: product?.uom_id || prev.produced_uom_id }));
  };

  return (
    <DashboardLayout>
      <PageHeading
        title={record.processing_no}
        breadcrumbs={[{ label: 'Processing', href: '/production/processing' }, { label: record.processing_no }]}
        actions={<Link href="/production/processing" className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">Back</Link>}
      />

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}

      <Card title="Processing" variant="primary">
        <dl className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500 text-xs">Company</dt><dd className="mt-1"><CompanyBadge label={record.company_label} code={record.company_code} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Status</dt><dd className="mt-1"><WorkflowBadge status={record.status} config={PROCESSING_STATUS_BADGES} /></dd></div>
          <div><dt className="text-gray-500 text-xs">Material Issue</dt><dd className="mt-1"><Link href={`/production/material-issues/${record.material_issue_id}`} className="font-mono text-blue-600 hover:underline">{record.issue_no}</Link> <span className="text-xs text-gray-500">{formatDate(record.issue_date)} · {record.location_code}</span></dd></div>
          <div><dt className="text-gray-500 text-xs">Job Reference</dt><dd className="mt-1 text-gray-900">{record.job_reference || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Received by</dt><dd className="mt-1 text-gray-900">{record.receiver_name || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Supervisor / Cutting</dt><dd className="mt-1 text-gray-900">{record.supervisor_name || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Foreman</dt><dd className="mt-1 text-gray-900">{record.foreman_name || '—'}</dd></div>
          <div><dt className="text-gray-500 text-xs">Started / Completed</dt><dd className="mt-1 text-gray-900">{formatDate(record.start_date)} / {record.completion_date ? formatDate(record.completion_date) : '—'}</dd></div>
          <div className="md:col-span-2">
            <dt className="text-gray-500 text-xs">Produced</dt>
            <dd className="mt-1 text-lg font-semibold">
              {record.produced_quantity === null ? '—' : `${formatQuantity(record.produced_quantity, record.produced_uom_decimal_places)} ${record.produced_unit || ''}`}
              {record.produced_product_name && <span className="text-sm font-normal text-gray-600"> · {record.produced_product_name}</span>}
            </dd>
          </div>
          {record.completed_at && <div><dt className="text-gray-500 text-xs">Completed by</dt><dd className="mt-1 text-gray-900">{record.completer_name || '—'} · {formatDateTime(record.completed_at)}</dd></div>}
          {record.remarks && !editable && <div className="md:col-span-4"><dt className="text-gray-500 text-xs">Remarks</dt><dd className="mt-1 text-gray-900 whitespace-pre-line">{record.remarks}</dd></div>}
        </dl>
      </Card>

      <form onSubmit={save}>
        <Card title="Issued Material — Consumption, Wastage, Balance" variant="info">
          <table className="min-w-full text-sm">
            <thead className="text-gray-500 text-xs text-left">
              <tr>
                <th className="py-1.5 font-medium">Lot</th>
                <th className="py-1.5 font-medium">Material</th>
                <th className="py-1.5 font-medium text-right">Issued</th>
                {LINE_FIELDS.map(([, label]) => <th key={label} className="py-1.5 font-medium text-right w-32">{label}</th>)}
                <th className="py-1.5 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {record.items.map((item) => {
                const row = form.items.find((i) => i.id === item.id);
                const dp = item.uom_decimal_places;
                return (
                  <tr key={item.id}>
                    <td className="py-1.5"><Link href={`/procurement/lots/${item.lot_id}`} className="font-mono text-blue-600 hover:underline">{item.lot_no}</Link></td>
                    <td className="py-1.5">{item.product_name} <span className="text-xs text-gray-500">{formatQuantity(item.width_inch, 3)}&quot;</span></td>
                    <td className="py-1.5 text-right font-semibold whitespace-nowrap">{formatQuantity(item.issued_quantity, dp)} {item.unit}</td>
                    {LINE_FIELDS.map(([field]) => (
                      <td key={field} className="py-1.5 text-right">
                        {editable ? (
                          <input type="number" min="0" step={stepFor(dp)} value={row[field]} onChange={(e) => setItem(item.id, { [field]: e.target.value })} className={`${INPUT} text-right`} />
                        ) : (item[field] === null ? '—' : formatQuantity(item[field], dp))}
                      </td>
                    ))}
                    <td className="py-1.5">
                      {editable ? <input type="text" maxLength={1000} value={row.remarks} onChange={(e) => setItem(item.id, { remarks: e.target.value })} className={INPUT} /> : (item.remarks || '')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2 mb-0">Quantities are recorded as reported, in the issued lot&apos;s unit; each is limited to the quantity issued. No formula between them is applied.</p>
        </Card>

        {editable && (
          <Card title="Output & Record" variant="info">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Produced product (optional)</label>
                <select value={form.produced_product_id} onChange={(e) => chooseProduct(e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">—</option>
                  {options.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.item_group_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Produced UOM</label>
                <select value={form.produced_uom_id} onChange={(e) => setForm({ ...form, produced_uom_id: e.target.value })} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">—</option>
                  {options.uoms.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Produced quantity</label>
                <input type="number" min="0" step={stepFor(selectedUom?.decimal_places)} value={form.produced_quantity} onChange={(e) => setForm({ ...form, produced_quantity: e.target.value })} className={`${INPUT} text-right`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start date *</label>
                <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={INPUT} />
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" maxLength={2000} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={INPUT} />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t border-gray-200 mt-4 pt-3">
              <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"><i className="bi bi-check-lg mr-1"></i> Save</button>
              {can('processing.complete') && (
                <>
                  <div className="ml-auto">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Completion date</label>
                    <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className="form-input rounded border-gray-300 text-sm" />
                  </div>
                  <button type="button" disabled={busy} onClick={complete} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-60"><i className="bi bi-check2-circle mr-1"></i> Complete</button>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 mb-0">Save first; completing needs consumed, wastage and balance for every lot (0 is allowed) and the produced quantity with its UOM.</p>
          </Card>
        )}
      </form>

      {record.items.map((item) => (
        <Card key={item.id} title={`Traceability · ${item.lot_no}`} variant="info">
          <p className="text-xs text-gray-500 mt-0 mb-2">
            Processing {record.processing_no} → issue {record.issue_no} → stock movement{' '}
            {item.stock_movement_id && can('stock.ledger') ? <Link href={`/inventory/ledger/${item.stock_movement_id}`} className="font-mono text-blue-600 hover:underline">{item.stock_movement_no}</Link> : <span className="font-mono">{item.stock_movement_no}</span>}
          </p>
          <TraceChain doc={{ ...item, company_label: record.company_label, company_code: record.company_code }} />
        </Card>
      ))}
    </DashboardLayout>
  );
}
