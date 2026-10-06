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

  if (loading) return <DashboardLayout><div className="p-8 text-center text-fg-subtle">Loading form data…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-fg m-0">
          {isEdit ? 'Edit Markup Rule' : 'Add Markup Rule'}
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside text-sm text-[var(--danger)] space-y-1">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <div className="bg-surface border rounded shadow-sm overflow-hidden">
              <div className="bg-surface-raised px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-diagram-2 text-fg-subtle"></i>
                <h3 className="text-base font-semibold">Party Pairing</h3>
              </div>
              <div className="p-4 space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted pt-2">Supplier <span className="text-[var(--danger)]">*</span></label>
                  <div className="md:col-span-3">
                    <select name="supplier_id" value={formData.supplier_id} onChange={handleChange} required className="form-select">
                      <option value="">— Select Supplier —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {formData.supplier_id && (
                      <div className="mt-2 text-xs bg-surface-raised p-2 rounded border">
                        <div className="text-fg-muted">Supplier Discount: <strong className="text-fg">{discounts[formData.supplier_id] || 0}%</strong></div>
                        <div className="text-fg-muted">Supplier Agent: <strong className="text-fg">{supplierAgentCommissions[formData.supplier_id]?.agent || 'None'}</strong> {supplierAgentCommissions[formData.supplier_id]?.commission ? `(${supplierAgentCommissions[formData.supplier_id]?.commission})` : ''}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted pt-2">Buyer <span className="text-[var(--danger)]">*</span></label>
                  <div className="md:col-span-3">
                    <select name="buyer_id" value={formData.buyer_id} onChange={handleChange} required className="form-select">
                      <option value="">— Select Buyer —</option>
                      {buyers.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                    </select>
                    {formData.buyer_id && (
                      <div className="mt-2 text-xs bg-surface-raised p-2 rounded border">
                        <div className="text-fg-muted">Buyer Agent: <strong className="text-fg">{buyerAgentCommissions[formData.buyer_id]?.agent || 'None'}</strong> {buyerAgentCommissions[formData.buyer_id]?.commission ? `(${buyerAgentCommissions[formData.buyer_id]?.commission})` : ''}</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-surface border rounded shadow-sm overflow-hidden">
              <div className="bg-surface-raised px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-percent text-fg-subtle"></i>
                <h3 className="text-base font-semibold">Markup Settings</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted">Preset</label>
                  <div className="md:col-span-3">
                    <select name="default_markup_id" value={formData.default_markup_id} onChange={handleChange} className="form-select">
                      <option value="">— Use Custom / Select Preset —</option>
                      {defaultMarkups.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted">Markup % <span className="text-[var(--danger)]">*</span></label>
                  <div className="md:col-span-3">
                    <input type="number" step="0.01" min="0" max="999.99" name="markup_percent" value={formData.markup_percent} onChange={handleChange} required
                      className="form-input md:w-1/2" placeholder="e.g. 10.50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface border rounded shadow-sm overflow-hidden">
              <div className="bg-surface-raised px-4 py-3 border-b flex items-center gap-2">
                <i className="bi bi-card-text text-fg-subtle"></i>
                <h3 className="text-base font-semibold">Other Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted">Status <span className="text-[var(--danger)]">*</span></label>
                  <div className="md:col-span-3">
                    <select name="status" value={formData.status} onChange={handleChange} required className="form-select md:w-1/3">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <label className="md:col-span-1 font-medium text-sm text-fg-muted pt-2">Remarks</label>
                  <div className="md:col-span-3">
                    <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="form-textarea" placeholder="Enter Remarks"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center">
                <i className="bi bi-check-lg me-1"></i> {isEdit ? 'Update' : 'Save'} Markup Rule
              </button>
              <Link href="/masters/markups" className="px-4 py-2 border border-line-strong rounded text-fg-muted hover:bg-surface-hover font-medium">Cancel</Link>
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
                  <div className="flex justify-between text-fg-muted">
                    <span>Base Cost</span>
                    <span>100.00</span>
                  </div>
                  <div className="flex justify-between text-fg-muted">
                    <span>Markup ({formData.markup_percent}%)</span>
                    <span>+{((100 * parseFloat(formData.markup_percent)) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-fg font-bold border-t border-blue-200 pt-2">
                    <span>Client Price</span>
                    <span>{preview.client_price.toFixed(2)}</span>
                  </div>
                  <div className="h-4"></div>
                  <div className="flex justify-between text-fg-muted border-t border-blue-200 pt-2">
                    <span>Base Cost</span>
                    <span>100.00</span>
                  </div>
                  <div className="flex justify-between text-fg-muted">
                    <span>Supplier Discount ({preview.discount}%)</span>
                    <span className="text-green-600">-{((100 * preview.discount) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-fg font-bold border-t border-blue-200 pt-2">
                    <span>Our Cost</span>
                    <span>{preview.our_cost.toFixed(2)}</span>
                  </div>
                  <div className="h-4"></div>
                  <div className="flex justify-between text-blue-800 font-bold bg-blue-100 p-2 rounded">
                    <span>Est. Margin</span>
                    <span>{preview.profit.toFixed(2)}%</span>
                  </div>
                  <p className="text-xs text-link mt-2 text-center">Calculated at 100 base units.</p>
                </div>
              ) : (
                <div className="text-center text-fg-subtle py-6 text-sm">
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
