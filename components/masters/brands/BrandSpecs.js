'use client';
import { useState, useEffect, useCallback } from 'react';
import FormSection from '../../ui/FormSection';
import { apiClient } from '../../../lib/api-client';
import { useAuth } from '../../../hooks/useAuth';
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
    <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden mt-6">
      <div className="p-6">
        <FormSection title="Product Specifications">
          <p className="text-sm text-fg-subtle mb-4">
            How this brand wants each material. Shown beside the product on this brand&apos;s projection lines, orders and purchase orders (and printed on the PO).
          </p>
          {notice && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4 text-sm">{notice}</div>}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
              <ul className="list-disc pl-5 m-0">{errors.map((er) => <li key={er}>{er}</li>)}</ul>
            </div>
          )}

          <div className="table-wrap mb-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Design</th>
                  <th>Quality</th>
                  <th>Width</th>
                  <th>Colour</th>
                  <th>Printing</th>
                  <th>Specification</th>
                  <th>Status</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {specs.length === 0 ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="text-center">No specifications yet.</td></tr>
                ) : specs.map((s) => (
                  <tr key={s.id} className={editingId === s.id ? 'bg-blue-50' : ''}>
                    <td><div className="font-medium">{s.product_name}</div><div className="text-xs text-fg-subtle">{s.item_group_code}</div></td>
                    <td>{s.design || '—'}</td>
                    <td>{s.quality || '—'}</td>
                    <td>{s.width || '—'}</td>
                    <td>{s.colour || '—'}</td>
                    <td>{s.printing || '—'}</td>
                    <td className="whitespace-pre-line max-w-xs">{s.specification || '—'}</td>
                    <td>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{s.status === 'active' ? 'Active' : 'Inactive'}</span>
                    </td>
                    {canEdit && (
                      <td className="text-right whitespace-nowrap">
                        <button type="button" onClick={() => edit(s)} className="text-link hover:text-link-hover text-xs mr-3"><i className="bi bi-pencil"></i> Edit</button>
                        <button type="button" onClick={() => remove(s)} className="text-[var(--danger)] hover:text-red-800 text-xs"><i className="bi bi-trash"></i> Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <form onSubmit={save} className="border border-line rounded-md p-4 bg-surface-raised">
              <h4 className="text-sm font-semibold text-fg-muted mt-0 mb-3">{editingId ? 'Edit specification' : 'Add specification'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">Product <span className="text-[var(--danger)]">*</span></label>
                  <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="form-select">
                    <option value="">— Select —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.item_group_code ? ` (${p.item_group_code})` : ''}</option>)}
                  </select>
                </div>
                {TEXT_FIELDS.map(([name, label, placeholder]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-fg-muted mb-1">{label}</label>
                    <input type="text" value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder} className="form-input" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-fg-muted mb-1">Specification</label>
                  <textarea rows={2} value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} placeholder="Any other requirement — finish, fold, shrinkage allowance, packing" className="form-textarea" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-fg-muted mb-1">Remarks</label>
                  <input type="text" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-60">
                  <i className="bi bi-check-lg mr-1"></i> {editingId ? 'Update' : 'Add'} Specification
                </button>
                {editingId && <button type="button" onClick={reset} className="px-4 py-2 border border-line-strong rounded-md text-sm text-fg-muted bg-surface hover:bg-surface-hover">Cancel edit</button>}
              </div>
            </form>
          )}
        </FormSection>
      </div>
    </div>
  );
}
