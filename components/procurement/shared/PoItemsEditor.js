'use client';

import {
  blankPoItem, blankColour, blankSize,
  calcItemQty, calcPoItemAmount, getColumnMeta, getSizeSubColumns, formatUnitOptions,
} from '@/components/sales/shared/itemsHelpers';

/**
 * Purchase Order line-item editor. Reuses the same Order Format-driven
 * column visibility and colour/size grid mechanism as Inquiry/OC's
 * ItemsEditor, but PO items are a smaller shape — one supplier per PO (not
 * per item), no FOB, no item status, no BOM, and no Order Format custom
 * columns (the original ERP's own PO form has no UI for these despite the
 * DB column existing — see Phase 4B report §12.4, matched here deliberately).
 */
export default function PoItemsEditor({ items, onChange, format, products }) {
  const allowMultipleColours = !!format?.allow_multiple_colours;
  const sizeSubColumns = getSizeSubColumns(format);

  const designCol = getColumnMeta(format, 'design_no', 'Design No. / Name');
  const productCol = getColumnMeta(format, 'product', 'Product');
  const unitCol = getColumnMeta(format, 'unit', 'Unit');
  const priceCol = getColumnMeta(format, 'price', 'Price');
  const colourCol = getColumnMeta(format, 'colour', 'Colour');

  const updateItem = (index, patch) => {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addItem = () => onChange([...items, blankPoItem()]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  const updateColour = (index, colourIndex, patch) => {
    const item = items[index];
    const colours = item.colours.slice();
    colours[colourIndex] = { ...colours[colourIndex], ...patch };
    updateItem(index, { colours });
  };
  const addColour = (index) => updateItem(index, { colours: [...items[index].colours, blankColour()] });
  const removeColour = (index, colourIndex) => updateItem(index, { colours: items[index].colours.filter((_, i) => i !== colourIndex) });

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

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const qty = calcItemQty(item);
        const amount = calcPoItemAmount(item);
        const unitOptions = formatUnitOptions(format, item.unit);

        return (
          <div key={item._key || item.id} className="bg-white border rounded shadow-sm">
            <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-700">Item #{index + 1}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge rounded-full border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-600">Qty {qty}</span>
                <span className="badge rounded-full bg-blue-600 text-white px-2 py-0.5 text-xs">Amt {amount.toFixed(2)}</span>
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
                    <select value={item.product_id} onChange={(e) => updateItem(index, { product_id: e.target.value })} className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.text}</option>)}
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
                {priceCol.enabled && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ₹ / Unit{item.unit ? ` (${item.unit})` : ''}{priceCol.mandatory && <span className="text-red-500"> *</span>}
                    </label>
                    <input type="number" step="0.01" min="0" value={item.cost_price} onChange={(e) => updateItem(index, { cost_price: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input type="text" maxLength={1000} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                  <input type="text" maxLength={1000} value={item.remarks} onChange={(e) => updateItem(index, { remarks: e.target.value })} className="form-input w-full rounded border-gray-300 text-sm" />
                </div>
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
