'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import PageHeading from '@/components/sales/shared/PageHeading';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { storageUrl } from '@/components/export-documents/exportDocumentHelpers';

const FIELDS = [
  'company_name', 'tagline', 'address', 'phone', 'email',
  'gstin', 'iec_code',
  'bank_name', 'bank_account_number', 'bank_ifsc', 'bank_swift',
  'signatory_name', 'signatory_designation',
];

const blankForm = () => FIELDS.reduce((acc, f) => ({ ...acc, [f]: '' }), {});

/**
 * Company Profile — mirrors the original ERP's
 * administration/company-profile/edit.blade.php: a singleton form (no
 * create/delete), grouped into Company details, Statutory, Bank, and
 * Signatory sections, with a real multipart logo upload against the Node
 * API (Phase B). A new logo replaces and deletes the old file server-side;
 * leaving the file input empty preserves whatever logo is already set.
 */
export default function CompanyProfilePage() {
  const { can } = useAuth(true);
  const [form, setForm] = useState(blankForm());
  const [logoPath, setLogoPath] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/user-management/company-profile');
      const data = res.data || {};
      setForm(FIELDS.reduce((acc, f) => ({ ...acc, [f]: data[f] || '' }), {}));
      setLogoPath(data.logo_path || null);
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchProfile);
  }, [fetchProfile]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);
    try {
      const body = new FormData();
      FIELDS.forEach((f) => body.append(f, form[f] || ''));
      if (logoFile) body.append('logo', logoFile);

      const res = await apiClient.put('/user-management/company-profile', body);
      setLogoPath(res.data?.logo_path || logoPath);
      setLogoFile(null);
      setLogoPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess(res.message || 'Company Profile updated successfully');
    } catch (err) {
      if (err.data?.errors) setFieldErrors(err.data.errors);
      setError(err.data?.message === 'Validation failed' ? 'Please fix the errors below.' : (err.data?.error || err.message || 'Failed to save company profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-500">Loading company profile...</div>
      </DashboardLayout>
    );
  }

  const field = (name, label, opts = {}) => (
    <div className={opts.col || 'md:col-span-1'}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{opts.required && <span className="text-red-500"> *</span>}</label>
      <input
        type={opts.type || 'text'}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={opts.placeholder}
        required={opts.required}
        disabled={!can('company-profile.edit')}
        className={`w-full px-3 py-2 border rounded text-sm disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors[name] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {fieldErrors[name] && <p className="text-xs text-red-600 mt-1">{fieldErrors[name]}</p>}
    </div>
  );

  return (
    <DashboardLayout>
      <PageHeading title="Company Profile" />

      <Card title="Company Profile" variant="primary">
        <p className="text-sm text-gray-500 mb-4">
          Our own company&apos;s details — this is what prints on export invoices, bank documents and every
          other export paperwork.
        </p>

        {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              {field('company_name', 'Company Name', { required: true })}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <div className="flex items-center gap-2">
                {(logoPreview || logoPath) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview || storageUrl(logoPath)} alt="Logo" className="h-9 border rounded p-1" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={!can('company-profile.edit')}
                  onChange={handleLogoChange}
                  className={`text-xs w-full ${fieldErrors.logo ? 'border border-red-400 rounded p-1' : ''}`}
                />
              </div>
              {fieldErrors.logo && <p className="text-xs text-red-600 mt-1">{fieldErrors.logo}</p>}
            </div>

            <div className="md:col-span-4">{field('tagline', 'Tagline', { placeholder: 'e.g. An Indian Govt. Recognised Export House' })}</div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                name="address" value={form.address} onChange={handleChange} rows={3}
                disabled={!can('company-profile.edit')}
                className={`w-full px-3 py-2 border rounded text-sm disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors.address ? 'border-red-400' : 'border-gray-300'}`}
              />
              {fieldErrors.address && <p className="text-xs text-red-600 mt-1">{fieldErrors.address}</p>}
            </div>

            <div className="md:col-span-2">{field('phone', 'Phone')}</div>
            <div className="md:col-span-2">{field('email', 'Email', { type: 'email' })}</div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">Statutory Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('gstin', 'GSTIN', { placeholder: 'Required before generating an Export Invoice' })}
            {field('iec_code', 'IEC Code', { placeholder: 'Required before generating an Export Invoice' })}
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
            Bank Details <span className="text-gray-400 font-normal">(for the &quot;For Bank&quot; invoice variant)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('bank_name', 'Bank Name')}
            {field('bank_account_number', 'Account Number')}
            {field('bank_ifsc', 'IFSC Code')}
            {field('bank_swift', 'SWIFT Code')}
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-2">
            Signatory <span className="text-gray-400 font-normal">(printed on the invoice signature block)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('signatory_name', 'Name')}
            {field('signatory_designation', 'Designation', { placeholder: 'e.g. Partner, Director' })}
          </div>

          {can('company-profile.edit') && (
            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
                <i className="bi bi-check-lg me-1"></i>{saving ? 'Saving...' : 'Save Company Profile'}
              </button>
            </div>
          )}
        </form>
      </Card>
    </DashboardLayout>
  );
}
