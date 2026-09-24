'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import { apiClient } from '@/lib/api-client';

// Same field styling and layout as the other master forms (Brand, Material Type, UOM).
const INPUT = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';
const toList = (v) => (Array.isArray(v) ? v : Object.entries(v || {}).map(([id, name]) => ({ id, name })));

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
          setCalculationBases(d.calculationBases || d.calculation_bases || {});
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
      // The API client puts the response body on err.response.data.
      const list = err.response?.data?.errors;
      setErrors(Array.isArray(list) && list.length ? list : list && typeof list === 'object' ? Object.values(list).flat() : [err.message || 'Error saving agent']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  };

  const isDomestic = formData.agent_type === 'supplier' || formData.agent_type === 'jobber';

  if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading form data…</div></DashboardLayout>;

  const codeHint = codeAvailable === false ? 'Already taken.' : codeAvailable === true ? 'Available.' : 'Max 5 alphanumeric chars. Must be unique.';

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">{isEdit ? 'Edit Agent' : 'Add Agent'}</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[var(--card-border)] overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {errors.length > 0 && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded mb-4 text-sm">
                <ul className="list-disc pl-5 m-0">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}

            <FormSection title="Agent Profile" icon="bi-person-badge" subtitle="Who the agent is, and which side (supplier, jobber or buyer) they work on.">
              <div className="max-w-[860px]">
                <Row label="Agent Type" required>
                  <select name="agent_type" value={formData.agent_type} onChange={handleChange} required className={INPUT}>
                    {toList(agentTypes).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Row>
                <Row label="Display Code" required hint={<span className={codeAvailable === false ? 'text-red-500' : codeAvailable === true ? 'text-green-600' : ''}>{codeHint}</span>}>
                  <input type="text" name="display_code" value={formData.display_code} onChange={handleChange} required maxLength="5" placeholder="Enter Display Code"
                    className={`${INPUT} font-mono uppercase ${codeAvailable === false ? 'border-red-500' : codeAvailable === true ? 'border-green-500' : ''}`} />
                </Row>
                <Row label="Name" required>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required maxLength="200" className={INPUT} placeholder="Enter Name" />
                </Row>
                <Row label="Categories" required hint="Hold Ctrl/Cmd to select multiple. Filters agents in other forms.">
                  <select name="categories" multiple value={formData.categories} onChange={handleChange} required className={`${INPUT} min-h-[120px]`}>
                    {toList(categories).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Row>
              </div>
            </FormSection>

            <FormSection title="Commission Details" icon="bi-percent" subtitle="How the agent's commission is worked out.">
              <div className="max-w-[860px]">
                <Row label="Calculation Basis" required>
                  <select name="calculation_basis_id" value={formData.calculation_basis_id} onChange={handleChange} required className={INPUT}>
                    <option value="">— Select —</option>
                    {toList(calculationBases).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </Row>
                <Row label="Commissions" required>
                  <div className="space-y-3">
                    {formData.commissions.map((comm, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs text-gray-500 mb-1">Type</label>
                          <select value={comm.commission_type} onChange={(e) => handleCommissionChange(idx, 'commission_type', e.target.value)} required className={INPUT}>
                            {toList(commissionTypes).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-xs text-gray-500 mb-1">Amount</label>
                          <input type="number" step="0.0001" min="0" value={comm.amount} onChange={(e) => handleCommissionChange(idx, 'amount', e.target.value)} required className={INPUT} />
                        </div>
                        {!isDomestic && (
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs text-gray-500 mb-1">Currency (Optional)</label>
                            <select value={comm.currency_id} onChange={(e) => handleCommissionChange(idx, 'currency_id', e.target.value)} className={INPUT}>
                              <option value="">— Select —</option>
                              {toList(currencies).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        )}
                        {formData.commissions.length > 1 && (
                          <button type="button" onClick={() => removeCommission(idx)} className="text-red-500 hover:text-red-700 p-2" title="Remove"><i className="bi bi-trash"></i></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addCommission} className="mt-3 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center">
                    <i className="bi bi-plus-circle me-1"></i> Add Commission Row
                  </button>
                </Row>
              </div>
            </FormSection>

            <FormSection title="Other Details" icon="bi-card-text">
              <div className="max-w-[860px]">
                <Row label="Status" required>
                  <select name="status" value={formData.status} onChange={handleChange} required className={INPUT}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Row>
                <Row label="Remarks">
                  <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className={INPUT} placeholder="Enter Remarks"></textarea>
                </Row>
              </div>
            </FormSection>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex items-center gap-2 border-t border-gray-200">
            <button type="submit" disabled={saving}
              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}>
              <i className="bi bi-check-lg mr-1"></i> {isEdit ? 'Update' : 'Save'} Agent
            </button>
            <Link href="/masters/agents" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 no-underline">Cancel</Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
