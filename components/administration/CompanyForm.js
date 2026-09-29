'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../layout/DashboardLayout';
import FormSection from '../ui/FormSection';
import { apiClient } from '../../lib/api-client';
import { resetCompaniesCache } from '../../hooks/useCompanies';
import CompanyLetterhead from './CompanyLetterhead';

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

export default function CompanyForm({ companyId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!companyId);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    short_name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    is_active: '1',
  });

  useEffect(() => {
    if (!companyId) return;
    apiClient.get(`/administration/companies/${companyId}`).then(res => {
      const c = res.data?.company;
      if (c) {
        setFormData({
          code: c.code || '',
          name: c.name || '',
          short_name: c.short_name || '',
          gstin: c.gstin || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          is_active: c.is_active ? '1' : '0',
        });
      }
      setLoading(false);
    }).catch(err => {
      alert('Failed to load company: ' + err.message);
      router.push('/administration/companies');
    });
  }, [companyId, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      const payload = { ...formData, is_active: formData.is_active === '1' };
      if (companyId) {
        await apiClient.put(`/administration/companies/${companyId}`, payload);
      } else {
        await apiClient.post('/administration/companies', payload);
      }
      resetCompaniesCache();
      router.push('/administration/companies');
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
        <h2 className="text-2xl font-semibold text-fg m-0">
          {companyId ? 'Edit Company' : 'Add Company'}
        </h2>
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

            <FormSection title="Company Details" icon="bi-buildings" subtitle="Products and transactions are owned by one of these companies.">
              <div className="max-w-[860px]">
                <Row label="Company Code" required hint="2–10 letters or digits, e.g. SME. Used as a short identifier.">
                  <input type="text" name="code" required maxLength={10} value={formData.code} onChange={handleChange} placeholder="SME" className={`form-input font-mono uppercase`} />
                </Row>
                <Row label="Company Name" required>
                  <input type="text" name="name" required maxLength={200} value={formData.name} onChange={handleChange} placeholder="SM Enterprises" className="form-input" />
                </Row>
                <Row label="Short Name" hint="Shown on company badges in lists. Falls back to the full name.">
                  <input type="text" name="short_name" maxLength={60} value={formData.short_name} onChange={handleChange} placeholder="SM Enterprises" className="form-input" />
                </Row>
                <Row label="GSTIN">
                  <input type="text" name="gstin" maxLength={15} value={formData.gstin} onChange={handleChange} placeholder="15-character GSTIN" className={`form-input font-mono uppercase`} />
                </Row>
                <Row label="Phone">
                  <input type="text" name="phone" maxLength={30} value={formData.phone} onChange={handleChange} className="form-input" />
                </Row>
                <Row label="Email">
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" />
                </Row>
                <Row label="Address">
                  <textarea name="address" rows="2" value={formData.address} onChange={handleChange} className="form-textarea"></textarea>
                </Row>
                <Row label="Status" required hint="An inactive company keeps its existing records but cannot be chosen for new ones.">
                  <select name="is_active" value={formData.is_active} onChange={handleChange} className="form-select">
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
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
              <i className="bi bi-check-lg mr-1"></i> {companyId ? 'Update' : 'Save'} Company
            </button>
            <button
              type="button"
              onClick={() => router.push('/administration/companies')}
              className="inline-flex items-center px-4 py-2 border border-line-strong shadow-sm text-sm font-medium rounded-md text-fg-muted bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      {companyId && <CompanyLetterhead companyId={companyId} />}
    </DashboardLayout>
  );
}
