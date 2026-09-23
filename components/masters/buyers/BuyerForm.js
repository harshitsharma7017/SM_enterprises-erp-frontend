/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

export default function BuyerForm({ buyerId = null }) {
  const router = useRouter();

  // Reference data
  const [categories, setCategories] = useState({});
  const [countries, setCountries] = useState({});
  const [ports, setPorts] = useState({});
  const [designations, setDesignations] = useState({});
  const [paymentTerms, setPaymentTerms] = useState({});
  const [incoterms, setIncoterms] = useState({});
  const [currencies, setCurrencies] = useState({});
  const [shipmentMethods, setShipmentMethods] = useState({});
  const [agents, setAgents] = useState([]);

  // Note: Backend does not currently provide states/cities for Buyer.
  // We keep empty arrays to satisfy the UI structure per requirements.
  const [states, setStates] = useState({});
  const [cities, setCities] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    company_name: '',
    category_ids: [],
    is_overseas: false,
    status: 'active',
    
    // Primary contact details in top-level for convenience (though stored as contacts)
    mobile: '',
    email: '',
    website: '',
    fax: '',
    
    // Secondary Contacts
    contacts: [],
    
    // Address Details
    address_line_1: '',
    address_line_2: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    
    // Destination Details
    port_id: '',
    destination: '',
    incoterm_id: '',
    shipment_method_id: '',
    
    // Agent
    agent_id: '',
    commission_percent: '',
    
    // Trade Terms
    payment_term_id: '',
    currency_id: '',
    advance_percent: '',
    sight_percent: '',
    
    // Bank Details
    bank_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    swift_code: '',
    
    // Carton Marking Details
    carton_markings: [],

    remarks: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [advanceSightError, setAdvanceSightError] = useState('');

  async function fetchBuyer() {
    try {
            const res = await apiClient.get(`/masters/buyers/${buyerId}/edit`);
      if (res.success) {
        const { buyer, categories, countries, ports, designations, paymentTerms, incoterms, currencies, shipmentMethods, agents } = res.data;
        
        setCategories(categories || {});
        setCountries(countries || {});
        setPorts(ports || {});
        setDesignations(designations || {});
        setPaymentTerms(paymentTerms || {});
        setIncoterms(incoterms || {});
        setCurrencies(currencies || {});
        setShipmentMethods(shipmentMethods || {});
        setAgents(agents || []);

        setFormData({
          company_name: buyer.company_name || '',
          category_ids: buyer.category_ids || [],
          is_overseas: !!buyer.is_overseas,
          status: buyer.status || 'active',
          mobile: buyer.mobile || '',
          email: buyer.email || '',
          website: buyer.website || '',
          fax: buyer.fax || '',
          contacts: buyer.contacts || [],
          address_line_1: buyer.address_line_1 || '',
          address_line_2: buyer.address_line_2 || '',
          country_id: buyer.country_id || '',
          state_id: buyer.state_id || '', // API currently might return this but no way to fetch states list
          city_id: buyer.city_id || '',   // API currently might return this but no way to fetch cities list
          pincode: buyer.pincode || '',
          gst_number: buyer.gst_number || '',
          pan_number: buyer.pan_number || '',
          port_id: buyer.port_id || '',
          destination: buyer.destination || '',
          incoterm_id: buyer.incoterm_id || '',
          shipment_method_id: buyer.shipment_method_id || '',
          agent_id: buyer.agent_id || '',
          commission_percent: buyer.commission_percent || '',
          payment_term_id: buyer.payment_term_id || '',
          currency_id: buyer.currency_id || '',
          advance_percent: buyer.advance_percent || '',
          sight_percent: buyer.sight_percent || '',
          bank_name: buyer.bank_name || '',
          branch_name: buyer.branch_name || '',
          account_number: buyer.account_number || '',
          ifsc_code: buyer.ifsc_code || '',
          swift_code: buyer.swift_code || '',
          carton_markings: buyer.carton_markings || [],
          remarks: buyer.remarks || ''
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load buyer data');
    } finally {
      setLoading(false);
    }
  };

  async function fetchDefaults() {
    try {
            const res = await apiClient.get('/masters/buyers/create');
      if (res.success) {
        const data = res.data;
        setCategories(data.categories || {});
        setCountries(data.countries || {});
        setPorts(data.ports || {});
        setDesignations(data.designations || {});
        setPaymentTerms(data.paymentTerms || {});
        setIncoterms(data.incoterms || {});
        setCurrencies(data.currencies || {});
        setShipmentMethods(data.shipmentMethods || {});
        setAgents(data.agents || []);
        
        // Initialize default carton markings (3 required lines)
        setFormData(prev => ({
          ...prev,
          carton_markings: [
            { label: 'Buyer Name', value: '' },
            { label: 'Style No', value: '' },
            { label: 'Destination', value: '' }
          ]
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buyerId) {
      fetchBuyer();
    } else {
      fetchDefaults();
    }
  }, [buyerId]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;

    if (name === 'category_ids') {
      const options = e.target.options;
      val = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          val.push(options[i].value);
        }
      }
    }

    setFormData(prev => {
      const next = { ...prev, [name]: val };
      
      // Advance / Sight Validation
      if (name === 'advance_percent' || name === 'sight_percent') {
        const adv = parseFloat(next.advance_percent) || 0;
        const sight = parseFloat(next.sight_percent) || 0;
        if (adv + sight !== 100 && (next.advance_percent || next.sight_percent)) {
          setAdvanceSightError('Advance and Sight percentages must total 100%.');
        } else {
          setAdvanceSightError('');
        }
      }

      // Geo Cascade Placeholder
      if (name === 'country_id') {
        // [BLOCKER DOC] The Node backend does not have a standalone GeoController.
        // It also does not support `?country_id=` for Buyer creation.
        // We leave the state_id and city_id clearing logic, but cannot fetch the next level.
        next.state_id = '';
        next.city_id = '';
      }
      if (name === 'state_id') {
        next.city_id = '';
      }

      return next;
    });
  };

  const handleContactChange = (index, field, value) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', designation_id: '', mobile: '', email: '' }]
    }));
  };

  const removeContact = (index) => {
    const newContacts = [...formData.contacts];
    newContacts.splice(index, 1);
    setFormData(prev => ({ ...prev, contacts: newContacts }));
  };

  const handleCartonChange = (index, field, value) => {
    const newMarkings = [...formData.carton_markings];
    newMarkings[index] = { ...newMarkings[index], [field]: value };
    setFormData(prev => ({ ...prev, carton_markings: newMarkings }));
  };

  const addCartonLine = () => {
    setFormData(prev => ({
      ...prev,
      carton_markings: [...prev.carton_markings, { label: `LINE ${prev.carton_markings.length + 1}`, value: '' }]
    }));
  };

  const removeCartonLine = (index) => {
    const newMarkings = [...formData.carton_markings];
    newMarkings.splice(index, 1);
    setFormData(prev => ({ ...prev, carton_markings: newMarkings }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const adv = parseFloat(formData.advance_percent) || 0;
    const sight = parseFloat(formData.sight_percent) || 0;
    if (adv + sight !== 100 && (formData.advance_percent || formData.sight_percent)) {
      setAdvanceSightError('Advance and Sight percentages must total 100%.');
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const payload = { ...formData };
      
      let res;
      if (buyerId) {
        res = await apiClient.put(`/masters/buyers/${buyerId}`, payload);
      } else {
        res = await apiClient.post('/masters/buyers', payload);
      }

      if (res.success) {
        router.push('/masters/buyers');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Error saving buyer');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading form data...</div>;
  }

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
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Company Name <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <input 
                type="text" 
                name="company_name" 
                value={formData.company_name} 
                onChange={handleChange}
                required
                maxLength="200"
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${errors.company_name ? 'border-red-500' : ''}`}
               placeholder="Enter Company Name"/>
              {errors.company_name && <p className="text-xs text-red-500 mt-1">{errors.company_name[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Categories <span className="text-red-500">*</span></label>
            <div className="md:col-span-3">
              <select 
                name="category_ids" 
                multiple
                value={formData.category_ids} 
                onChange={handleChange}
                required
                className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm h-24 ${errors.category_ids ? 'border-red-500' : ''}`}
              >
                {(Array.isArray(categories) ? categories : Object.entries(categories || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold CMD/Ctrl to select multiple.</p>
              {errors.category_ids && <p className="text-xs text-red-500 mt-1">{errors.category_ids[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <label className="md:col-span-1 font-medium text-sm text-gray-700">Overseas Buyer?</label>
            <div className="md:col-span-3">
              <label className="inline-flex items-center">
                <input 
                  type="checkbox" 
                  name="is_overseas" 
                  checked={formData.is_overseas} 
                  onChange={handleChange}
                  className="rounded border border-gray-300 text-blue-600" 
                />
                <span className="ml-2 text-sm">Yes, overseas buyer</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Contact */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-telephone text-gray-500"></i>
          <h3 className="text-base font-semibold">Contact Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input 
                type="text" 
                name="website" 
                value={formData.website} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Website"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fax</label>
              <input 
                type="text" 
                name="fax" 
                value={formData.fax} 
                onChange={handleChange}
                className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
               placeholder="Enter Fax"/>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Contacts */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-people text-gray-500"></i>
            <h3 className="text-base font-semibold">Secondary Contacts</h3>
          </div>
          <button type="button" onClick={addContact} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">
            <i className="bi bi-plus-lg"></i> Add Contact
          </button>
        </div>
        <div className="p-4 space-y-4">
          {formData.contacts.map((contact, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={contact.name} 
                  onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                <select 
                  value={contact.designation_id} 
                  onChange={(e) => handleContactChange(index, 'designation_id', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                >
                  <option value="">— Select —</option>
                  {(Array.isArray(designations) ? designations : Object.entries(designations || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                <input 
                  type="text" 
                  value={contact.mobile} 
                  onChange={(e) => handleContactChange(index, 'mobile', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={contact.email} 
                  onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                  className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                />
              </div>
              <div>
                <button type="button" onClick={() => removeContact(index)} className="btn btn-sm btn-outline-danger px-3 py-2 border rounded text-red-600 border-red-600 hover:bg-red-50">
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
          {formData.contacts.length === 0 && <p className="text-sm text-gray-500">No secondary contacts added.</p>}
        </div>
      </div>

      {/* Address & Destination */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-geo-alt text-gray-500"></i>
          <h3 className="text-base font-semibold">Address & Destination</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-1">Billing Address</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
                <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Address Line 1"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
                <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Address Line 2"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                  <select name="country_id" value={formData.country_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                    <option value="">— Select —</option>
                    {(Array.isArray(countries) ? countries : Object.entries(countries || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                    State 
                    <i className="bi bi-info-circle text-gray-400" title="State cascade requires backend support (Not currently available)"></i>
                  </label>
                  <select name="state_id" value={formData.state_id} onChange={handleChange} disabled={true} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm disabled:bg-gray-100">
                    <option value="">—</option>
                    {/* States not fetched due to backend gap */}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <select name="city_id" value={formData.city_id} onChange={handleChange} disabled={true} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm disabled:bg-gray-100">
                    <option value="">—</option>
                    {/* Cities not fetched due to backend gap */}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Pincode"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
                  <input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"  placeholder="Enter Gst Number"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PAN Number</label>
                  <input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"  placeholder="Enter Pan Number"/>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium border-b pb-1">Destination Details</h4>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                <select name="port_id" value={formData.port_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {(Array.isArray(ports) ? ports : Object.entries(ports || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Destination (City/Place)</label>
                <input type="text" name="destination" value={formData.destination} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Destination"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Incoterm</label>
                <select name="incoterm_id" value={formData.incoterm_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {(Array.isArray(incoterms) ? incoterms : Object.entries(incoterms || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Shipment Method</label>
                <select name="shipment_method_id" value={formData.shipment_method_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {(Array.isArray(shipmentMethods) ? shipmentMethods : Object.entries(shipmentMethods || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent & Commission */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-person-lines-fill text-gray-500"></i>
          <h3 className="text-base font-semibold">Agent & Commission</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Agent</label>
              <select name="agent_id" value={formData.agent_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                <option value="">— Select —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Commission %</label>
              <input type="number" step="0.01" min="0" max="100" name="commission_percent" value={formData.commission_percent} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Commission Percent"/>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Terms */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-cash text-gray-500"></i>
          <h3 className="text-base font-semibold">Trade Terms</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Term</label>
              <select name="payment_term_id" value={formData.payment_term_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                <option value="">— Select —</option>
                {(Array.isArray(paymentTerms) ? paymentTerms : Object.entries(paymentTerms || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency_id" value={formData.currency_id} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm">
                <option value="">— Select —</option>
                {(Array.isArray(currencies) ? currencies : Object.entries(currencies || {}).map(([id, name]) => ({id, name}))).map(item => { const id = item.id ?? item; const name = item.name ?? item.label ?? item.value ?? item; return <option key={id} value={id}>{name}</option>; })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Advance %</label>
              <input type="number" step="0.01" min="0" max="100" name="advance_percent" value={formData.advance_percent} onChange={handleChange} className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${advanceSightError ? 'border-red-500' : ''}`}  placeholder="Enter Advance Percent"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sight %</label>
              <input type="number" step="0.01" min="0" max="100" name="sight_percent" value={formData.sight_percent} onChange={handleChange} className={`px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm ${advanceSightError ? 'border-red-500' : ''}`}  placeholder="Enter Sight Percent"/>
            </div>
          </div>
          {advanceSightError && <p className="text-sm text-red-600">{advanceSightError}</p>}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
          <i className="bi bi-bank text-gray-500"></i>
          <h3 className="text-base font-semibold">Bank Details</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Bank Name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
              <input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Branch Name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
              <input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"  placeholder="Enter Account Number"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label>
                <input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"  placeholder="Enter Ifsc Code"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SWIFT Code</label>
                <input type="text" name="swift_code" value={formData.swift_code} onChange={handleChange} className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm uppercase"  placeholder="Enter Swift Code"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Carton Marking Details */}
      <div className="bg-white border rounded shadow-sm">
        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <i className="bi bi-box text-gray-500"></i>
            <h3 className="text-base font-semibold">Carton Marking Details</h3>
          </div>
          <button type="button" onClick={addCartonLine} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100">
            <i className="bi bi-plus-lg"></i> Add Line
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            {formData.carton_markings.map((marking, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="w-1/3">
                  <input 
                    type="text" 
                    value={marking.label} 
                    onChange={(e) => handleCartonChange(index, 'label', e.target.value)}
                    className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm bg-gray-50"
                    placeholder="Label"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={marking.value} 
                    onChange={(e) => handleCartonChange(index, 'value', e.target.value)}
                    className="px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full rounded border border-gray-300 text-sm"
                    placeholder="Value (e.g. Mens Shirt)"
                  />
                </div>
                <div>
                  {index > 2 && (
                    <button type="button" onClick={() => removeCartonLine(index)} className="text-red-500 hover:text-red-700 px-2 py-1">
                      <i className="bi bi-x-circle"></i>
                    </button>
                  )}
                  {index <= 2 && (
                    <div className="w-8 text-center text-gray-300"><i className="bi bi-lock-fill"></i></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Live Preview */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-gray-700">Live Preview</h4>
            <div className="border-2 border-dashed border-gray-400 p-6 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] bg-[#cdb08a] rounded min-h-[250px] shadow-inner font-mono text-gray-900 leading-relaxed max-w-sm mx-auto flex flex-col items-center justify-center text-center">
              {formData.carton_markings.filter(m => m.label || m.value).map((marking, index) => (
                <div key={index} className="w-full flex justify-between gap-4 py-0.5">
                  <span className="font-bold text-black opacity-80 uppercase tracking-wider">{marking.label || `LINE ${index + 1}`}:</span>
                  <span className="font-semibold">{marking.value || '_________'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          type="submit" 
          disabled={saving || (parseFloat(formData.advance_percent) + parseFloat(formData.sight_percent) !== 100 && (formData.advance_percent || formData.sight_percent))}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
        >
          <i className="bi bi-check-lg me-1"></i> {buyerId ? 'Update' : 'Save'} Buyer
        </button>
        <Link href="/masters/buyers" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">
          Cancel
        </Link>
      </div>

    </form>
  );
}
