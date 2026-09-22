// Shared helpers for the Export Documents module.

let cartonKeySeq = 0;
export function nextCartonKey() {
  cartonKeySeq += 1;
  return `carton_${Date.now()}_${cartonKeySeq}`;
}

export function blankCartonLine() {
  return { description: '', unit: 'PCS', qty: '' };
}

export function blankCarton() {
  return { _key: nextCartonKey(), carton_no: '', net_weight: '', gross_weight: '', dimensions: '', lines: [blankCartonLine()] };
}

export function cartonFromServer(serverCarton) {
  return {
    _key: nextCartonKey(),
    id: serverCarton.id,
    carton_no: serverCarton.carton_no || '',
    net_weight: serverCarton.net_weight ?? '',
    gross_weight: serverCarton.gross_weight ?? '',
    dimensions: serverCarton.dimensions || '',
    lines: (serverCarton.lines || []).length > 0
      ? serverCarton.lines.map((l) => ({ id: l.id, description: l.description || '', unit: l.unit || 'PCS', qty: l.qty ?? '' }))
      : [blankCartonLine()],
  };
}

// Blank carton_no / blank line description rows are dropped server-side
// (export-document.repository.js syncCartons) — mirrors that here so the
// payload matches what will actually be persisted.
export function cartonToPayload(carton) {
  return {
    id: carton.id || null,
    carton_no: carton.carton_no || '',
    net_weight: carton.net_weight === '' ? null : carton.net_weight,
    gross_weight: carton.gross_weight === '' ? null : carton.gross_weight,
    dimensions: carton.dimensions || '',
    lines: (carton.lines || []).map((l) => ({
      id: l.id || null,
      description: l.description || '',
      unit: l.unit || '',
      qty: l.qty === '' ? 0 : Number(l.qty) || 0,
    })),
  };
}

// Maps a document_checklist_types.code (seeded in migration 018, matching
// the original ERP's 26-item checklist) to its PDF-stub route. These 10
// endpoints are confirmed 100%-unimplemented stubs on the backend — see
// Phase 5A report — every one just echoes the document's JSON back with a
// "<Type> PDF Generation" message instead of returning a file.
export const GENERATE_ROUTES = {
  packing_list: { path: 'packing-list', hasVariant: true },
  item_summary: { path: 'item-summary', hasVariant: true },
  export_invoice: { path: 'export-invoice', hasVariant: true },
  purchase_bills: { path: 'purchase-bills', hasVariant: true },
  delivery_challan: { path: 'delivery-challan', hasVariant: false },
  vgm: { path: 'vgm', hasVariant: true },
  bl_draft: { path: 'bill-of-lading-draft', hasVariant: false },
  e_invoice: { path: 'e-invoice', hasVariant: false },
  bank_docs: { path: 'bank-docs', hasVariant: true },
  buyer_docs: { path: 'buyer-docs', hasVariant: true },
};

export function slugifyVariant(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// The backend's /storage static mount (app.js) serves public/storage/** with
// no auth — a plain relative path like "export-documents/checklist-x.pdf"
// (see the file_path fix in export-document.controller.js) becomes a working
// link once joined with the API host (stripping the trailing /api).
export function storageUrl(relativePath) {
  if (!relativePath) return null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  const host = apiUrl.replace(/\/api\/?$/, '');
  return `${host}/storage/${relativePath}`;
}
