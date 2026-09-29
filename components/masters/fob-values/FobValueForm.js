'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import { apiClient } from '@/lib/api-client';

export default function FobValueForm({ fobValueId }) {
  const router = useRouter();
  const isEdit = !!fobValueId;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    remarks: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    apiClient.get(`/masters/fob-values/${fobValueId}/edit`)
      .then(res => {
        if (res.success && res.data?.fobValue) {
          const f = res.data.fobValue;
          setFormData({ name: f.name || '', status: f.status || 'active', remarks: f.remarks || '' });
        }
        setLoading(false);
      })
      .catch(err => {
        alert('Failed to load FOB Value: ' + (err.message || 'Unknown error'));
        router.push('/masters/fob-values');
      });
  }, [fobValueId, isEdit, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    try {
      if (isEdit) {
        await apiClient.put(`/masters/fob-values/${fobValueId}`, formData);
      } else {
        await apiClient.post('/masters/fob-values', formData);
      }
      router.push('/masters/fob-values');
    } catch (err) {
      const errs = err.data?.errors || [];
      if (errs.length > 0) setErrors(errs);
      else alert(err.message || 'Save failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="py-12 text-center text-fg-subtle">Loading…</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-fg m-0">
          {isEdit ? 'Edit FOB Value' : 'Add FOB Value'}
        </h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <FormSection title="FOB Value Details" icon="bi-currency-dollar" subtitle="FOB Values appear on export document pricing lines.">
              <div className="max-w-[720px]">

                {errors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <ul className="list-disc list-inside text-sm text-[var(--danger)] space-y-1">
                      {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[180px] text-sm font-semibold text-fg-muted pt-1">
                    Name <span className="text-[var(--danger)] font-normal">*</span>
                  </label>
                  <div className="sm:w-3/4">
                    <input
                      type="text"
                      name="name"
                      required
                      maxLength={120}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. USD 50,000"
                      className="form-input focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                    />
                    <p className="mt-1 text-xs text-fg-subtle">Max 120 characters. Must be unique.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[180px] text-sm font-semibold text-fg-muted pt-1">
                    Status <span className="text-[var(--danger)] font-normal">*</span>
                  </label>
                  <div className="sm:w-3/4">
                    <select
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleChange}
                    className="form-select">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row">
                  <label className="sm:w-1/4 sm:min-w-[180px] text-sm font-semibold text-fg-muted pt-1">
                    Remarks
                  </label>
                  <div className="sm:w-3/4">
                    <textarea
                      name="remarks"
                      rows={2}
                      maxLength={1000}
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Optional notes"
                      className="form-textarea focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                    />
                  </div>
                </div>

              </div>
            </FormSection>
          </div>

          <div className="bg-surface-raised px-6 py-4 flex items-center gap-2 border-t border-line">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)] ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <i className="bi bi-check-lg mr-1"></i> {isEdit ? 'Update' : 'Save'} FOB Value
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/fob-values')}
              className="inline-flex items-center px-4 py-2 border border-line-strong shadow-sm text-sm font-medium rounded-md text-fg-muted bg-surface hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
