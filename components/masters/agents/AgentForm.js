'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import { apiClient } from '@/lib/api-client';

export default function AgentForm({ agentId = null }) {
  const router = useRouter();
  const isEdit = !!agentId;

  const [agentTypes, setAgentTypes] = useState({});
  const [commissionTypes, setCommissionTypes] = useState({});
  const [categories, setCategories] = useState({});
  const [calculationBases, setCalculationBases] = useState({});
  const [currencies, setCurrencies] = useState({});

  const [formData, setFormData] = useState({
    agent_type: 'supplier',
    name: '',
    display_code: '',
    categories: [],
    calculation_basis_id: '',
    status: 'active',
    remarks: '',
    commissions: [{ commission_type: 'percent', amount: '', currency_id: '' }]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const [codeAvailable, setCodeAvailable] = useState(null);
  const codeTimerRef = useRef(null);

  useEffect(() => {
    async function fetchDefaults() {
      try {
        const url = isEdit ? `/masters/agents/${agentId}/edit` : `/masters/agents/create`;
        const res = await apiClient.get(url);
        if (res.success && res.data) {
          const d = res.data;
          setAgentTypes(d.agentTypes || {});
          setCommissionTypes(d.commissionTypes || {});
          setCategories(d.categories || {});
          setCalculationBases(d.calculationBases || {});
          setCurrencies(d.currencies || {});

          if (isEdit && d.agent) {
            const a = d.agent;
            setFormData({
              agent_type: a.agent_type || 'supplier',
              name: a.name || '',
              display_code: a.display_code || '',
              categories: a.categories ? a.categories.map(c => typeof c === 'object' ? c.id : c) : [],
              calculation_basis_id: a.calculation_basis_id || '',
              status: a.status || 'active',
              remarks: a.remarks || '',
              commissions: a.commissions?.length > 0 ? a.commissions.map(c => ({
                commission_type: c.commission_type,
                amount: c.amount,
                currency_id: c.currency_id || ''
              })) : [{ commission_type: 'percent', amount: '', currency_id: '' }]
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDefaults();
  }, [agentId, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'categories') {
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      setFormData(prev => ({ ...prev, categories: selected }));
      return;
    }

    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      
      // If agent_type becomes domestic (supplier/jobber), nullify currency in commissions
      if (name === 'agent_type') {
        const isDomestic = value === 'supplier' || value === 'jobber';
        if (isDomestic) {
          next.commissions = next.commissions.map(c => ({ ...c, currency_id: '' }));
        }
      }
      return next;
    });
  };

  const handleCommissionChange = (idx, field, val) => {
    setFormData(prev => {
      const newComms = [...prev.commissions];
      newComms[idx] = { ...newComms[idx], [field]: val };
      return { ...prev, commissions: newComms };
    });
  };

  const addCommission = () => {
    setFormData(prev => ({
      ...prev,
      commissions: [...prev.commissions, { commission_type: 'percent', amount: '', currency_id: '' }]
    }));
  };

  const removeCommission = (idx) => {
    setFormData(prev => {
      const newComms = [...prev.commissions];
      newComms.splice(idx, 1);
      return { ...prev, commissions: newComms };
    });
  };

  useEffect(() => {
    if (codeTimerRef.current) clearTimeout(codeTimerRef.current);
    if (!formData.display_code || formData.display_code.trim() === '') {
      queueMicrotask(() => setCodeAvailable(null));
      return;
    }
    
    codeTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams({ field: 'display_code', value: formData.display_code.trim() });
      if (agentId) params.append('ignore', agentId);
      apiClient.get(`/masters/agents/check-code?${params}`)
        .then(res => setCodeAvailable(res.data?.available))
        .catch(() => setCodeAvailable(null));
    }, 350);
  }, [formData.display_code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      if (isEdit) {
        await apiClient.put(`/masters/agents/${agentId}`, formData);
      } else {
        await apiClient.post('/masters/agents', formData);
      }
      router.push('/masters/agents');
    } catch (err) {
      const errs = err.data?.errors || [];
      if (errs.length > 0) setErrors(errs);
      else alert(err.data?.message || err.message || 'Error saving agent');
      setSaving(false);
    }
  };

  const isDomestic = formData.agent_type === 'supplier' || formData.agent_type === 'jobber';

  if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading form data…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">
          {isEdit ? 'Edit Agent' : 'Add Agent'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-person-badge text-gray-500"></i>
            <h3 className="text-base font-semibold">Agent Profile</h3>
          </div>
          <div className="p-4 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Agent Type <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <select name="agent_type" value={formData.agent_type} onChange={handleChange} required className="form-select w-full md:w-1/2 rounded border-gray-300 text-sm">
                  {Object.entries(agentTypes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Display Code <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <input type="text" name="display_code" value={formData.display_code} onChange={handleChange} required maxLength="5"
                  className={`form-input w-full md:w-1/2 rounded border-gray-300 text-sm uppercase ${codeAvailable === false ? 'border-red-500' : codeAvailable === true ? 'border-green-500' : ''}`}  placeholder="Enter Display Code"/>
                <p className={`text-xs mt-1 ${codeAvailable === false ? 'text-red-500' : codeAvailable === true ? 'text-green-600' : 'text-gray-500'}`}>
                  {codeAvailable === false ? 'Already taken.' : codeAvailable === true ? 'Available.' : 'Max 5 alphanumeric chars. Must be unique.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Name <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <input type="text" name="name" value={formData.name} onChange={handleChange} required maxLength="200" className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Name"/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Categories <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <select name="categories" multiple value={formData.categories} onChange={handleChange} required className="form-multiselect w-full rounded border-gray-300 text-sm min-h-[120px]">
                  {Object.entries(categories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple. Filters agents in other forms.</p>
              </div>
            </div>
            
          </div>
        </div>

        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-percent text-gray-500"></i>
            <h3 className="text-base font-semibold">Commission Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Calculation Basis <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <select name="calculation_basis_id" value={formData.calculation_basis_id} onChange={handleChange} required className="form-select w-full md:w-1/2 rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {Object.entries(calculationBases).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="pt-2">
              <label className="block font-medium text-sm text-gray-700 mb-2">Commissions <span className="text-red-500">*</span></label>
              
              <div className="space-y-3">
                {formData.commissions.map((comm, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select value={comm.commission_type} onChange={e => handleCommissionChange(idx, 'commission_type', e.target.value)} required className="form-select w-full rounded border-gray-300 text-sm py-1.5">
                        {Object.entries(commissionTypes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs text-gray-500 mb-1">Amount</label>
                      <input type="number" step="0.0001" min="0" value={comm.amount} onChange={e = placeholder="Enter Amount"> handleCommissionChange(idx, 'amount', e.target.value)} required className="form-input w-full rounded border-gray-300 text-sm py-1.5" />
                    </div>
                    {!isDomestic && (
                      <div className="flex-1 min-w-[120px]">
                        <label className="block text-xs text-gray-500 mb-1">Currency (Optional)</label>
                        <select value={comm.currency_id} onChange={e => handleCommissionChange(idx, 'currency_id', e.target.value)} className="form-select w-full rounded border-gray-300 text-sm py-1.5">
                          <option value="">— Select —</option>
                          {Object.entries(currencies).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                        </select>
                      </div>
                    )}
                    {formData.commissions.length > 1 && (
                      <div className="pt-5">
                        <button type="button" onClick={() => removeCommission(idx)} className="text-red-500 hover:text-red-700 p-1"><i className="bi bi-trash"></i></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button type="button" onClick={addCommission} className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <i className="bi bi-plus-circle me-1"></i> Add Commission Row
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-card-text text-gray-500"></i>
            <h3 className="text-base font-semibold">Other Details</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Status <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <select name="status" value={formData.status} onChange={handleChange} required className="form-select w-full md:w-1/3 rounded border-gray-300 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Remarks</label>
              <div className="md:col-span-3">
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="form-textarea w-full rounded border-gray-300 text-sm" placeholder="Enter Remarks"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center">
            <i className="bi bi-check-lg me-1"></i> {isEdit ? 'Update' : 'Save'} Agent
          </button>
          <Link href="/masters/agents" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">Cancel</Link>
        </div>
      </form>
    </DashboardLayout>
  );
}
