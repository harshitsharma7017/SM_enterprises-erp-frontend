'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import { apiClient } from '@/lib/api-client';

export default function MarkupForm({ markupId = null }) {
  const router = useRouter();
  const isEdit = !!markupId;

  const [suppliers, setSuppliers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [defaultMarkups, setDefaultMarkups] = useState([]);
  const [defaultMarkupPercents, setDefaultMarkupPercents] = useState({});
  const [discounts, setDiscounts] = useState({});
  const [supplierAgentCommissions, setSupplierAgentCommissions] = useState({});
  const [buyerAgentCommissions, setBuyerAgentCommissions] = useState({});

  const [formData, setFormData] = useState({
    supplier_id: '',
    buyer_id: '',
    default_markup_id: '',
    markup_percent: '',
    status: 'active',
    remarks: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);

  const updatePreview = (suppId, pctStr, discountsObj = discounts) => {
    const costPrice = 100.0;
    const discount = parseFloat(discountsObj[suppId]) || 0;
    const pct = parseFloat(pctStr) || 0;
    const clientPrice = Math.round(costPrice * (1 + pct / 100) * 100) / 100;
    const ourCost = Math.round(costPrice * (1 - discount / 100) * 100) / 100;
    const profit = Math.round((clientPrice - ourCost) * 100) / 100;
    setPreview({ cost: costPrice, discount, client_price: clientPrice, our_cost: ourCost, profit });
  };

  useEffect(() => {
    async function fetchForm() {
      try {
        const url = isEdit ? `/masters/markups/${markupId}/edit` : `/masters/markups/create`;
        const res = await apiClient.get(url);
        if (res.success && res.data) {
          const d = res.data;
          setSuppliers(d.suppliers || []);
          setBuyers(d.buyers || []);
          setDefaultMarkups(d.defaultMarkups || []);
          setDefaultMarkupPercents(d.defaultMarkupPercents || {});
          setDiscounts(d.discounts || {});
          setSupplierAgentCommissions(d.supplierAgentCommissions || {});
          setBuyerAgentCommissions(d.buyerAgentCommissions || {});

          if (isEdit && d.markup) {
            const m = d.markup;
            setFormData({
              supplier_id: m.supplier_id || '',
              buyer_id: m.buyer_id || '',
              default_markup_id: '',
              markup_percent: m.markup_percent || '',
              status: m.status || 'active',
              remarks: m.remarks || ''
            });
            updatePreview(m.supplier_id, m.markup_percent, d.discounts || {});
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchForm();
  }, [markupId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      if (name === 'default_markup_id' && value) {
        const pct = defaultMarkupPercents[value];
        if (pct !== undefined) {
          next.markup_percent = pct;
        }
      }
      
      if (name === 'supplier_id' || name === 'markup_percent' || (name === 'default_markup_id' && value)) {
        updatePreview(next.supplier_id, next.markup_percent);
      }
      
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      if (isEdit) {
        await apiClient.put(`/masters/markups/${markupId}`, formData);
      } else {
        await apiClient.post('/masters/markups', formData);
      }
      router.push('/masters/markups');
    } catch (err) {
      const errs = err.data?.errors || [];
      if (errs.length > 0) setErrors(errs);
      else alert(err.data?.message || err.message || 'Error saving markup');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading form data…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">
          {isEdit ? 'Edit Markup Rule' : 'Add Markup Rule'}
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-white border rounded shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-diagram-2 text-gray-500"></i>
                <h3 className="text-base font-semibold">Party Pairing</h3>
              </div>
              <div className="p-4 space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Supplier <span className="text-red-500">*</span></label>
                  <div className="md:col-span-3">
                    <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} required className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select Supplier —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {formData.supplier_id && (
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                        <div className="text-gray-600">Supplier Discount: <strong className="text-gray-900">{discounts[formData.supplier_id] || 0}%</strong></div>
                        <div className="text-gray-600">Supplier Agent: <strong className="text-gray-900">{supplierAgentCommissions[formData.supplier_id]?.agent || 'None'}</strong> {supplierAgentCommissions[formData.supplier_id]?.commission ? `(${supplierAgentCommissions[formData.supplier_id]?.commission})` : ''}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Buyer <span className="text-red-500">*</span></label>
                  <div className="md:col-span-3">
                    <select name="buyer_id" value={formData.buyer_id} onChange={handleChange} required className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Select Buyer —</option>
                      {buyers.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    {formData.buyer_id && (
                      <div className="mt-2 text-xs bg-gray-50 p-2 rounded border">
                        <div className="text-gray-600">Buyer Agent: <strong className="text-gray-900">{buyerAgentCommissions[formData.buyer_id]?.agent || 'None'}</strong> {buyerAgentCommissions[formData.buyer_id]?.commission ? `(${buyerAgentCommissions[formData.buyer_id]?.commission})` : ''}</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-percent text-gray-500"></i>
                <h3 className="text-base font-semibold">Markup Settings</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700">Preset</label>
                  <div className="md:col-span-3">
                    <select name="default_markup_id" value={formData.default_markup_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                      <option value="">— Use Custom / Select Preset —</option>
                      {defaultMarkups.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700">Markup % <span className="text-red-500">*</span></label>
                  <div className="md:col-span-3">
                    <input type="number" step="0.01" min="0" max="999.99" name="markup_percent" value={formData.markup_percent} onChange={handleChange} required
                      className="form-input w-full md:w-1/2 rounded border-gray-300 text-sm" placeholder="e.g. 10.50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-card-text text-gray-500"></i>
                <h3 className="text-base font-semibold">Other Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700">Status <span className="text-red-500">*</span></label>
                  <div className="md:col-span-3">
                    <select name="status" value={formData.status} onChange={handleChange} required className="form-select w-full md:w-1/3 rounded border-gray-300 text-sm">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Remarks</label>
                  <div className="md:col-span-3">
                    <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="form-textarea w-full rounded border-gray-300 text-sm"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center">
                <i className="bi bi-check-lg me-1"></i> {isEdit ? 'Update' : 'Save'} Markup Rule
              </button>
              <Link href="/masters/markups" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">Cancel</Link>
            </div>
          </form>
        </div>

        {/* Live Preview Side Panel */}
        <div className="w-full lg:w-80">
          <div className="bg-blue-50 border border-blue-100 rounded shadow-sm sticky top-6">
            <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900"><i className="bi bi-calculator me-1"></i> Pricing Preview</h3>
            </div>
            <div className="p-4">
              {preview && formData.supplier_id && formData.markup_percent ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Cost</span>
                    <span>100.00</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Markup ({formData.markup_percent}%)</span>
                    <span>+{((100 * parseFloat(formData.markup_percent)) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold border-t border-blue-200 pt-2">
                    <span>Client Price</span>
                    <span>{preview.client_price.toFixed(2)}</span>
                  </div>
                  <div className="h-4"></div>
                  <div className="flex justify-between text-gray-600 border-t border-blue-200 pt-2">
                    <span>Base Cost</span>
                    <span>100.00</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Supplier Discount ({preview.discount}%)</span>
                    <span className="text-green-600">-{((100 * preview.discount) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold border-t border-blue-200 pt-2">
                    <span>Our Cost</span>
                    <span>{preview.our_cost.toFixed(2)}</span>
                  </div>
                  <div className="h-4"></div>
                  <div className="flex justify-between text-blue-800 font-bold bg-blue-100 p-2 rounded">
                    <span>Est. Margin</span>
                    <span>{preview.profit.toFixed(2)}%</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-2 text-center">Calculated at 100 base units.</p>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6 text-sm">
                  Select a supplier and enter a markup % to see preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
