'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import FormSection from '../../../components/ui/FormSection';
import { apiClient } from '../../../lib/api-client';

export default function CategoryForm({ categoryId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!categoryId);
  const [submitting, setSubmitting] = useState(false);
  const [formats, setFormats] = useState([]);
  const [errors, setErrors] = useState({});
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    code: 'Auto',
    name: '',
    status: 'active',
    remarks: '',
    format_ids: []
  });

  useEffect(() => {
    // Fetch formats for the multiselect
    apiClient.get('/masters/formats?limit=100').then(res => {
      if (res.success && res.data) {
        setFormats(res.data.data || res.data.rows || []);
      }
    }).catch(console.error);

    if (categoryId) {
      apiClient.get(`/masters/categories/${categoryId}`).then(res => {
        if (res.success && res.data?.category) {
          const cat = res.data.category;
          setFormData({
            code: cat.code,
            name: cat.name,
            status: cat.status,
            remarks: cat.remarks || '',
            format_ids: cat.formats ? cat.formats.map(f => f.id) : []
          });
        }
        setLoading(false);
      }).catch(err => {
        alert('Failed to load category: ' + err.message);
        router.push('/masters/categories');
      });
    }
  }, [categoryId, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear error for the field
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const toggleFormat = (formatId) => {
    setFormData(prev => {
      const exists = prev.format_ids.includes(formatId);
      return {
        ...prev,
        format_ids: exists 
          ? prev.format_ids.filter(id => id !== formatId)
          : [...prev.format_ids, formatId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name: formData.name,
        status: formData.status,
        remarks: formData.remarks,
        format_ids: formData.format_ids
      };

      if (categoryId) {
        await apiClient.put(`/masters/categories/${categoryId}`, payload);
      } else {
        await apiClient.post('/masters/categories', payload);
      }
      
      router.push('/masters/categories');
    } catch (error) {
      // Backend validator returns errors in a specific format if we have it, else string
      alert(error.message || 'Validation failed');
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
          {categoryId ? 'Edit Category' : 'Add Category'}
        </h2>
      </div>

      <div className="bg-surface rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <FormSection title="Category Details" icon="bi-tags" subtitle="Products, jobbers and suppliers are all linked to a category.">
              <div className="max-w-[860px]">
                
                {/* Code Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
                    Category Code
                  </label>
                  <div className="sm:w-3/4">
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-line-strong bg-surface-raised text-fg-subtle text-sm">
                        <i className="bi bi-hash"></i>
                      </span>
                      <input
                        type="text"
                        readOnly
                        value={formData.code}
                        className="form-input flex-1 min-w-0 rounded-none rounded-r-md font-mono"
                       placeholder="Enter Code"/>
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">
                      {categoryId ? 'Codes never change — they appear on documents already sent.' : 'Assigned automatically when you save.'}
                    </p>
                  </div>
                </div>

                {/* Name Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
                    Category Name <span className="text-[var(--danger)] font-normal">*</span>
                  </label>
                  <div className="sm:w-3/4">
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Men's Shirts"
                      className="form-input focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                    />
                  </div>
                </div>

                {/* Formats Field (Custom Multi-select) */}
                <div className="flex flex-col sm:flex-row mb-4 relative">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
                    Order Formats Linked
                  </label>
                  <div className="sm:w-3/4">
                    <div className="relative">
                      <div 
                        className="min-h-[38px] w-full border border-line-strong rounded-md shadow-sm p-1.5 flex flex-wrap gap-1 cursor-pointer bg-surface"
                        onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                      >
                        {formData.format_ids.length === 0 && (
                          <span className="text-fg-subtle text-sm p-0.5 ml-1">Select formats...</span>
                        )}
                        {formData.format_ids.map(id => {
                          const format = formats.find(f => f.id === id);
                          if (!format) return null;
                          return (
                            <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-raised text-fg-muted">
                              {format.name}
                              <button
                                type="button"
                                className="ml-1 text-fg-subtle hover:text-fg-muted focus:outline-none"
                                onClick={(e) => { e.stopPropagation(); toggleFormat(id); }}
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      
                      {isFormatDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-surface shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm">
                          {formats.length === 0 ? (
                            <div className="px-3 py-2 text-fg-subtle">No formats available.</div>
                          ) : formats.map((format) => {
                            const isSelected = formData.format_ids.includes(format.id);
                            return (
                              <div
                                key={format.id}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-surface-hover ${isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-fg'}`}
                                onClick={() => toggleFormat(format.id)}
                              >
                                {format.name}
                                {isSelected && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-link">
                                    <i className="bi bi-check2"></i>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Invisible backdrop to close dropdown */}
                      {isFormatDropdownOpen && (
                        <div className="fixed inset-0 z-0" onClick={() => setIsFormatDropdownOpen(false)}></div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-fg-subtle">
                      Every format picked here is offered when raising an order under this category.
                    </p>
                  </div>
                </div>

                {/* Status Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
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

                {/* Remarks Field */}
                <div className="flex flex-col sm:flex-row">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-fg-muted pt-1">
                    Remarks
                  </label>
                  <div className="sm:w-3/4">
                    <textarea
                      name="remarks"
                      rows="2"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Optional notes"
                      className="form-textarea focus:ring-[var(--focus-ring)] focus:border-[var(--focus-ring)]"
                    ></textarea>
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
              <i className="bi bi-check-lg mr-1"></i> {categoryId ? 'Update' : 'Save'} Category
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/categories')}
              className="inline-flex items-center px-4 py-2 border border-line-strong shadow-sm text-sm font-medium rounded-md text-fg-muted bg-surface hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
