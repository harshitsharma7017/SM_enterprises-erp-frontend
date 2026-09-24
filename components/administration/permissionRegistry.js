// Mirrors the original ERP's config/permissions.php exactly — 7 groups, in
// this order, each with its modules (permission-name prefix), display label,
// and declared actions (defaulting to view/create/edit/delete when a module
// doesn't override it). This is the client-side equivalent of
// App\Support\PermissionRegistry, since the Node backend has no live
// config to read it from at runtime — only the seeded `permissions` rows
// (with `group_name`, added in Phase B) and `roles`.
const DEFAULT_ACTIONS = ['view', 'create', 'edit', 'delete'];

export const GROUPS = {
  Masters: {
    category: { label: 'Categories' },
    'po-format': { label: 'Order Formats' },
    product: { label: 'Products' },
    'material-type': { label: 'Material Types' },
    uom: { label: 'UOM' },
    buyer: { label: 'Buyers' },
    brand: { label: 'Brands' },
    supplier: { label: 'Suppliers' },
    jobber: { label: 'Jobbers' },
    agent: { label: 'Agents' },
    'fob-value': { label: 'FOB Values' },
    markup: { label: 'Markup' },
  },
  Sales: {
    inquiry: { label: 'Inquiries', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
    'order-confirmation': { label: 'Order Confirmations · allocate = production to orders', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'allocate'] },
  },
  Planning: {
    'brand-projection': { label: 'Brand Projections' },
    'material-requirement': { label: 'Material Requirements' },
    'material-plan': { label: 'Material Plans' },
  },
  Procurement: {
    'purchase-order': { label: 'Purchase Orders', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
    'inward-entry': { label: 'Goods Receipts (GRN) · post = post / cancel · approve = Quality Control', actions: ['view', 'create', 'edit', 'delete', 'post', 'approve'] },
    'supplier-return': { label: 'Supplier Returns', actions: ['view', 'create', 'post', 'cancel'] },
  },
  Inventory: {
    stock: { label: 'Stock', actions: ['view', 'ledger', 'post', 'adjust'] },
    'stock-location': { label: 'Stock Locations', actions: ['view', 'create', 'edit'] },
  },
  Production: {
    'material-issue': { label: 'Material Issues', actions: ['view', 'create', 'edit', 'post', 'cancel'] },
    processing: { label: 'Processing · post = output to stock', actions: ['view', 'create', 'edit', 'complete', 'post'] },
  },
  Dispatch: {
    dispatch: { label: 'Dispatches', actions: ['view', 'create', 'edit', 'post', 'cancel'] },
  },
  Export: {
    packing: { label: 'Packing' },
    'export-document': { label: 'Export Documents', actions: ['view', 'create', 'edit', 'delete', 'generate', 'export'] },
  },
  Finance: {
    'purchase-bill': { label: 'Purchase Bills' },
    'debit-note': { label: 'Debit Notes · approve = post / cancel', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    payment: { label: 'Supplier Payments', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    'foreign-payment': { label: 'Buyer Receipts', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    'agent-commission': { label: 'Agent Commission' },
  },
  Reports: {
    outstanding: { label: 'Outstanding', actions: ['view', 'export'] },
    report: { label: 'Reports', actions: ['view', 'export'] },
  },
  Administration: {
    user: { label: 'Users' },
    role: { label: 'Roles' },
    permission: { label: 'Permissions', actions: ['view', 'sync'] },
    'company-profile': { label: 'Company Profile', actions: ['view', 'edit'] },
    company: { label: 'Companies', actions: ['view', 'create', 'edit', 'delete'] },
  },
};

export const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  post: 'Post',
  cancel: 'Cancel',
  ledger: 'Ledger',
  adjust: 'Adjust',
  complete: 'Complete',
  allocate: 'Allocate',
  export: 'Export',
  generate: 'Generate',
  sync: 'Sync',
};

// Column order for the matrix — every action actually used by any module,
// in config/permissions.php's declared order.
export const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'post', 'cancel', 'approve', 'complete', 'allocate', 'ledger', 'adjust', 'export', 'generate', 'sync'];

export function moduleActions(group, moduleKey) {
  return GROUPS[group]?.[moduleKey]?.actions || DEFAULT_ACTIONS;
}

export function actionLabel(action) {
  return ACTION_LABELS[action] || action;
}

// Original ERP: config('permissions.roles') keys — seeded roles that route
// middleware/Gate checks reference by name; the Node backend hardcodes the
// same list server-side (role.controller.js SYSTEM_ROLES) for the actual
// enforcement. This copy drives the UI badges/disabled-state only.
export const SYSTEM_ROLES = [
  'Super Admin',
  'Admin',
  'Merchandising & Manufacturing',
  'Accounts',
  'Export Documentation & Foreign Payment',
  'Packing',
  'Quality Checker',
  'Jobworker',
];

export function isSystemRole(name) {
  return SYSTEM_ROLES.includes(name);
}

// Original ERP: config('permissions.super_admin.email') — the one account
// UserService protects. The Node backend enforces this server-side
// (config.superAdminEmail, env SUPER_ADMIN_EMAIL); this mirrors its default
// purely so the UI can show the protected-account badge/disabled controls
// without an extra round trip. The real protection always runs server-side
// regardless of what this constant says, so a mismatch here only affects a
// badge, never actual access.
export const PROTECTED_ADMIN_EMAIL = 'test@test.com';

export function isProtectedUser(user) {
  return user?.email === PROTECTED_ADMIN_EMAIL;
}
