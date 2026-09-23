'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import { apiClient } from '@/lib/api-client';
import { toDateInputValue } from '@/components/sales/shared/format';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const blankLine = () => ({ key: Math.random().toString(36).slice(2), product_id: '', quantity: '', remarks: '' });
const stepFor = (decimals) => (Number(decimals) > 0 ? String(1 / 10 ** Number(decimals)) : '1');

/**
 * Create/edit form for a draft brand projection.
 * Company → brand (same company) → period → material lines (same company's
 * active products; the UOM always comes from the product).
 */
export default function ProjectionForm({ projectionId = null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [projectionNo, setProjectionNo] = useState('');
  // Products already on a saved draft stay selectable even if since deactivated.
  const [savedProducts, setSavedProducts] = useState([]);
  const [form, setForm] = useState({ company_id: '', brand_id: '', title: '', period_start: '', period_end: '', remarks: '' });
  const [lines, setLines] = useState([blankLine()]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const formRes = await apiClient.get(`/planning/brand-projections/form-data${projectionId ? `?projection_id=${projectionId}` : ''}`);
        if (!mounted) return;
        setBrands(formRes.data?.brands || []);
        setProducts(formRes.data?.products || []);

        if (projectionId) {
          const res = await apiClient.get(`/planning/brand-projections/${projectionId}`);
          const p = res.data?.projection;
          if (!mounted || !p) return;
          if (p.status !== 'draft') {
            router.replace(`/planning/brand-projections/${projectionId}`);
            return;
          }
          setProjectionNo(p.projection_no);
          setForm({
            company_id: p.company_id,
            brand_id: p.brand_id,
            title: p.title || '',
            period_start: toDateInputValue(p.period_start),
            period_end: toDateInputValue(p.period_end),
            remarks: p.remarks || '',
          });
          setSavedProducts(p.items.map((i) => ({
            id: i.product_id, company_id: p.company_id, name: i.product_name, item_group_code: i.item_group_code,
            material_type_name: i.material_type_name, uom_code: i.uom_code, uom_decimal_places: i.uom_decimal_places,
          })));
          setLines(p.items.length ? p.items.map((i) => ({ key: String(i.id), product_id: i.product_id, quantity: String(Number(i.quantity)), remarks: i.remarks || '' })) : [blankLine()]);
        }
      } catch (err) {
        if (mounted) setErrors([err.message || 'Failed to load form data']);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [projectionId, router]);

  const companyId = String(form.company_id || '');
  const brandOptions = brands.filter((b) => String(b.company_id) === companyId);
  const productOptions = [
    ...products,
    ...savedProducts.filter((sp) => !products.some((p) => p.id === sp.id)),
  ].filter((p) => String(p.company_id) === companyId);
  const productById = Object.fromEntries(productOptions.map((p) => [String(p.id), p]));

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Brand and product lines belong to one company, so a company change clears them.
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, company_id: value, brand_id: '' }));
    setLines([blankLine()]);
  };

  const updateLine = (index, patch) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const removeLine = (index) => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [blankLine()]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const payload = {
      ...form,
      items: lines.filter((l) => l.product_id).map((l) => ({ product_id: l.product_id, quantity: l.quantity, remarks: l.remarks })),
    };
    try {
      const res = projectionId
        ? await apiClient.put(`/planning/brand-projections/${projectionId}`, payload)
        : await apiClient.post('/planning/brand-projections', payload);
      router.push(`/planning/brand-projections/${res.data.projection.id}`);
    } catch (err) {
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [err.message || 'Failed to save projection']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading form data...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          <ul className="list-disc list-inside space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <FormSection title="Projection" icon="bi-graph-up-arrow" subtitle="A brand's expected material requirement for a planning period.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Projection No.</label>
            <input type="text" readOnly value={projectionId ? projectionNo : 'Auto-generated (BP/…)'} className={`${INPUT} bg-gray-50 border-dashed text-gray-500`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
            <CompanySelect value={form.company_id} onChange={handleCompanyChange} required className="form-select w-full rounded border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Brand <span className="text-red-500">*</span></label>
            <select name="brand_id" required value={form.brand_id} onChange={handleChange} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
              <option value="">{companyId ? '— Select brand —' : 'Select a company first'}</option>
              {brandOptions.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code}){b.status === 'active' ? '' : ' — inactive'}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" name="title" required maxLength={200} value={form.title} onChange={handleChange} placeholder="e.g. Spring–Summer season projection" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period Start <span className="text-red-500">*</span></label>
            <input type="date" name="period_start" required value={form.period_start} onChange={handleChange} className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Period End <span className="text-red-500">*</span></label>
            <input type="date" name="period_end" required min={form.period_start || undefined} value={form.period_end} onChange={handleChange} className={INPUT} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <textarea name="remarks" rows={2} maxLength={2000} value={form.remarks} onChange={handleChange} className={INPUT}></textarea>
          </div>
        </div>
      </FormSection>

      <FormSection title="Projected Materials" icon="bi-box-seam" subtitle="Only the selected company's active products with a UOM are listed. The UOM comes from the product.">
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium w-10">#</th>
                <th className="px-3 py-2 font-medium">Product / Material</th>
                <th className="px-3 py-2 font-medium w-40">Material Type</th>
                <th className="px-3 py-2 font-medium w-40 text-right">Projected Qty</th>
                <th className="px-3 py-2 font-medium w-20">UOM</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lines.map((line, index) => {
                const product = productById[String(line.product_id)];
                const taken = new Set(lines.filter((_, i) => i !== index).map((l) => String(l.product_id)));
                return (
                  <tr key={line.key}>
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2">
                      <select value={line.product_id} onChange={(e) => updateLine(index, { product_id: e.target.value })} disabled={!companyId} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-50">
                        <option value="">{companyId ? '— Select product —' : 'Select a company first'}</option>
                        {productOptions.filter((p) => !taken.has(String(p.id))).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.item_group_code})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{product?.material_type_name || '—'}</td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step={stepFor(product?.uom_decimal_places)} value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} disabled={!product} className={`${INPUT} text-right`} />
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">{product?.uom_code || '—'}</td>
                    <td className="px-3 py-2">
                      <input type="text" maxLength={500} value={line.remarks} onChange={(e) => updateLine(index, { remarks: e.target.value })} className={INPUT} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700" title="Remove line"><i className="bi bi-x-lg"></i></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setLines((prev) => [...prev, blankLine()])} disabled={!companyId} className="mt-3 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <i className="bi bi-plus-lg mr-1"></i> Add material
        </button>
      </FormSection>

      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving} className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <i className="bi bi-check-lg mr-1"></i> {projectionId ? 'Update' : 'Save'} Draft
        </button>
        <Link href={projectionId ? `/planning/brand-projections/${projectionId}` : '/planning/brand-projections'} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
