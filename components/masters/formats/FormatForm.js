'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';
import DashboardLayout from '../../layout/DashboardLayout';
import FormSection from '../../ui/FormSection';

export default function FormatForm({ formatId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!formatId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    allow_multiple_colours: false,
    delivery_details: '',
    packing_details: ''
  });

  const [units, setUnits] = useState([]);
  const [unitInput, setUnitInput] = useState('');

  const [columns, setColumns] = useState([]);
  const [customSeq, setCustomSeq] = useState(0);

  const [existingImages, setExistingImages] = useState([]);
  const [keepImages, setKeepImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);



  const fetchFormat = async () => {
    try {
      const res = await apiClient.get(`/masters/formats/${formatId}`);
      const f = res.data?.format || res.data.data?.format || res.data;
      setFormData({
        name: f.name || '',
        description: f.description || '',
        status: f.status || 'active',
        allow_multiple_colours: !!f.allow_multiple_colours,
        delivery_details: f.delivery_details || '',
        packing_details: f.packing_details || ''
      });
      setUnits(f.units || []);
      if (f.columns) setColumns(Array.isArray(f.columns) ? f.columns : Object.values(f.columns));
      if (f.images) {
        setExistingImages(f.images);
        setKeepImages(f.images.map(img => img.id));
      }
    } catch (e) {
      setError('Failed to load format: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaults = async () => {
    try {
      const res = await apiClient.get('/masters/formats/defaults');
      // res.data could be { data: { columns, units } } or just { columns, units }
      const payload = res.data?.data || res.data;
      const rawCols = payload.columns || {};
      
      const colsArray = Array.isArray(rawCols) ? rawCols : Object.entries(rawCols).map(([key, val]) => ({
        key,
        label: val.label || '',
        is_enabled: val.enabled ?? val.is_enabled ?? true,
        is_mandatory: val.mandatory ?? val.is_mandatory ?? false,
        is_custom: false,
        print_only: val.print_only ?? false,
        sub_columns: val.sub_columns || []
      }));
      
      setColumns(colsArray);
      setUnits(payload.units || []);
    } catch (e) {
      setError('Failed to load defaults: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      if (formatId) {
        fetchFormat();
      } else {
        fetchDefaults();
      }
    });
  }, [formatId]);

const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addUnit = () => {
    const val = unitInput.trim().toUpperCase();
    if (val && !units.includes(val)) {
      setUnits([...units, val]);
    }
    setUnitInput('');
  };

  const removeUnit = (u) => {
    setUnits(units.filter(x => x !== u));
  };

  const addCustomColumn = () => {
    const key = `new_${customSeq + 1}_${Date.now()}`;
    setCustomSeq(s => s + 1);
    setColumns([...columns, {
      key,
      label: '',
      is_enabled: true,
      is_mandatory: false,
      is_custom: true,
      print_only: false,
      sub_columns: []
    }]);
  };

  const updateColumn = (idx, field, value) => {
    const newCols = [...columns];
    newCols[idx] = { ...newCols[idx], [field]: value };
    setColumns(newCols);
  };

  const removeColumn = (idx) => {
    const newCols = [...columns];
    newCols.splice(idx, 1);
    setColumns(newCols);
  };

  const addSubColumn = (idx, val) => {
    const tags = val.split(/[,-]/).map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tags.length) return;
    const newCols = [...columns];
    const col = newCols[idx];
    const current = col.sub_columns || [];
    const added = tags.filter(t => !current.includes(t));
    if (added.length) {
      col.sub_columns = [...current, ...added];
      setColumns(newCols);
    }
  };

  const removeSubColumn = (idx, tagToRemove) => {
    const newCols = [...columns];
    newCols[idx].sub_columns = newCols[idx].sub_columns.filter(t => t !== tagToRemove);
    setColumns(newCols);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires some data to be set
    e.dataTransfer.setData('text/plain', idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDragOverIdx(idx);
    setDragOverPosition(before ? 'top' : 'bottom');
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
    setDragOverPosition(null);
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    
    const newCols = [...columns];
    const [moved] = newCols.splice(draggedIdx, 1);
    
    // Adjust target index because we removed one item
    let targetIdx = idx;
    if (draggedIdx < idx) targetIdx--;
    
    if (!before) targetIdx++;
    
    newCols.splice(targetIdx, 0, moved);
    setColumns(newCols);
    
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDragOverPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDragOverPosition(null);
  };

  const handleImageChange = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  const toggleKeepImage = (id) => {
    if (keepImages.includes(id)) {
      setKeepImages(keepImages.filter(x => x !== id));
    } else {
      setKeepImages([...keepImages, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description || '');
      formDataObj.append('status', formData.status);
      formDataObj.append('allow_multiple_colours', formData.allow_multiple_colours ? '1' : '0');
      formDataObj.append('delivery_details', formData.delivery_details || '');
      formDataObj.append('packing_details', formData.packing_details || '');

      formDataObj.append('units', JSON.stringify(units));

      const columnsObj = {};
      columns.forEach(c => {
        columnsObj[c.key] = {
          label: c.label || '',
          enabled: c.is_enabled,
          mandatory: c.is_mandatory,
          sub_columns: (c.sub_columns || []).join(',')
        };
      });

      formDataObj.append('columns', JSON.stringify(columnsObj));
      formDataObj.append('column_order', JSON.stringify(columns.map(c => c.key)));

      if (formatId) {
        formDataObj.append('keep_images', JSON.stringify(keepImages));
      }

      newImages.forEach(img => {
        formDataObj.append('images', img);
      });

      if (formatId) {
        await apiClient.put(`/masters/formats/${formatId}`, formDataObj);
      } else {
        await apiClient.post('/masters/formats', formDataObj);
      }

      router.push('/masters/formats');
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
      setSubmitting(false);
    }
  };

  const generatePreviewCols = () => {
    const unit = units[0] || null;
    const cols = [{ key: 'sr_no', label: 'Sr. No.', printOnly: false }];
    let sizeTags = [];

    columns.forEach(col => {
      if (!col.is_enabled) return;
      let label = (col.label || col.key).trim();
      if (col.key === 'price' && unit) label += ' / ' + unit;
      if (col.is_mandatory) label += ' *';

      if (col.key === 'size') {
        sizeTags = col.sub_columns || [];
        if (sizeTags.length > 0) {
          sizeTags.forEach(tag => cols.push({ key: 'size_tag', tag, label: tag, printOnly: false }));
          cols.push({ key: 'size_total', label: col.is_mandatory ? 'Total *' : 'Total', printOnly: false });
          return;
        }
      }

      cols.push({ key: col.key, label, printOnly: col.key === 'image' || col.print_only });

      if (col.key === 'unit' && sizeTags.length === 0) {
        cols.push({ key: 'qty', label: 'Qty', printOnly: false });
      }
    });

    cols.push({ key: 'amount', label: 'Amount', printOnly: false });
    return { cols, sizeTags };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12 text-gray-500">Loading format...</div>
      </DashboardLayout>
    );
  }

  const { cols: previewCols, sizeTags } = generatePreviewCols();
  const sampleData = [
    { design_no: 'NS-101', product: 'LADIES EMBROIDERED KURTI', qty: 120, price: 450 },
    { design_no: 'NS-102', product: 'GENTS COTTON SHIRT', qty: 80, price: 350 },
  ];

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">
          {formatId ? 'Edit Order Format' : 'Add Order Format'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          
          <div className="p-6 space-y-2">
            {/* Identity */}
            <FormSection title="Format Identity" icon="bi-file-earmark-ruled" subtitle="Linked to categories from the Category Master; used by Purchase Orders.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Format Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Format 4 — Colour × Size Grid" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Notes</label>
                  <textarea name="description" rows="2" value={formData.description} onChange={handleChange} placeholder="Which categories use this format, any special notes…" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                  <select name="status" required value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Multiple colour rows per item</label>
                  <div className="flex items-center mt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="allow_multiple_colours" checked={formData.allow_multiple_colours} onChange={handleChange} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm text-gray-700">
                        {formData.allow_multiple_colours ? 'On — several colour rows per item' : 'Off — one colour per item row'}
                      </span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">When on, each item row in Inquiry / OC / PO gets a <strong>+ Add colour</strong> button.</p>
                </div>
              </div>
            </FormSection>

            {/* Units */}
            <FormSection title="Units" icon="bi-rulers" subtitle="Shared across PO, OC, Item Summary, Export Docs, Debit Note and Agent Commission.">
              <p className="text-xs text-gray-500 mb-2">The selected unit in a PO row auto-populates the label in the Price column header (e.g. <span className="font-mono">Price / PCS</span>).</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {units.map(u => (
                  <span key={u} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm font-medium">
                    {u}
                    <button type="button" onClick={() => removeUnit(u)} className="ml-1 text-blue-600 hover:text-blue-900 focus:outline-none">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <input type="text" value={unitInput} onChange={e => setUnitInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUnit())} placeholder="Add unit (e.g. DOZEN, BOX, KGS)" maxLength="20" className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                <button type="button" onClick={addUnit} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm whitespace-nowrap">
                  <i className="bi bi-plus-lg mr-1"></i>Add Unit
                </button>
              </div>
            </FormSection>

            {/* Item Table Columns */}
            <FormSection title="Item Table Columns" icon="bi-layout-three-columns" subtitle="Untick a column to drop it, mark it mandatory, or drag rows to reorder the item table.">
              <p className="text-xs text-gray-500 mb-3">Sr. No., Qty and Amount are always drawn — a row without them is not an order line. Give <strong>Size</strong> sub-columns (e.g. S, M, L, XL) to turn every item row&apos;s size entry into a fixed qty-per-size grid instead of free-form colour/size rows.</p>
              
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="w-8 px-2 py-2"></th>
                      <th className="w-20 px-3 py-2 font-medium">Include</th>
                      <th className="w-24 px-3 py-2 font-medium">Mandatory</th>
                      <th className="w-56 px-3 py-2 font-medium">Column</th>
                      <th className="px-3 py-2 font-medium">Sub-columns</th>
                      <th className="w-28 px-3 py-2 font-medium">Visibility</th>
                      <th className="w-12 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {columns.map((col, idx) => (
                      <tr 
                        key={col.key} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`${!col.is_enabled ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'} ${draggedIdx === idx ? 'opacity-30' : ''} ${dragOverIdx === idx ? (dragOverPosition === 'top' ? 'border-t-2 border-blue-500' : 'border-b-2 border-blue-500') : ''}`}
                      >
                        <td className="px-2 py-2 text-center text-gray-400 cursor-move">
                          <i className="bi bi-grip-vertical"></i>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={col.is_enabled} disabled={!col.is_custom && (col.key === 'product' || col.key === 'qty' || col.key === 'amount')} onChange={e => updateColumn(idx, 'is_enabled', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={col.is_mandatory} onChange={e => updateColumn(idx, 'is_mandatory', e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="px-3 py-2">
                          {col.is_custom || col.key === 'size' ? (
                            <input type="text" value={col.label || ''} onChange={e => updateColumn(idx, 'label', e.target.value)} placeholder={col.is_custom ? 'Custom label' : 'Size Label'} className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                          ) : (
                            <span className="font-medium text-gray-800">{col.label || col.key}</span>
                          )}
                          {!col.is_custom && <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">Standard</div>}
                        </td>
                        <td className="px-3 py-2">
                          {(col.key === 'size' || col.is_custom) && col.is_enabled ? (
                            <div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {(col.sub_columns || []).map(tag => (
                                  <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                    {tag}
                                    <button type="button" onClick={() => removeSubColumn(idx, tag)} className="ml-1 text-gray-400 hover:text-gray-600">&times;</button>
                                  </span>
                                ))}
                              </div>
                              <input type="text" placeholder="Add (e.g. S,M,L or 28,30)" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubColumn(idx, e.target.value), e.target.value='')} className="w-full max-w-[200px] px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {col.print_only ? 'Print / PDF only' : 'Screen & Print'}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {col.is_custom && (
                            <button type="button" onClick={() => removeColumn(idx)} className="text-gray-400 hover:text-red-500" title="Remove custom column">
                              <i className="bi bi-x-lg"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center">
                <button type="button" onClick={addCustomColumn} className="px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded text-sm flex items-center bg-white shadow-sm">
                  <i className="bi bi-plus-lg mr-1"></i>Add custom column
                </button>
                <span className="text-xs text-gray-500 ml-3">← Drag the handle to reorder &middot; standard columns can&apos;t be removed, only hidden</span>
              </div>
            </FormSection>

            {/* Live Preview */}
            <FormSection title="Live Table Preview" icon="bi-table" subtitle="The exact table structure as it appears in Inquiry → OC → PO.">
              <p className="text-xs text-gray-500 mb-2">Sample data. The image column is hidden on screen and visible on print / PDF only. A red <span className="text-red-500">*</span> marks a mandatory column.</p>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      {previewCols.map((c, i) => (
                        <th key={i} className={`px-3 py-2 font-medium ${c.printOnly ? 'text-gray-400 italic' : ''}`} title={c.printOnly ? 'Hidden on screen' : ''}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {sampleData.map((row, i) => {
                      let qtyLeft = row.qty;
                      return (
                        <tr key={i}>
                          {previewCols.map((c, j) => {
                            let content = '—';
                            let align = 'left';
                            
                            switch (c.key) {
                              case 'sr_no': content = i + 1; break;
                              case 'design_no': content = row.design_no; break;
                              case 'product': content = row.product; break;
                              case 'qty': content = row.qty; break;
                              case 'unit': content = units[0] || '—'; break;
                              case 'price': content = `₹${row.price.toFixed(2)}`; break;
                              case 'amount': content = `₹${(row.qty * row.price).toFixed(2)}`; break;
                              case 'image': content = <i className="bi bi-image text-gray-400"></i>; align = 'center'; break;
                              case 'size_tag': 
                                const share = Math.round(row.qty / (sizeTags.length || 1));
                                const isLastTag = j === previewCols.length - 2; // Rough check
                                const val = (sizeTags[sizeTags.length - 1] === c.tag) ? qtyLeft : share;
                                qtyLeft -= val;
                                content = val;
                                align = 'center';
                                break;
                              case 'size_total': 
                                content = <span className="font-semibold">{row.qty}</span>; 
                                align = 'center';
                                break;
                            }
                            
                            return (
                              <td key={j} className={`px-3 py-2 ${align === 'center' ? 'text-center' : ''} ${c.printOnly ? 'text-center' : ''}`}>
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </FormSection>

            {/* Delivery & Packing */}
            <FormSection title="Delivery & Packing Details" icon="bi-box-seam" subtitle="Printed at the bottom of every PO using this format. Pre-fills when a PO is created — editable per PO.">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Details</label>
                  <textarea name="delivery_details" rows="3" value={formData.delivery_details} onChange={handleChange} placeholder="e.g. Delivery within 30 days from PO date." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Packing Details</label>
                  <textarea name="packing_details" rows="3" value={formData.packing_details} onChange={handleChange} placeholder="e.g. Each piece in individual poly bag." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                
                <div className="mt-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Reference Images <span className="font-normal text-gray-500">— shown on print / PDF / Excel export only</span>
                  </label>
                  
                  {existingImages.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                      {existingImages.map(img => (
                        <div key={img.id} className="relative inline-block border border-gray-300 bg-white p-1 rounded">
                          <img src={img.url} alt={img.original_name} className="h-20 w-auto object-contain" />
                          <label className="flex items-center mt-1 text-xs justify-center cursor-pointer">
                            <input type="checkbox" checked={keepImages.includes(img.id)} onChange={() => toggleKeepImage(img.id)} className="mr-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            Keep
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md shadow-sm" />
                  <p className="mt-1 text-xs text-gray-500">Packing diagrams &middot; label samples &middot; marking references. JPG, PNG or WebP, up to 4 MB each.</p>
                </div>
              </div>
            </FormSection>

            {/* Module Connections */}
            <FormSection title="Module Connections" icon="bi-diagram-3" subtitle="This format feeds into the following modules.">
              <div className="flex flex-wrap gap-2">
                {['Inquiries', 'Order Confirmations', 'Purchase Orders', 'Export Documents', 'Debit Notes'].map(m => (
                  <span key={m} className="px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm">
                    {m}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">The unit list defined here is shared across all modules above.</p>
            </FormSection>

          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-200">
            <button type="submit" disabled={submitting} className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <i className="bi bi-check-lg mr-1"></i> {formatId ? 'Update' : 'Save'} Format
            </button>
            <button type="button" onClick={() => router.push('/masters/formats')} className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Cancel
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
