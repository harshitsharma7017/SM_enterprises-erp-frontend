'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../layout/DashboardLayout';
import FormSection from '../../ui/FormSection';
import CompanySelect from '../../company/CompanySelect';
import { apiClient } from '../../../lib/api-client';
import BrandSpecs from './BrandSpecs';

function Row({ label, required, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row mb-4">
      <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
        {label} {required && <span className="text-[var(--danger)] font-normal">*</span>}
      </label>
      <div className="sm:w-3/4">
        {children}
        {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}

export default function BrandForm({ brandId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!brandId);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({ company_id: '', code: '', name: '', status: 'active' });
  // The saved company — specs pick products from it, not from an unsaved change in the form.
  const [savedCompanyId, setSavedCompanyId] = useState(null);

  useEffect(() => {
    if (!brandId) return;
    apiClient.get(`/masters/brands/${brandId}`).then(res => {
      const b = res.data?.brand;
      if (b) {
        setFormData({ company_id: b.company_id || '', code: b.code || '', name: b.name || '', status: b.status || 'active' });
        setSavedCompanyId(b.company_id || null);
      }
      setLoading(false);
    }).catch(err => {
      alert('Failed to load brand: ' + err.message);
      router.push('/masters/brands');
    });
  }, [brandId, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      if (brandId) {
        await apiClient.put(`/masters/brands/${brandId}`, formData);
      } else {
        await apiClient.post('/masters/brands', formData);
      }
      router.push('/masters/brands');
    } catch (error) {
      const list = error.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : [error.message || 'Validation failed']);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="py-12 text-center text-fg-subtle">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-fg m-0">{brandId ? 'Edit Brand' : 'Add Brand'}</h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {errors.length > 0 && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded mb-4 text-sm">
                <ul className="list-disc pl-5 m-0">
                  {errors.map((msg) => <li key={msg}>{msg}</li>)}
                </ul>
              </div>
            )}

            <FormSection title="Brand Details" icon="bi-award" subtitle="Brand-specific material requirements are recorded against these brands.">
              <div className="max-w-[860px]">
                <Row label="Company" required hint="The company that serves this brand. Codes and names are unique within a company.">
                  <CompanySelect value={formData.company_id} onChange={handleChange} required />
                </Row>
                <Row label="Brand Code" required hint="2–10 letters or digits.">
                  <input type="text" name="code" required maxLength={10} value={formData.code} onChange={handleChange} className={`form-input font-mono uppercase`} />
                </Row>
                <Row label="Brand Name" required>
                  <input type="text" name="name" required maxLength={120} value={formData.name} onChange={handleChange} className="form-input" />
                </Row>
                <Row label="Status" required>
                  <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Row>
              </div>
            </FormSection>
          </div>

          <div className="bg-surface-raised px-6 py-4 flex items-center gap-2 border-t border-line">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)] ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <i className="bi bi-check-lg mr-1"></i> {brandId ? 'Update' : 'Save'} Brand
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/brands')}
              className="inline-flex items-center px-4 py-2 border border-line-strong shadow-sm text-sm font-medium rounded-md text-fg-muted bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      {brandId && savedCompanyId && <BrandSpecs brandId={brandId} companyId={savedCompanyId} />}
    </DashboardLayout>
  );
}
