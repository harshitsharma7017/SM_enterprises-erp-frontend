'use client';
import { useState, useEffect, useCallback } from 'react';
import FormSection from '../../ui/FormSection';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';

const INPUT = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
const EMPTY = { product_id: '', design: '', quality: '', width: '', colour: '', printing: '', specification: '', remarks: '', status: 'active' };
const TEXT_FIELDS = [
  ['design', 'Design', 'e.g. HB wave pattern'],
  ['quality', 'Quality', 'e.g. 60s cotton, 110 GSM'],
  ['width', 'Width', 'e.g. 44 inch / 32 mm'],
  ['colour', 'Colour', 'e.g. Black'],
  ['printing', 'Printing', 'e.g. HB logo, white, 2 colours'],
];

const errorList = (err, fallback) => {
  const list = err.response?.data?.errors;
  return Array.isArray(list) && list.length ? list : [err.message || fallback];
};

/**
 * The brand's product specifications (client requirement 11): how this brand
 * wants each material — design, quality, width, colour, printing. Shown on
 * the brand's projection lines, orders and purchase orders.
 */
export default function BrandSpecs({ brandId, companyId }) {
  const { can } = useAuth(true);
  const canEdit = can('brand.edit');
  const [specs, setSpecs] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get(`/masters/brands/${brandId}/specs`);
      setSpecs(res.data || []);
    } catch (err) {
      setErrors(errorList(err, 'Failed to load specifications'));
    }
  }, [brandId]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  // Products of the brand's company only — a spec cannot cross companies.
  useEffect(() => {
    if (!companyId || !canEdit) return;
    apiClient.get(`/masters/products?company_id=${companyId}&limit=1000&sort=name&direction=asc`)
      .then((res) => setProducts(res.data?.data || []))
      .catch(() => setProducts([]));
  }, [companyId, canEdit]);

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
    setErrors([]);
  };

  const edit = (spec) => {
    setEditingId(spec.id);
    setErrors([]);
    setNotice(null);
    setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, spec[k] ?? (k === 'status' ? 'active' : '')])));
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    setNotice(null);
    try {
      const res = editingId
        ? await apiClient.put(`/masters/brands/${brandId}/specs/${editingId}`, form)
        : await apiClient.post(`/masters/brands/${brandId}/specs`, form);
      setNotice(res.message || 'Specification saved.');
      reset();
      load();
    } catch (err) {
      setErrors(errorList(err, 'Failed to save the specification'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (spec) => {
    if (!confirm(`Delete this brand's specification for ${spec.product_name}?`)) return;
    try {
      const res = await apiClient.delete(`/masters/brands/${brandId}/specs/${spec.id}`);
      setNotice(res.message || 'Specification deleted.');
      if (editingId === spec.id) reset();
      load();
    } catch (err) {
      setErrors(errorList(err, 'Failed to delete'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden mt-6">
      <div className="p-6">
        <FormSection title="Product Specifications">
          <p className="text-sm text-gray-500 mb-4">
            How this brand wants each material. Shown beside the product on this brand&apos;s projection lines, orders and purchase orders (and printed on the PO).
          </p>
          {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
              <ul className="list-disc pl-5 m-0">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-md mb-4">
            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Design</th>
                  <th className="px-3 py-2 font-medium">Quality</th>
                  <th className="px-3 py-2 font-medium">Width</th>
                  <th className="px-3 py-2 font-medium">Colour</th>
                  <th className="px-3 py-2 font-medium">Printing</th>
                  <th className="px-3 py-2 font-medium">Specification</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {canEdit && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {specs.length === 0 ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="px-3 py-6 text-center text-gray-500">No specifications yet.</td></tr>
                ) : specs.map((s) => (
                  <tr key={s.id} className={editingId === s.id ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2"><div className="font-medium">{s.product_name}</div><div className="text-xs text-gray-500">{s.item_group_code}</div></td>
                    <td className="px-3 py-2">{s.design || '—'}</td>
                    <td className="px-3 py-2">{s.quality || '—'}</td>
                    <td className="px-3 py-2">{s.width || '—'}</td>
                    <td className="px-3 py-2">{s.colour || '—'}</td>
                    <td className="px-3 py-2">{s.printing || '—'}</td>
                    <td className="px-3 py-2 whitespace-pre-line max-w-xs">{s.specification || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{s.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button type="button" onClick={() => edit(s)} className="text-blue-600 hover:text-blue-800 text-xs mr-3"><i className="bi bi-pencil"></i> Edit</button>
                        <button type="button" onClick={() => remove(s)} className="text-red-600 hover:text-red-800 text-xs"><i className="bi bi-trash"></i> Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form onSubmit={save} className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700 mt-0 mb-3">{editingId ? 'Edit specification' : 'Add specification'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                  <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={INPUT}>
                    <option value="">— Select —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.item_group_code ? ` (${p.item_group_code})` : ''}</option>)}
                  </select>
                </div>
                {TEXT_FIELDS.map(([name, label, placeholder]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input type="text" value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder} className={INPUT} />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Specification</label>
                  <textarea rows={2} value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} placeholder="Any other requirement — finish, fold, shrinkage allowance, packing" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INPUT}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                  <input type="text" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className={INPUT} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
                  <i className="bi bi-check-lg mr-1"></i> {editingId ? 'Update' : 'Add'} Specification
                </button>
                {editingId && <button type="button" onClick={reset} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">Cancel edit</button>}
              </div>
            </form>
          )}
        </FormSection>
      </div>
    </div>
  );
}
