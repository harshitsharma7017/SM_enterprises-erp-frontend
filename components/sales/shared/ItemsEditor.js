'use client';

import {
  blankItem, blankColour, blankSize, blankBomLine,
  calcItemQty, calcItemAmount, getColumnMeta, getCustomColumns, getSizeSubColumns, formatUnitOptions,
} from './itemsHelpers';

/**
 * Shared line-item editor for Inquiry and Order Confirmation forms.
 * Mirrors _item_card.blade.php — column visibility, the colour/size grid and
 * the product/BOM auto-fill are driven entirely by the selected Order Format,
 * identically for both modules. `variant` controls the few real differences:
 * Inquiry items carry their own pipeline status and a BOM sub-block; OC items
 * do not. (See original-erp Blade UI report §11.9 — this unifies what the
 * original kept as two near-duplicate implementations.)
 */
export default function ItemsEditor({
  items, onChange, format, products, suppliers, fobValues, statuses, variant, errors,
}) {
  const isInquiry = variant === 'inquiry';
  const allowMultipleColours = !!format?.allow_multiple_colours;
  const sizeSubColumns = getSizeSubColumns(format);
  const customColumns = getCustomColumns(format);

  const designCol = getColumnMeta(format, 'design_no', 'Design No. / Name');
  const productCol = getColumnMeta(format, 'product', 'Product');
  const supplierCol = getColumnMeta(format, 'supplier', 'Supplier');
  const unitCol = getColumnMeta(format, 'unit', 'Unit');
  const priceCol = getColumnMeta(format, 'price', 'Price');
  const colourCol = getColumnMeta(format, 'colour', 'Colour');

  const updateItem = (index, patch) => {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addItem = () => onChange([...items, blankItem(isInquiry ? 'draft' : undefined)]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  const handleProductChange = (index, productId) => {
    const item = items[index];
    const product = products.find((p) => String(p.id) === String(productId));
    const patch = { product_id: productId };
    if (product) {
      if (!item.unit) patch.unit = product.unit_export || product.unit_po || '';
      if (isInquiry && (!item.bom || item.bom.length === 0) && Array.isArray(product.bom) && product.bom.length > 0) {
        patch.bom = product.bom.map((b) => ({
          component_name: b.component_name,
          qty: b.qty,
          unit: b.unit || '',
          is_custom: false,
          remarks: b.remarks || '',
        }));
        patch.costingOpen = true;
      }
    }
    updateItem(index, patch);
  };

  const updateColour = (index, colourIndex, patch) => {
    const item = items[index];
    const colours = item.colours.slice();
    colours[colourIndex] = { ...colours[colourIndex], ...patch };
    updateItem(index, { colours });
  };
  const addColour = (index) => {
    const item = items[index];
    updateItem(index, { colours: [...item.colours, blankColour()] });
  };
  const removeColour = (index, colourIndex) => {
    const item = items[index];
    updateItem(index, { colours: item.colours.filter((_, i) => i !== colourIndex) });
  };

  const updateSize = (index, colourIndex, sizeIndex, patch) => {
    const item = items[index];
    const colours = item.colours.slice();
    const sizes = colours[colourIndex].sizes.slice();
    sizes[sizeIndex] = { ...sizes[sizeIndex], ...patch };
    colours[colourIndex] = { ...colours[colourIndex], sizes };
    updateItem(index, { colours });
  };
  const addSize = (index, colourIndex) => {
    const item = items[index];
    const colours = item.colours.slice();
    colours[colourIndex] = { ...colours[colourIndex], sizes: [...colours[colourIndex].sizes, blankSize()] };
    updateItem(index, { colours });
  };
  const removeSize = (index, colourIndex, sizeIndex) => {
    const item = items[index];
    const colours = item.colours.slice();
    colours[colourIndex] = { ...colours[colourIndex], sizes: colours[colourIndex].sizes.filter((_, i) => i !== sizeIndex) };
    updateItem(index, { colours });
  };

  // Fixed size-tag grid: one qty cell per format-defined tag, shared across colours.
  const setGridQty = (index, colourIndex, tag, qty) => {
    const item = items[index];
    const colours = item.colours.slice();
    const sizes = colours[colourIndex].sizes.filter((s) => s.size !== tag);
    sizes.push({ size: tag, qty });
    colours[colourIndex] = { ...colours[colourIndex], sizes };
    updateItem(index, { colours });
  };
  const gridQtyFor = (colour, tag) => {
    const row = (colour.sizes || []).find((s) => s.size === tag);
    return row ? row.qty : '';
  };

  const updateBom = (index, bomIndex, patch) => {
    const item = items[index];
    const bom = item.bom.slice();
    bom[bomIndex] = { ...bom[bomIndex], ...patch };
    updateItem(index, { bom });
  };
  const addBom = (index) => updateItem(index, { bom: [...items[index].bom, blankBomLine()] });
  const removeBom = (index, bomIndex) => updateItem(index, { bom: items[index].bom.filter((_, i) => i !== bomIndex) });

  const updateCustom = (index, key, value) => {
    const item = items[index];
    updateItem(index, { custom: { ...item.custom, [key]: value } });
  };

  const itemsError = errors?.items;

  return (
    <div className="space-y-4">
      {itemsError && (
        <div className="text-sm text-red-600 mb-2">{Array.isArray(itemsError) ? itemsError[0] : itemsError}</div>
      )}

      {items.map((item, index) => {
        const qty = calcItemQty(item);
        const amount = calcItemAmount(item);
        const unitOptions = formatUnitOptions(format, item.unit);

        return (
          <div key={item._key || item.id} className="bg-white border rounded shadow-sm">
            <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-700">Item #{index + 1}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600">Qty {qty}</span>
                {isInquiry ? (
                  <span className="badge rounded-full bg-blue-600 text-white px-2 py-0.5 text-xs">Amt {amount.toFixed(2)}</span>
                ) : null}
                {isInquiry && (
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(index, { status: e.target.value })}
                    className="form-select rounded border-gray-300 text-xs py-1"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 px-1" title="Remove item">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {designCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{designCol.label}{designCol.mandatory && <span className="text-red-500"> *</span>}</label>
                    <input type="text" maxLength={150} value={item.design_no} onChange={(e) => updateItem(index, { design_no: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                  </div>
                )}
                {productCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{productCol.label}{productCol.mandatory && <span className="text-red-500"> *</span>}</label>
                    <select value={item.product_id} onChange={(e) => handleProductChange(index, e.target.value)} className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.text}</option>)}
                    </select>
                  </div>
                )}
                {supplierCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{supplierCol.label}{supplierCol.mandatory && <span className="text-red-500"> *</span>}</label>
                    <select value={item.supplier_id} onChange={(e) => updateItem(index, { supplier_id: e.target.value })} className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}
                    </select>
                  </div>
                )}
                {unitCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{unitCol.label}{unitCol.mandatory && <span className="text-red-500"> *</span>}</label>
                    <select value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select —</option>
                      {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input type="text" maxLength={2000} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                </div>
                {priceCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {priceCol.label}{item.unit ? ` / ${item.unit}` : ''}{priceCol.mandatory && <span className="text-red-500"> *</span>}
                    </label>
                    <input type="number" step="0.01" min="0" value={item.price} onChange={(e) => updateItem(index, { price: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                  </div>
                )}
              </div>

              {customColumns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {customColumns.map((col) => (
                    <div key={col.key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{col.label}{col.is_mandatory && <span className="text-red-500"> *</span>}</label>
                      <input type="text" maxLength={255} value={item.custom[col.key] || ''} onChange={(e) => updateCustom(index, col.key, e.target.value)} className="form-input w-full rounded border-gray-300 text-sm" />
                    </div>
                  ))}
                </div>
              )}

              {/* Costing (collapsible) */}
              <div className="border-t pt-3">
                <button type="button" onClick={() => updateItem(index, { costingOpen: !item.costingOpen })} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <i className={`bi ${item.costingOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i> Costing
                </button>
                {item.costingOpen && (
                  <div className="mt-3 space-y-3 bg-gray-50 border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">FOB Value</label>
                        <select value={item.fob_value_id} onChange={(e) => updateItem(index, { fob_value_id: e.target.value })} className="form-select w-full rounded border-gray-300 text-sm">
                          <option value="">— Select —</option>
                          {fobValues.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price / Unit</label>
                        <input type="number" step="0.01" min="0" value={item.cost_price} onChange={(e) => updateItem(index, { cost_price: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                        <p className="text-[11px] text-gray-500 mt-0.5">Internal — not shown to buyer</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Item Remarks</label>
                        <input type="text" maxLength={500} value={item.remarks} onChange={(e) => updateItem(index, { remarks: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                      </div>
                    </div>

                    {isInquiry && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">BOM — components per finished piece</span>
                          <button type="button" onClick={() => addBom(index)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100">
                            <i className="bi bi-plus-lg"></i> Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {item.bom.map((b, bomIndex) => (
                            <div key={bomIndex} className="flex gap-2 items-center">
                              <input type="text" placeholder="Component" maxLength={200} value={b.component_name} onChange={(e) => updateBom(index, bomIndex, { component_name: e.target.value })} className="form-input flex-1 rounded border-gray-300 text-xs" />
                              <input type="number" step="0.0001" placeholder="Qty/pc" value={b.qty} onChange={(e) => updateBom(index, bomIndex, { qty: e.target.value })} className="form-input w-24 rounded border-gray-300 text-xs" />
                              <input type="text" placeholder="Unit" maxLength={20} value={b.unit} onChange={(e) => updateBom(index, bomIndex, { unit: e.target.value })} className="form-input w-24 rounded border-gray-300 text-xs" />
                              <input type="text" placeholder="Remarks" maxLength={500} value={b.remarks} onChange={(e) => updateBom(index, bomIndex, { remarks: e.target.value })} className="form-input flex-1 rounded border-gray-300 text-xs" />
                              <button type="button" onClick={() => removeBom(index, bomIndex)} className="text-red-500 hover:text-red-700 px-1"><i className="bi bi-x-circle"></i></button>
                            </div>
                          ))}
                          {item.bom.length === 0 && <p className="text-xs text-gray-400">No BOM lines.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Colours / Sizes */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Colours &amp; Sizes</span>
                  {allowMultipleColours && (
                    <button type="button" onClick={() => addColour(index)} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100">
                      <i className="bi bi-plus-lg"></i> Add colour
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {item.colours.map((colour, colourIndex) => {
                    const colourQty = colour.sizes.reduce((sum, s) => sum + (parseInt(s.qty, 10) || 0), 0);
                    return (
                      <div key={colourIndex} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {allowMultipleColours && colourCol.enabled && (
                            <input type="text" placeholder="Colour" maxLength={60} value={colour.colour} onChange={(e) => updateColour(index, colourIndex, { colour: e.target.value })} className="form-input rounded border-gray-300 text-xs w-40" />
                          )}
                          <span className="badge rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600">Qty {colourQty}</span>
                          {allowMultipleColours && item.colours.length > 1 && (
                            <button type="button" onClick={() => removeColour(index, colourIndex)} className="text-red-500 hover:text-red-700 px-1 text-xs"><i className="bi bi-trash"></i></button>
                          )}
                        </div>

                        {sizeSubColumns ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {sizeSubColumns.map((tag) => (
                              <div key={tag}>
                                <label className="block text-[11px] text-gray-500 mb-0.5">{tag}</label>
                                <input type="number" min="0" value={gridQtyFor(colour, tag)} onChange={(e) => setGridQty(index, colourIndex, tag, e.target.value)} className="form-input w-full rounded border-gray-300 text-xs" style={{ background: '#f4f6fd' }} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {colour.sizes.map((size, sizeIndex) => (
                              <div key={sizeIndex} className="flex gap-2 items-center">
                                <input type="text" placeholder="Size" maxLength={20} value={size.size} onChange={(e) => updateSize(index, colourIndex, sizeIndex, { size: e.target.value })} className="form-input w-28 rounded border-gray-300 text-xs" />
                                <input type="number" min="0" placeholder="Qty" value={size.qty} onChange={(e) => updateSize(index, colourIndex, sizeIndex, { qty: e.target.value })} className="form-input w-24 rounded border-gray-300 text-xs" />
                                <button type="button" onClick={() => removeSize(index, colourIndex, sizeIndex)} className="text-red-500 hover:text-red-700 px-1"><i className="bi bi-x-circle"></i></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addSize(index, colourIndex)} className="text-xs text-blue-600 hover:text-blue-800">
                              <i className="bi bi-plus-lg"></i> Add size
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addItem} className="w-full border-2 border-dashed border-gray-300 rounded py-2.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600">
        <i className="bi bi-plus-lg me-1"></i> Add Item
      </button>
    </div>
  );
}
