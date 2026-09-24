'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { WorkflowBadge, BARCODE_STATUS_BADGES } from '@/components/ui/Badge';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/components/sales/shared/format';

/** A lot's barcode(s) on the lot page: open / print the active one, or generate it. */
export default function LotBarcodeCard({ lot, can }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const barcodes = lot.barcodes || [];
  const active = barcodes.find((b) => b.status === 'active');
  if (!can('barcode.view') && !can('barcode.create')) return null;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post('/barcodes', { lot_id: lot.id, company_id: lot.company_id });
      router.push(`/barcode/codes/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Failed to generate barcode');
      setBusy(false);
    }
  };

  return (
    <Card title="Barcode" variant="info">
      {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-2 text-sm">{error}</div>}
      {barcodes.length === 0 && <p className="text-sm text-gray-500 mb-2">No barcode yet.</p>}
      {barcodes.length > 0 && (
        <ul className="list-none p-0 mb-2 space-y-1 text-sm">
          {barcodes.map((b) => (
            <li key={b.id}>
              {can('barcode.view') ? <Link href={`/barcode/codes/${b.id}`} className="font-mono text-blue-600 hover:underline">{b.barcode_value}</Link> : <span className="font-mono">{b.barcode_value}</span>}
              {' '}<WorkflowBadge status={b.status} config={BARCODE_STATUS_BADGES} />
              <span className="text-gray-500 text-xs"> · {formatDateTime(b.created_at)}{b.retired_at ? ` · retired ${formatDateTime(b.retired_at)}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {active && can('barcode.view') && <Link href={`/barcode/codes/${active.id}/label`} className="px-3 py-1.5 rounded text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50"><i className="bi bi-printer me-1"></i> Print label</Link>}
        {!active && lot.status === 'received' && can('barcode.create') && <button type="button" disabled={busy} onClick={generate} className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"><i className="bi bi-upc me-1"></i> Generate barcode</button>}
      </div>
    </Card>
  );
}
