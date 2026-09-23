/* eslint-disable */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function SupplierForm({ supplierId = null, initialPartyType = 'supplier' }) {
  const router = useRouter();

  // Reference data
  const [countries, setCountries] = useState({});
  const [states, setStates] = useState({});
  const [cities, setCities] = useState({});
  const [supplierTypes, setSupplierTypes] = useState({});
  const [designations, setDesignations] = useState({});
  const [paymentTerms, setPaymentTerms] = useState({});
  const [agents, setAgents] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    party_type: initialPartyType,
    name: '',
    supplier_type_id: '',
    pan_number: '',
    gst_number: '',
    cin_number: '',
    is_msme: false,
    msme_reg_number: '',
    
    // Primary contact (flattened from Blade but usually stored in contacts table)
    contact_person: '',
    designation_id: '',
    mobile: '',
    email: '',
    
    // Address
    address_line_1: '',
    address_line_2: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode: '',
    
    // Terms
    payment_term_id: '',
    agent_id: '',
    
    // Jobwork (if party_type is jobber or both)
    jobwork_type: '',
    is_tds_applicable: false,
    
    // Bank
    beneficiary_name: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    swift_code: '',
    
    status: 'active',
    remarks: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Uniqueness check state
  const [nameAvailable, setNameAvailable] = useState(null);
  const nameTimerRef = useRef(null);

  async function fetchSupplier() {
    try {
            const res = await apiClient.get(`/masters/suppliers/${supplierId}/edit`);
      if (res.success) {
        const { supplier, countries, states, cities, supplierTypes, designations, paymentTerms, agents } = res.data;
        setCountries(countries || {});
        setStates(states || {});
        setCities(cities || {});
        setSupplierTypes(supplierTypes || {});
        setDesignations(designations || {});
        setPaymentTerms(paymentTerms || {});
        setAgents(agents || []);

        setFormData({
          party_type: supplier.party_type || 'supplier',
          name: supplier.name || '',
          supplier_type_id: supplier.supplier_type_id || '',
          pan_number: supplier.pan_number || '',
          gst_number: supplier.gst_number || '',
          cin_number: supplier.cin_number || '',
          is_msme: !!supplier.is_msme,
          msme_reg_number: supplier.msme_reg_number || '',
          contact_person: supplier.primary_contact?.name || '',
          designation_id: supplier.primary_contact?.designation_id || '',
          mobile: supplier.primary_contact?.mobile || '',
          email: supplier.primary_contact?.email || '',
          address_line_1: supplier.address_line_1 || '',
          address_line_2: supplier.address_line_2 || '',
          country_id: supplier.country_id || '',
          state_id: supplier.state_id || '',
          city_id: supplier.city_id || '',
          pincode: supplier.pincode || '',
          payment_term_id: supplier.payment_term_id || '',
          agent_id: supplier.agent_id || '',
          jobwork_type: supplier.jobwork_type || '',
          is_tds_applicable: !!supplier.is_tds_applicable,
          beneficiary_name: supplier.beneficiary_name || '',
          bank_name: supplier.bank_name || '',
          branch_name: supplier.branch_name || '',
          account_number: supplier.account_number || '',
          ifsc_code: supplier.ifsc_code || '',
          swift_code: supplier.swift_code || '',
          status: supplier.status || 'active',
          remarks: supplier.remarks || ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  async function fetchDefaults(ptype, cId, sId) {
    try {
      const params = new URLSearchParams();
      if (ptype) params.append('party_type', ptype);
      if (cId) params.append('country_id', cId);
      if (sId) params.append('state_id', sId);

      const url = supplierId 
        ? `/masters/suppliers/${supplierId}/edit?${params.toString()}`
        : `/masters/suppliers/create?${params.toString()}`;

      const res = await apiClient.get(url);
      if (res.success) {
        const data = res.data;
        setCountries(data.countries || {});
        setStates(data.states || {});
        setCities(data.cities || {});
        if (!supplierId || Object.keys(supplierTypes).length === 0) {
          setSupplierTypes(data.supplierTypes || {});
          setDesignations(data.designations || {});
          setPaymentTerms(data.paymentTerms || {});
          setAgents(data.agents || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  async function fetchAgents(ptype) {
    try {
      const res = await apiClient.get(`/masters/suppliers/agents?party_type=${ptype}`);
      setAgents(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (supplierId) {
      fetchSupplier();
    } else {
      fetchDefaults(formData.party_type, formData.country_id, formData.state_id);
    }
  }, [supplierId]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData(prev => {
      const next = { ...prev, [name]: val };
      
      // Handle Cascades
      if (name === 'country_id') {
        next.state_id = '';
        next.city_id = '';
        if (val) fetchDefaults(next.party_type, val, '');
        else { setStates({}); setCities({}); }
      }
      if (name === 'state_id') {
        next.city_id = '';
        if (val) fetchDefaults(next.party_type, next.country_id, val);
        else setCities({});
      }
      if (name === 'party_type') {
        fetchAgents(val);
      }

      return next;
    });
  };

  // Debounced Uniqueness Check
  const checkUniqueness = (field, value, setAvailableState) => {
    if (!value || value.trim() === '') {
      setAvailableState(null);
      return;
    }
    const params = new URLSearchParams({ field, value: value.trim() });
    if (supplierId) params.append('ignore', supplierId);

    apiClient.get(`/masters/suppliers/check-code?${params.toString()}`)
      .then(res => {
        setAvailableState(res.data.available);
      })
      .catch(err => {
        setAvailableState(null);
      });
  };

  useEffect(() => {
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      checkUniqueness('name', formData.name, setNameAvailable);
    }, 350);
  }, [formData.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = { 
        ...formData,
        // The backend expects contacts array. We flatten it here to match backend structure
        contacts: [
          {
            name: formData.contact_person,
            designation_id: formData.designation_id,
            mobile: formData.mobile,
            email: formData.email
          }
        ]
      };

      let res;
      if (supplierId) {
        res = await apiClient.put(`/masters/suppliers/${supplierId}`, payload);
      } else {
        res = await apiClient.post('/masters/suppliers', payload);
      }

      if (res.success) {
        router.push('/masters/suppliers');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Error saving supplier');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading form data...</div>;
  }

  const showJobwork = formData.party_type === 'jobber' || formData.party_type === 'both';
  
  // Conditionally display GST if supplier type is registered.
  // In Laravel, "Unregistered" supplier type ID hides GST. We can check the label.
  const selectedSupplierTypeName = supplierTypes[formData.supplier_type_id]?.toLowerCase() || '';
  const isUnregistered = selectedSupplierTypeName.includes('unregistered');

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      
      {/* Identification */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-person-badge text-gray-500"></i>
          <h3 className="text-base font-semibold">Identification</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Party Type <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input type="radio" name="party_type" value="supplier" checked={formData.party_type === 'supplier'} onChange={handleChange} className="form-radio text-blue-600" />
                  <span className="ml-2 text-sm">Supplier</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="party_type" value="jobber" checked={formData.party_type === 'jobber'} onChange={handleChange} className="form-radio text-blue-600" />
                  <span className="ml-2 text-sm">Jobber</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="party_type" value="both" checked={formData.party_type === 'both'} onChange={handleChange} className="form-radio text-blue-600" />
                  <span className="ml-2 text-sm">Both</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Name <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                required
                maxLength="200"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.name ? 'border-red-500' : ''} ${nameAvailable === false ? 'border-red-500' : ''} ${nameAvailable === true ? 'border-green-500' : ''}`}
               placeholder="Enter Name"/>
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              <p className={`text-xs mt-1 ${nameAvailable === false ? 'text-red-500' : nameAvailable === true ? 'text-green-600' : 'text-gray-500'}`}>
                {nameAvailable === false ? 'Already taken — choose another.' : nameAvailable === true ? 'Available.' : 'Must be unique.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Supplier Type <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select 
                name="supplier_type_id" 
                value={formData.supplier_type_id} 
                onChange={handleChange}
                required
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.supplier_type_id ? 'border-red-500' : ''}`}
              >
                <option value="">Search type...</option>
                {(Array.isArray(supplierTypes) ? supplierTypes : Object.entries(supplierTypes || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
              {errors.supplier_type_id && <p className="text-xs text-red-500 mt-1">{errors.supplier_type_id[0]}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tax & Registration */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-file-earmark-medical text-gray-500"></i>
          <h3 className="text-base font-semibold">Tax & Registration</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">PAN Number</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="pan_number" 
                value={formData.pan_number} 
                onChange={handleChange}
                maxLength="10"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase ${errors.pan_number ? 'border-red-500' : ''}`}
               placeholder="Enter Pan Number"/>
              {errors.pan_number && <p className="text-xs text-red-500 mt-1">{errors.pan_number[0]}</p>}
            </div>
          </div>

          {!isUnregistered && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">GST Number</label>
              <div className="md:col-span-3">
                <input 
                  type="text" 
                  name="gst_number" 
                  value={formData.gst_number} 
                  onChange={handleChange}
                  maxLength="15"
                  className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase ${errors.gst_number ? 'border-red-500' : ''}`}
                 placeholder="Enter Gst Number"/>
                {errors.gst_number && <p className="text-xs text-red-500 mt-1">{errors.gst_number[0]}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">CIN Number</label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="cin_number" 
                value={formData.cin_number} 
                onChange={handleChange}
                maxLength="21"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"
               placeholder="Enter Cin Number"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Is MSME?</label>
            <div className="md:col-span-3">
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  name="is_msme" 
                  checked={formData.is_msme} 
                  onChange={handleChange}
                  className="rounded border border-gray-300" 
                />
                <span className="ml-2 text-sm text-gray-600">Yes, registered under MSME</span>
              </label>
            </div>
          </div>

          {formData.is_msme && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">MSME Reg No</label>
              <div className="md:col-span-3">
                <input 
                  type="text" 
                  name="msme_reg_number" 
                  value={formData.msme_reg_number} 
                  onChange={handleChange}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                 placeholder="Enter Msme Reg Number"/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Contact */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-telephone text-gray-500"></i>
          <h3 className="text-base font-semibold">Primary Contact</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
              <input 
                type="text" 
                name="contact_person" 
                value={formData.contact_person} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Contact Person"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
              <select 
                name="designation_id" 
                value={formData.designation_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">— Select —</option>
                {(Array.isArray(designations) ? designations : Object.entries(designations || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
              <input 
                type="text" 
                name="mobile" 
                value={formData.mobile} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Mobile"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Email"/>
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-geo-alt text-gray-500"></i>
          <h3 className="text-base font-semibold">Address</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
            <input 
              type="text" 
              name="address_line_1" 
              value={formData.address_line_1} 
              onChange={handleChange}
              className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
             placeholder="Enter Address Line 1"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
            <input 
              type="text" 
              name="address_line_2" 
              value={formData.address_line_2} 
              onChange={handleChange}
              className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
             placeholder="Enter Address Line 2"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
              <select 
                name="country_id" 
                value={formData.country_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">— Select —</option>
                {(Array.isArray(countries) ? countries : Object.entries(countries || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <select 
                name="state_id" 
                value={formData.state_id} 
                onChange={handleChange}
                disabled={!formData.country_id}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm disabled:bg-gray-100"
              >
                <option value="">— Select —</option>
                {(Array.isArray(states) ? states : Object.entries(states || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <select 
                name="city_id" 
                value={formData.city_id} 
                onChange={handleChange}
                disabled={!formData.state_id}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm disabled:bg-gray-100"
              >
                <option value="">— Select —</option>
                {(Array.isArray(cities) ? cities : Object.entries(cities || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
              <input 
                type="text" 
                name="pincode" 
                value={formData.pincode} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Pincode"/>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Terms */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-briefcase text-gray-500"></i>
          <h3 className="text-base font-semibold">Trade & Commission</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Term</label>
              <select 
                name="payment_term_id" 
                value={formData.payment_term_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">— Select —</option>
                {(Array.isArray(paymentTerms) ? paymentTerms : Object.entries(paymentTerms || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agent (for this Supplier)</label>
              <select 
                name="agent_id" 
                value={formData.agent_id} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
              >
                <option value="">— Select —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Jobwork Parameters */}
      {showJobwork && (
        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-scissors text-gray-500"></i>
            <h3 className="text-base font-semibold">Jobwork Parameters</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jobwork Type</label>
                <select 
                  name="jobwork_type" 
                  value={formData.jobwork_type} 
                  onChange={handleChange}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                >
                  <option value="">— Select —</option>
                  <option value="cutting">Cutting</option>
                  <option value="stitching">Stitching</option>
                  <option value="washing">Washing</option>
                  <option value="ironing">Ironing</option>
                  <option value="packing">Packing</option>
                  <option value="printing">Printing</option>
                  <option value="embroidery">Embroidery</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="inline-flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_tds_applicable" 
                    checked={formData.is_tds_applicable} 
                    onChange={handleChange}
                    className="rounded border border-gray-300" 
                  />
                  <span className="ml-2 text-sm text-gray-700">TDS Applicable</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-bank text-gray-500"></i>
          <h3 className="text-base font-semibold">Bank Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Beneficiary Name</label>
              <input 
                type="text" 
                name="beneficiary_name" 
                value={formData.beneficiary_name} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Beneficiary Name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
              <input 
                type="text" 
                name="bank_name" 
                value={formData.bank_name} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Bank Name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
              <input 
                type="text" 
                name="branch_name" 
                value={formData.branch_name} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Branch Name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
              <input 
                type="text" 
                name="account_number" 
                value={formData.account_number} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Account Number"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label>
              <input 
                type="text" 
                name="ifsc_code" 
                value={formData.ifsc_code} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"
               placeholder="Enter Ifsc Code"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">SWIFT Code</label>
              <input 
                type="text" 
                name="swift_code" 
                value={formData.swift_code} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"
               placeholder="Enter Swift Code"/>
            </div>
          </div>
        </div>
      </div>

      {/* Other Details */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-card-text text-gray-500"></i>
          <h3 className="text-base font-semibold">Other Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Status <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                required
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full md:w-1/3 rounded border border-gray-300 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <label className="md:col-span-1 font-medium text-sm text-gray-700 pt-2">Remarks</label>
            <div className="md:col-span-3">
              <textarea 
                name="remarks" 
                value={formData.remarks} 
                onChange={handleChange}
                rows="2"
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Remarks"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          type="submit" 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          <i className="bi bi-check-lg me-1"></i> {supplierId ? 'Update' : 'Save'} Supplier
        </button>
        <Link href="/masters/suppliers" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">
          Cancel
        </Link>
      </div>

    </form>
  );
}
