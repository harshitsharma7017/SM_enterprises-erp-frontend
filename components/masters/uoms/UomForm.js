'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../layout/DashboardLayout';
import FormSection from '../../ui/FormSection';
import { apiClient } from '../../../lib/api-client';

const INPUT = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

function Row({ label, required, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row mb-4">
      <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
        {label} {required && <span className="text-red-500 font-normal">*</span>}
      </label>
      <div className="sm:w-3/4">
        {children}
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}

export default function UomForm({ uomId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!uomId);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({ code: '', name: '', decimal_places: '0', status: 'active' });

  useEffect(() => {
    if (!uomId) return;
    apiClient.get(`/masters/uoms/${uomId}`).then(res => {
      const m = res.data?.uom;
      if (m) {
        setFormData({ code: m.code || '', name: m.name || '', decimal_places: String(m.decimal_places ?? 0), status: m.status || 'active' });
      }
      setLoading(false);
    }).catch(err => {
      alert('Failed to load UOM: ' + err.message);
      router.push('/masters/uoms');
    });
  }, [uomId, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      if (uomId) {
        await apiClient.put(`/masters/uoms/${uomId}`, formData);
      } else {
        await apiClient.post('/masters/uoms', formData);
      }
      router.push('/masters/uoms');
    } catch (error) {
      const list = error.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [error.message || 'Validation failed']);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="py-12 text-center text-gray-500">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{uomId ? 'Edit UOM' : 'Add UOM'}</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {errors.length > 0 && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded mb-4 text-sm">
                <ul className="list-disc pl-5 m-0">
                  {errors.map((msg) => <li key={msg}>{msg}</li>)}
                </ul>
              </div>
            )}

            <FormSection title="Unit of Measure" icon="bi-rulers" subtitle="Shared by both companies. Products record the unit their quantities are kept in.">
              <div className="max-w-[860px]">
                <Row label="Code" required hint="Short unit code used on documents, e.g. MTR, PCS.">
                  <input type="text" name="code" required maxLength={20} value={formData.code} onChange={handleChange} className={`${INPUT} font-mono uppercase`} />
                </Row>
                <Row label="Name" required>
                  <input type="text" name="name" required maxLength={60} value={formData.name} onChange={handleChange} className={INPUT} />
                </Row>
                <Row label="Decimal Places" required hint="How many decimals a quantity in this unit may have, e.g. 2 for metres, 0 for pieces.">
                  <input type="number" name="decimal_places" required min={0} max={6} step={1} value={formData.decimal_places} onChange={handleChange} className={INPUT} />
                </Row>
                <Row label="Status" required>
                  <select name="status" value={formData.status} onChange={handleChange} className={INPUT}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Row>
              </div>
            </FormSection>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <i className="bi bi-check-lg mr-1"></i> {uomId ? 'Update' : 'Save'} UOM
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/uoms')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
