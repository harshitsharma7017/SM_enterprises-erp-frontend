export function StatusBadge({ status, onClick }) {
  const isActive = status === 'active';
  const Component = onClick ? 'button' : 'span';
  const props = onClick ? { type: 'button', onClick, className: `badge border rounded-md px-2 py-1 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'} hover:opacity-80 transition-opacity cursor-pointer` } : { className: `badge border rounded-md px-2 py-1 text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}` };

  return (
    <Component {...props}>
      {isActive ? 'Active' : 'Inactive'}
    </Component>
  );
}

export function StandardBadge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ${className}`}>
      {children}
    </span>
  );
}

const WORKFLOW_COLORS = {
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
};

// Mirrors Inquiry::STATUSES / STATUS_COLORS in the original ERP.
export const INQUIRY_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  price_working: { label: 'Price Working', color: 'cyan' },
  quote_sent: { label: 'Quote Sent', color: 'blue' },
  confirmed: { label: 'Confirmed', color: 'green' },
  converted_to_oc: { label: 'Converted to OC', color: 'green' },
  lost: { label: 'Lost', color: 'red' },
};

// Mirrors OrderConfirmation::STATUSES / STATUS_COLORS in the original ERP.
export const OC_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  sent: { label: 'OC Sent', color: 'cyan' },
  confirmed: { label: 'Confirmed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// Customer-order lifecycle: the stored OC status, or once confirmed its fulfilment (follows dispatch).
export const ORDER_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  sent: { label: 'OC Sent', color: 'cyan' },
  open: { label: 'Confirmed / Open', color: 'blue' },
  partially_fulfilled: { label: 'Partially Fulfilled', color: 'amber' },
  fulfilled: { label: 'Fulfilled', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
// Production against an order item (from production allocations).
export const PRODUCTION_PROGRESS_BADGES = {
  not_produced: { label: 'Not produced', color: 'gray' },
  partially_produced: { label: 'Partially produced', color: 'amber' },
  produced: { label: 'Produced', color: 'green' },
};
export const ALLOCATION_STATUS_BADGES = {
  active: { label: 'Active', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// Mirrors PurchaseOrder::STATUSES / STATUS_COLORS in the original ERP.
export const PO_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  raised: { label: 'Raised', color: 'blue' },
  partial: { label: 'Partial', color: 'amber' },
  received: { label: 'Received', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// Goods receipt (GRN) workflow — inward_entries.receipt_status.
export const GRN_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  posted: { label: 'Posted', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

export const LOT_STATUS_BADGES = {
  received: { label: 'Received', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// Quality inspection: a draft is still pending; a completed one shows its result.
export const QC_STATUS_BADGES = {
  draft: { label: 'Pending', color: 'gray' },
  accepted: { label: 'Accepted', color: 'green' },
  partially_accepted: { label: 'Partially Accepted', color: 'amber' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
export const qcBadgeStatus = (qc) => (qc.status === 'completed' ? qc.result : qc.status);

// Supplier returns and debit notes: draft → posted, or cancelled.
export const POSTING_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  posted: { label: 'Posted', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// Stock ledger (stock_movements.movement_type) and balance state.
export const STOCK_MOVEMENT_LABELS = {
  QC_ACCEPTED_RECEIPT: 'QC Accepted Receipt',
  STOCK_ADJUSTMENT: 'Stock Adjustment',
  MATERIAL_ISSUE: 'Material Issue',
  PRODUCTION_OUTPUT: 'Production Output',
};
// Where a lot came from: received against a GRN, or finished material produced in-house.
export const LOT_SOURCE_LABELS = { grn: 'Received (GRN)', production: 'Production output' };

// Material issue (store → supervisor/cutting) and its processing record.
export const MATERIAL_ISSUE_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  issued: { label: 'Issued', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
export const PROCESSING_STATUS_BADGES = {
  in_process: { label: 'In Process', color: 'amber' },
  completed: { label: 'Completed', color: 'green' },
};
export const OUTPUT_STATUS_BADGES = {
  not_posted: { label: 'Not posted', color: 'gray' },
  posted: { label: 'Posted to stock', color: 'green' },
};
export const STOCK_STATUS_BADGES = {
  available: { label: 'Available', color: 'green' },
  nil: { label: 'Nil', color: 'gray' },
};
export const LOCATION_STATUS_BADGES = {
  active: { label: 'Active', color: 'green' },
  inactive: { label: 'Inactive', color: 'gray' },
};

// Where a purchase order came from (purchase_orders.origin).
export const PO_ORIGIN_LABELS = {
  order_confirmation: 'Order Confirmation',
  material_requirement: 'Material Requirement',
  material_plan: 'Material Plan',
};

// Mirrors ExportDocument::STATUSES / STATUS_COLORS in the original ERP.
export const EXPORT_DOC_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
  closed: { label: 'Closed', color: 'green' },
};

// Mirrors ExportDocumentChecklist::STATUSES / STATUS_COLORS — the Node
// backend only ever writes 'pending' or 'uploaded' (see Phase 5A report),
// unlike the original's fuller pending/generated/uploaded/received/cancelled
// set, so 'generated'/'received'/'cancelled' are kept here only for display
// parity if a future backend change starts using them.
export const CHECKLIST_STATUS_BADGES = {
  pending: { label: 'Pending', color: 'gray' },
  generated: { label: 'Generated', color: 'blue' },
  uploaded: { label: 'Uploaded', color: 'green' },
  received: { label: 'Received', color: 'green' },
  cancelled: { label: 'Draft cancelled', color: 'amber' },
};

// Mirrors InwardEntry::STATUSES / STATUS_COLORS in the original ERP.
export const INWARD_STATUS_BADGES = {
  pending: { label: 'Pending Inspection', color: 'amber' },
  approved: { label: 'QC Approved', color: 'green' },
  rejected: { label: 'QC Rejected', color: 'red' },
};

// Planning statuses (brand projection → material requirement → material plan).
export const PROJECTION_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  finalized: { label: 'Finalized', color: 'green' },
};

export const REQUIREMENT_STATUS_BADGES = {
  open: { label: 'Open', color: 'amber' },
  planned: { label: 'Planned', color: 'green' },
  closed: { label: 'Closed', color: 'gray' },
};

export const PLAN_STATUS_BADGES = {
  draft: { label: 'Draft', color: 'gray' },
  planned: { label: 'Planned', color: 'blue' },
  closed: { label: 'Closed', color: 'green' },
};

export function WorkflowBadge({ status, config }) {
  const entry = config[status] || { label: status || '—', color: 'gray' };
  return (
    <span className={`badge border rounded-md px-2 py-1 text-xs font-medium ${WORKFLOW_COLORS[entry.color]}`}>
      {entry.label}
    </span>
  );
}
