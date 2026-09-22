// Shared helpers for Inquiry / Order Confirmation line items — both modules
// use the same Order Format-driven column visibility, colour/size grid and
// qty/amount calculation. Mirrors applyColumnsToItem()/recalcItem() in the
// original ERP's sales/*/​_form.blade.php.

let keySeq = 0;
export function nextClientKey() {
  keySeq += 1;
  return `new_${Date.now()}_${keySeq}`;
}

export function blankSize() {
  return { size: '', qty: '' };
}

export function blankColour() {
  return { colour: '', sizes: [blankSize()] };
}

export function blankBomLine() {
  return { component_name: '', qty: 1, unit: '', is_custom: true, remarks: '' };
}

export function blankItem(defaultStatus) {
  return {
    _key: nextClientKey(),
    design_no: '',
    description: '',
    product_id: '',
    supplier_id: '',
    unit: '',
    fob_value_id: '',
    price: '',
    cost_price: '',
    status: defaultStatus || 'draft',
    remarks: '',
    custom: {},
    colours: [blankColour()],
    bom: [],
    costingOpen: false,
  };
}

// Server item (from GET /inquiries/:id or /sales/order-confirmations/:id) -> client item shape.
export function itemFromServer(serverItem, defaultStatus) {
  const colours = Array.isArray(serverItem.colours) && serverItem.colours.length > 0
    ? serverItem.colours.map((c) => ({
        colour: c.colour || '',
        sizes: Array.isArray(c.sizes) && c.sizes.length > 0
          ? c.sizes.map((s) => ({ size: s.size || '', qty: s.qty ?? '' }))
          : [blankSize()],
      }))
    : [blankColour()];

  const bomSource = Array.isArray(serverItem.bom_lines) ? serverItem.bom_lines : [];

  return {
    _key: nextClientKey(),
    id: serverItem.id,
    design_no: serverItem.design_no || '',
    description: serverItem.description || '',
    product_id: serverItem.product_id || '',
    supplier_id: serverItem.supplier_id || '',
    unit: serverItem.unit || '',
    fob_value_id: serverItem.fob_value_id || '',
    price: serverItem.price ?? '',
    cost_price: serverItem.cost_price ?? '',
    status: serverItem.status || defaultStatus || 'draft',
    remarks: serverItem.remarks || '',
    custom: serverItem.custom_values && typeof serverItem.custom_values === 'object' ? serverItem.custom_values : {},
    colours,
    bom: bomSource.map((b) => ({
      component_name: b.component_name || '',
      qty: b.qty ?? 1,
      unit: b.unit || '',
      is_custom: !!b.is_custom,
      remarks: b.remarks || '',
    })),
    costingOpen: bomSource.length > 0 || colours.some((c) => c.sizes.some((s) => Number(s.qty) > 0)),
  };
}

// Client item -> API payload shape (strips UI-only fields).
export function itemToPayload(item) {
  return {
    design_no: item.design_no || '',
    description: item.description || '',
    product_id: item.product_id || null,
    supplier_id: item.supplier_id || null,
    unit: item.unit || '',
    fob_value_id: item.fob_value_id || null,
    price: item.price === '' ? null : item.price,
    cost_price: item.cost_price === '' ? null : item.cost_price,
    status: item.status || 'draft',
    remarks: item.remarks || '',
    custom: item.custom || {},
    colours: (item.colours || []).map((c) => ({
      colour: c.colour || '',
      sizes: (c.sizes || []).map((s) => ({ size: s.size || '', qty: s.qty === '' ? 0 : Number(s.qty) || 0 })),
    })),
    bom: (item.bom || [])
      .filter((b) => (b.component_name || '').trim() !== '')
      .map((b) => ({
        component_name: b.component_name,
        qty: b.qty === '' ? 1 : Number(b.qty) || 1,
        unit: b.unit || '',
        is_custom: !!b.is_custom,
        remarks: b.remarks || '',
      })),
  };
}

export function calcItemQty(item) {
  let qty = 0;
  for (const colour of item.colours || []) {
    for (const size of colour.sizes || []) {
      qty += parseInt(size.qty, 10) || 0;
    }
  }
  return qty;
}

export function calcItemAmount(item) {
  const qty = calcItemQty(item);
  const price = parseFloat(item.price) || 0;
  return Math.round(qty * price * 100) / 100;
}

// STANDARD_COLUMNS keys (order-format.service.js): supplier, design_no, product,
// colour, size, unit, price, image (image is print_only, never shown on-screen).
export function getColumnMeta(format, key, defaultLabel) {
  const col = format && Array.isArray(format.columns) ? format.columns.find((c) => c.key === key) : null;
  if (!col) return { enabled: true, label: defaultLabel, mandatory: false };
  return { enabled: col.is_enabled !== false, label: col.label || defaultLabel, mandatory: !!col.is_mandatory };
}

export function getCustomColumns(format) {
  if (!format || !Array.isArray(format.columns)) return [];
  return format.columns.filter((c) => c.is_custom && c.is_enabled);
}

export function getSizeSubColumns(format) {
  const sizeCol = format && Array.isArray(format.columns) ? format.columns.find((c) => c.key === 'size') : null;
  return sizeCol && Array.isArray(sizeCol.sub_columns) && sizeCol.sub_columns.length > 0 ? sizeCol.sub_columns : null;
}

export function formatUnitOptions(format, currentUnit) {
  const names = Array.isArray(format?.units) ? format.units.map((u) => u.name) : [];
  const set = new Set(names);
  if (currentUnit && !set.has(currentUnit)) set.add(currentUnit);
  return Array.from(set);
}

// -- Purchase Order items: a materially smaller shape than Inquiry/OC items —
// no per-item supplier (the whole PO has one supplier), no FOB value, no
// item-level status, no BOM, and a single `cost_price` field (not a
// price/cost_price pair). The original ERP's PO form also has no UI for
// Order Format custom columns despite the column existing in the schema
// (see Phase 4B report §12.4) — matched here by simply not collecting `custom`.

export function blankPoItem() {
  return {
    _key: nextClientKey(),
    design_no: '',
    description: '',
    product_id: '',
    unit: '',
    cost_price: '',
    remarks: '',
    colours: [blankColour()],
  };
}

export function poItemFromServer(serverItem) {
  const colours = Array.isArray(serverItem.colours) && serverItem.colours.length > 0
    ? serverItem.colours.map((c) => ({
        colour: c.colour || '',
        sizes: Array.isArray(c.sizes) && c.sizes.length > 0
          ? c.sizes.map((s) => ({ size: s.size || '', qty: s.qty ?? '' }))
          : [blankSize()],
      }))
    : [blankColour()];

  return {
    _key: nextClientKey(),
    id: serverItem.id,
    order_confirmation_item_id: serverItem.order_confirmation_item_id || null,
    design_no: serverItem.design_no || '',
    description: serverItem.description || '',
    product_id: serverItem.product_id || '',
    unit: serverItem.unit || '',
    cost_price: serverItem.cost_price ?? '',
    remarks: serverItem.remarks || '',
    colours,
  };
}

export function poItemToPayload(item) {
  return {
    design_no: item.design_no || '',
    description: item.description || '',
    product_id: item.product_id || null,
    unit: item.unit || '',
    cost_price: item.cost_price === '' ? null : item.cost_price,
    remarks: item.remarks || '',
    colours: (item.colours || []).map((c) => ({
      colour: c.colour || '',
      sizes: (c.sizes || []).map((s) => ({ size: s.size || '', qty: s.qty === '' ? 0 : Number(s.qty) || 0 })),
    })),
  };
}

export function calcPoItemAmount(item) {
  const qty = calcItemQty(item);
  const cost = parseFloat(item.cost_price) || 0;
  return Math.round(qty * cost * 100) / 100;
}
