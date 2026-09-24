'use client';

import Link from 'next/link';
import TraceChain from '@/components/quality/TraceChain';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatQuantity } from '@/components/sales/shared/format';

const LINK = 'font-mono text-blue-600 hover:underline';

/**
 * Where finished material came from: processing record → material issue →
 * each issued source lot (with its GRN → PO → supplier → OC or
 * plan/requirement/projection chain, via TraceChain). `production` is the
 * API's `production` object on a finished-material lot or its movement.
 */
export default function ProductionTrace({ production, companyLabel, companyCode }) {
  const { can } = useAuth(true);
  if (!production) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm m-0">
        Produced by processing{' '}
        {can('processing.view') ? <Link href={`/production/processing/${production.processing_record_id}`} className={LINK}>{production.processing_no}</Link> : <span className="font-mono">{production.processing_no}</span>}
        {production.completion_date && <span className="text-gray-500"> (completed {formatDate(production.completion_date)})</span>}
        {' '}from material issue{' '}
        {can('material-issue.view') ? <Link href={`/production/material-issues/${production.material_issue_id}`} className={LINK}>{production.issue_no}</Link> : <span className="font-mono">{production.issue_no}</span>}
        {production.job_reference && <span className="text-gray-500"> · job {production.job_reference}</span>}
      </p>
      {production.sources.map((s) => (
        <div key={s.lot_id} className="border border-gray-200 rounded-md p-3">
          <div className="text-xs text-gray-500 mb-2">
            Source lot · issued {formatQuantity(s.issued_quantity, s.uom_decimal_places)} {s.unit}
            {s.issue_movement_no && <> · issue movement {can('stock.ledger') ? <Link href={`/inventory/ledger/${s.issue_movement_id}`} className={LINK}>{s.issue_movement_no}</Link> : <span className="font-mono">{s.issue_movement_no}</span>}</>}
          </div>
          <TraceChain doc={{ ...s, company_label: companyLabel, company_code: companyCode }} />
        </div>
      ))}
    </div>
  );
}
