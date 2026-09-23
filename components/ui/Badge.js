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
