'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Code128Svg } from '@/components/barcode/code128';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

// Label sizes are a starting point until the client confirms its sticker stock.
const SIZES = {
  '100x50': { label: '100 × 50 mm', width: 100, height: 50 },
  '75x50': { label: '75 × 50 mm', width: 75, height: 50 },
  '100x75': { label: '100 × 75 mm', width: 100, height: 75 },
};
const FIELDS = [
  ['lot', 'Lot number'],
  ['material', 'Material'],
  ['quantity', 'Quantity + UOM'],
  ['width', 'Width'],
  ['source', 'GRN / bill or processing / job'],
  ['company', 'Company'],
  ['date', 'Date'],
];

/**
 * Print-friendly sticker(s) for a lot barcode — browser print / "Save as
 * PDF"; no printer driver or SDK. Fields and size are chosen here (the
 * client has not fixed a label layout yet); the options panel is not printed.
 */
export default function BarcodeLabelPage({ params }) {
  const { id } = use(params);
  useAuth(true);
  const [barcode, setBarcode] = useState(null);
  const [error, setError] = useState(null);
  const [size, setSize] = useState('100x50');
  const [copies, setCopies] = useState(1);
  const [fields, setFields] = useState(Object.fromEntries(FIELDS.map(([key]) => [key, true])));

  const fetchBarcode = useCallback(async () => {
    try {
      const res = await apiClient.get(`/barcodes/${id}`);
      setBarcode(res.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load barcode');
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(fetchBarcode);
  }, [fetchBarcode]);

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!barcode) return <div className="p-4 text-gray-500">Loading label...</div>;
  if (barcode.status !== 'active') return <div className="p-4 text-red-600">Barcode {barcode.barcode_value} is retired; its label cannot be printed.</div>;

  const s = SIZES[size];
  const dp = barcode.uom_decimal_places;
  const count = Math.min(Math.max(Number(copies) || 1, 1), 50);
  const lines = [
    fields.lot && ['Lot', barcode.lot_no],
    fields.material && ['Material', barcode.product_name],
    fields.quantity && ['Qty', `${formatQuantity(barcode.lot_quantity, dp)} ${barcode.unit || barcode.uom_code || ''}`],
    fields.width && barcode.width_inch && ['Width', `${formatQuantity(barcode.width_inch, 3)} in`],
    fields.source && (barcode.source_type === 'grn'
      ? ['GRN', `${barcode.inward_no}${barcode.challan_no ? ` · bill ${barcode.challan_no}` : ''}`]
      : ['Job', `${barcode.processing_no}${barcode.job_reference ? ` · ${barcode.job_reference}` : ''}`]),
    fields.company && ['Company', barcode.company_code],
    fields.date && ['Date', formatDate(barcode.received_date)],
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: ${s.width}mm ${s.height}mm; margin: 0; }
        @media print {
          .label-sheet { display: block !important; padding: 0 !important; }
          .label { box-shadow: none !important; border: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
        }
      `}</style>

      <div className="print:hidden bg-white border-b p-4 flex flex-wrap items-end gap-4 text-sm">
        <div>
          <div className="font-semibold">Label for {barcode.barcode_value}</div>
          <Link href={`/barcode/codes/${id}`} className="text-blue-600 hover:underline text-xs">Back to barcode</Link>
        </div>
        <label className="flex flex-col text-xs text-gray-600">Size
          <select value={size} onChange={(e) => setSize(e.target.value)} className="form-select rounded border-gray-300 text-sm mt-1">
            {Object.entries(SIZES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">Copies
          <input type="number" min="1" max="50" value={copies} onChange={(e) => setCopies(e.target.value)} className="form-input rounded border-gray-300 text-sm mt-1 w-20" />
        </label>
        <fieldset className="flex flex-wrap gap-3 text-xs text-gray-700">
          {FIELDS.map(([key, text]) => (
            <label key={key} className="inline-flex items-center gap-1">
              <input type="checkbox" checked={fields[key]} onChange={(e) => setFields({ ...fields, [key]: e.target.checked })} /> {text}
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"><i className="bi bi-printer me-1"></i> Print</button>
      </div>

      <div className="label-sheet p-6 flex flex-wrap gap-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="label bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col" style={{ width: `${s.width}mm`, height: `${s.height}mm`, padding: '3mm' }}>
            <Code128Svg value={barcode.barcode_value} height={40} className="w-full" style={{ height: `${s.height * 0.38}mm` }} />
            <div className="text-center font-mono font-bold tracking-widest" style={{ fontSize: '3.6mm' }}>{barcode.barcode_value}</div>
            <table className="w-full mt-1" style={{ fontSize: '2.9mm', lineHeight: 1.25 }}>
              <tbody>
                {lines.map(([k, v]) => (
                  <tr key={k}><td className="pr-2 text-gray-600 whitespace-nowrap align-top">{k}</td><td className="font-medium break-all">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
