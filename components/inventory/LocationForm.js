'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormSection from '@/components/ui/FormSection';
import CompanySelect from '@/components/company/CompanySelect';
import CompanyBadge from '@/components/company/CompanyBadge';
import { apiClient } from '@/lib/api-client';

const INPUT = 'form-input w-full rounded border-gray-300 text-sm';
const LABEL = 'block text-xs font-medium text-gray-700 mb-1';

/** Minimal stock location: company (fixed once created), code, name, status. */
export default function LocationForm({ location = null, onSaved }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    company_id: location?.company_id || '',
    code: location?.code || '',
    name: location?.name || '',
    status: location?.status || 'active',
    remarks: location?.remarks || '',
  });
  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (location) {
        const { company_id: _companyId, ...payload } = form;
        const res = await apiClient.put(`/inventory/locations/${location.id}`, payload);
        onSaved?.(res.data);
      } else {
        const res = await apiClient.post('/inventory/locations', { ...form, company_id: Number(form.company_id) });
        router.push(`/inventory/locations/${res.data.id}`);
      }
    } catch (err) {
      const list = err.response?.data?.errors;
      const messages = list && typeof list === 'object' ? Object.values(list).flat() : [];
      setError(messages.length ? messages.join('; ') : (err.message || 'Failed to save location'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
      <FormSection title="Location" icon="bi-geo-alt" subtitle="Where accepted stock is physically held. The company cannot be changed after creation.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Company <span className="text-red-500">*</span></label>
            {location ? (
              <div className="py-1.5"><CompanyBadge label={location.company_label} code={location.company_code} /></div>
            ) : (
              <CompanySelect value={form.company_id} onChange={set('company_id')} required className="form-select w-full rounded border-gray-300 text-sm" />
            )}
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select value={form.status} onChange={set('status')} className="form-select w-full rounded border-gray-300 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Code <span className="text-red-500">*</span></label>
            <input type="text" required maxLength={20} pattern="[A-Za-z0-9_\-]+" title="Letters, digits, - and _ only" value={form.code} onChange={set('code')} className={`${INPUT} uppercase font-mono`} />
          </div>
          <div>
            <label className={LABEL}>Name <span className="text-red-500">*</span></label>
            <input type="text" required maxLength={100} value={form.name} onChange={set('name')} className={INPUT} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Remarks</label>
            <textarea rows={2} maxLength={2000} value={form.remarks} onChange={set('remarks')} className={INPUT}></textarea>
          </div>
        </div>
      </FormSection>
      <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
        <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm disabled:opacity-60">
          <i className="bi bi-check-lg mr-1"></i> {location ? 'Update' : 'Save'}
        </button>
        <Link href="/inventory/locations" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
      </div>
    </form>
  );
}
