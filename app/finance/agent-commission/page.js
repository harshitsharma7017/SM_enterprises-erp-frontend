'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';
import { formatAmount } from '@/components/sales/shared/format';
import { toPaginationFromCurrentPageMeta } from '@/components/sales/shared/pagination';

// Mirrors PurchaseOrder::agentCommissionAmount() / agentCommissionAmountLabel()
// exactly: 'amount' type is a fixed rate per piece (value x total qty);
// 'percent' type is a percentage of the PO's own totalAmount(). Null when
// the supplier has no commission value set, even if an agent is linked.
function commissionLabel(po) {
  if (po.agent_commission_value == null || po.agent_commission_value === '') return null;
  const value = Number(po.agent_commission_value);
  const totalAmount = Number(po.total_amount) || 0;
  const totalQty = Number(po.total_qty) || 0;
  const amount = po.agent_commission_type === 'amount'
    ? Math.round(value * totalQty * 100) / 100
    : Math.round(((totalAmount * value) / 100) * 100) / 100;
  const formattedAmount = `₹${formatAmount(amount)}`;

  if (po.agent_commission_type === 'amount') {
    return `${formattedAmount} (₹${formatAmount(value)}/pc × ${totalQty.toLocaleString('en-IN')} pcs)`;
  }
  const rate = value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return `${formattedAmount} (${rate}% of ₹${formatAmount(totalAmount)})`;
}

/**
 * Agent Commission — mirrors the original ERP's finance/agent-commission/index.blade.php
 * exactly: Purchase Orders joined through the Supplier's own Agent mapping
 * (not the Buyer's), with a computed commission preview using the
 * supplier's negotiated agent_commission_type/value. Only POs whose
 * supplier has an agent linked appear here (see finance.repository.js).
 */
export default function AgentCommissionPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 20, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/finance/agent-commission?page=${page}&limit=20`);
      setRows(res.data || []);
      setMeta(res.meta || { current_page: 1, per_page: 20, total: 0, last_page: 1 });
    } catch (err) {
      console.error(err);
      setError(err.data?.message || err.message || 'Failed to fetch Agent Commission');
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
      <PageHeading title="Agent Commission" />

      <Card title="Agent Commission Overview" variant="primary">
        <p className="text-sm text-gray-500 mb-4">
          Commission calculation preview from purchase orders using supplier-agent mapping and configured rates.
        </p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">PO No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium text-right">PO Amount</th>
                <th className="px-4 py-2 font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading Agent Commission...</td></tr>
              ) : rows.length === 0 ? (
                <EmptyState colspan={5} icon="bi-cash-stack" title="No purchase orders found" message="No purchase orders have a supplier with an agent linked yet." />
              ) : (
                rows.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-semibold text-gray-900">{po.po_num}</td>
                    <td className="px-4 py-2 text-gray-700">{po.supplier_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{po.agent_name || '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatAmount(po.total_amount)}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{commissionLabel(po) || '—'}</td>
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
