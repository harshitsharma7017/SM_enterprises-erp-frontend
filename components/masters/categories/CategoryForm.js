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
    return <DashboardLayout><div className="py-12 text-center text-gray-500">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">
          {categoryId ? 'Edit Category' : 'Add Category'}
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <FormSection title="Category Details" icon="bi-tags" subtitle="Products, jobbers and suppliers are all linked to a category.">
              <div className="max-w-[860px]">
                
                {/* Code Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
                    Category Code
                  </label>
                  <div className="sm:w-3/4">
                    <div className="flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                        <i className="bi bi-hash"></i>
                      </span>
                      <input
                        type="text"
                        readOnly
                        value={formData.code}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 bg-gray-50 text-gray-500 font-mono sm:text-sm"
                       placeholder="Enter Code"/>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {categoryId ? 'Codes never change — they appear on documents already sent.' : 'Assigned automatically when you save.'}
                    </p>
                  </div>
                </div>

                {/* Name Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
                    Category Name <span className="text-red-500 font-normal">*</span>
                  </label>
                  <div className="sm:w-3/4">
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Men's Shirts"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Formats Field (Custom Multi-select) */}
                <div className="flex flex-col sm:flex-row mb-4 relative">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
                    Order Formats Linked
                  </label>
                  <div className="sm:w-3/4">
                    <div className="relative">
                      <div 
                        className="min-h-[38px] w-full border border-gray-300 rounded-md shadow-sm p-1.5 flex flex-wrap gap-1 cursor-pointer bg-white"
                        onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                      >
                        {formData.format_ids.length === 0 && (
                          <span className="text-gray-400 text-sm p-0.5 ml-1">Select formats...</span>
                        )}
                        {formData.format_ids.map(id => {
                          const format = formats.find(f => f.id === id);
                          if (!format) return null;
                          return (
                            <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {format.name}
                              <button
                                type="button"
                                className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                onClick={(e) => { e.stopPropagation(); toggleFormat(id); }}
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      
                      {isFormatDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm">
                          {formats.length === 0 ? (
                            <div className="px-3 py-2 text-gray-500">No formats available.</div>
                          ) : formats.map((format) => {
                            const isSelected = formData.format_ids.includes(format.id);
                            return (
                              <div
                                key={format.id}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-900'}`}
                                onClick={() => toggleFormat(format.id)}
                              >
                                {format.name}
                                {isSelected && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
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
                    <p className="mt-1 text-xs text-gray-500">
                      Every format picked here is offered when raising an order under this category.
                    </p>
                  </div>
                </div>

                {/* Status Field */}
                <div className="flex flex-col sm:flex-row mb-4">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
                    Status <span className="text-red-500 font-normal">*</span>
                  </label>
                  <div className="sm:w-3/4">
                    <select
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Remarks Field */}
                <div className="flex flex-col sm:flex-row">
                  <label className="sm:w-1/4 sm:min-w-[200px] text-sm font-semibold text-gray-700 pt-1">
                    Remarks
                  </label>
                  <div className="sm:w-3/4">
                    <textarea
                      name="remarks"
                      rows="2"
                      value={formData.remarks}
                      onChange={handleChange}
                      placeholder="Optional notes"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ></textarea>
                  </div>
                </div>

              </div>
            </FormSection>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <i className="bi bi-check-lg mr-1"></i> {categoryId ? 'Update' : 'Save'} Category
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/categories')}
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
