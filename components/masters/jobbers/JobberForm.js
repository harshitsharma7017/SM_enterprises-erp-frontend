/* eslint-disable */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api-client';

export default function JobberForm({ jobberId = null }) {
  const router = useRouter();
  const isEdit = !!jobberId;

  const [countries, setCountries] = useState({});
  const [states, setStates] = useState({});
  const [cities, setCities] = useState({});
  const [supplierTypes, setSupplierTypes] = useState({});
  const [designations, setDesignations] = useState({});
  const [paymentTerms, setPaymentTerms] = useState({});
  const [agents, setAgents] = useState([]);

  const [formData, setFormData] = useState({
    party_type: 'jobber',
    name: '',
    supplier_type_id: '',
    pan_number: '',
    gst_number: '',
    cin_number: '',
    is_msme: false,
    msme_reg_number: '',
    contact_person: '',
    designation_id: '',
    mobile: '',
    email: '',
    address_line_1: '',
    address_line_2: '',
    country_id: '',
    state_id: '',
    city_id: '',
    pincode: '',
    payment_term_id: '',
    agent_id: '',
    jobwork_type: '',
    is_tds_applicable: false,
    beneficiary_name: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    swift_code: '',
    status: 'active',
    remarks: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [nameAvailable, setNameAvailable] = useState(null);
  const nameTimerRef = useRef(null);

  async function fetchDefaults(cId, sId) {
    try {
      const params = new URLSearchParams();
      if (cId) params.append('country_id', cId);
      if (sId) params.append('state_id', sId);
      const url = isEdit
        ? `/masters/jobbers/${jobberId}/edit?${params}`
        : `/masters/jobbers/create?${params}`;
      const res = await apiClient.get(url);
      if (res.success && res.data) {
        const data = res.data;
        setCountries(data.countries || {});
        setStates(data.states || {});
        setCities(data.cities || {});
        if (!isEdit || Object.keys(supplierTypes).length === 0) {
          setSupplierTypes(data.supplierTypes || {});
          setDesignations(data.designations || {});
          setPaymentTerms(data.paymentTerms || {});
          setAgents(data.agents || []);
        }
        if (isEdit && data.jobber) {
          const j = data.jobber;
          setFormData({
            party_type: 'jobber',
            name: j.name || '',
            supplier_type_id: j.supplier_type_id || '',
            pan_number: j.pan_number || '',
            gst_number: j.gst_number || '',
            cin_number: j.cin_number || '',
            is_msme: !!j.is_msme,
            msme_reg_number: j.msme_reg_number || '',
            contact_person: j.primary_contact?.name || '',
            designation_id: j.primary_contact?.designation_id || '',
            mobile: j.primary_contact?.mobile || '',
            email: j.primary_contact?.email || '',
            address_line_1: j.address_line_1 || '',
            address_line_2: j.address_line_2 || '',
            country_id: j.country_id || '',
            state_id: j.state_id || '',
            city_id: j.city_id || '',
            pincode: j.pincode || '',
            payment_term_id: j.payment_term_id || '',
            agent_id: j.agent_id || '',
            jobwork_type: j.jobwork_type || '',
            is_tds_applicable: !!j.is_tds_applicable,
            beneficiary_name: j.beneficiary_name || '',
            bank_name: j.bank_name || '',
            branch_name: j.branch_name || '',
            account_number: j.account_number || '',
            ifsc_code: j.ifsc_code || '',
            swift_code: j.swift_code || '',
            status: j.status || 'active',
            remarks: j.remarks || '',
          });
        }
      }
    } catch (err) {
      console.error('fetchDefaults error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDefaults('', ''); }, [jobberId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'country_id') { next.state_id = ''; next.city_id = ''; if (val) fetchDefaults(val, ''); else { setStates({}); setCities({}); } }
      if (name === 'state_id') { next.city_id = ''; if (val) fetchDefaults(next.country_id, val); else setCities({}); }
      return next;
    });
  };

  useEffect(() => {
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    if (!formData.name || formData.name.trim() === '') { setNameAvailable(null); return; }
    nameTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams({ field: 'name', value: formData.name.trim() });
      if (jobberId) params.append('ignore', jobberId);
      apiClient.get(`/masters/jobbers/check-code?${params}`)
        .then(res => setNameAvailable(res.data?.available))
        .catch(() => setNameAvailable(null));
    }, 350);
  }, [formData.name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      const payload = {
        ...formData,
        party_type: 'jobber',
        contacts: [{
          name: formData.contact_person,
          designation_id: formData.designation_id,
          mobile: formData.mobile,
          email: formData.email,
        }],
      };
      if (isEdit) {
        await apiClient.put(`/masters/jobbers/${jobberId}`, payload);
      } else {
        await apiClient.post('/masters/jobbers', payload);
      }
      router.push('/masters/jobbers');
    } catch (err) {
      const errs = err.data?.errors || [];
      if (errs.length > 0) setErrors(errs);
      else alert(err.data?.message || err.message || 'Error saving jobber');
      setSaving(false);
    }
  };

  const selectedTypeName = supplierTypes[formData.supplier_type_id]?.toLowerCase() || '';
  const isUnregistered = selectedTypeName.includes('unregistered');

  if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading form data…</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 m-0">
          {isEdit ? 'Edit Jobber' : 'Add Jobber'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">

        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="font-semibold text-red-700 mb-2">Please fix the following errors:</p>
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Identification */}
        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-person-badge text-gray-500"></i>
            <h3 className="text-base font-semibold">Identification</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Name <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <input type="text" name="name" value={formData.name} onChange={handleChange} required maxLength="200"
                  className={`form-input w-full rounded border-gray-300 text-sm ${nameAvailable === false ? 'border-red-500' : nameAvailable === true ? 'border-green-500' : ''}`}  placeholder="Enter Name"/>
                <p className={`text-xs mt-1 ${nameAvailable === false ? 'text-red-500' : nameAvailable === true ? 'text-green-600' : 'text-gray-500'}`}>
                  {nameAvailable === false ? 'Already taken — choose another.' : nameAvailable === true ? 'Available.' : 'Must be unique.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Supplier Type <span className="text-red-500">*</span></label>
              <div className="md:col-span-3">
                <select name="supplier_type_id" value={formData.supplier_type_id} onChange={handleChange} required
                  className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {Object.entries(supplierTypes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
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
              <div className="md:col-span-3"><input type="text" name="pan_number" value={formData.pan_number} onChange={handleChange} maxLength="10" className="form-input w-full rounded border-gray-300 text-sm uppercase"  placeholder="Enter Pan Number"/></div>
            </div>
            {!isUnregistered && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <label className="md:col-span-1 font-medium text-sm text-gray-700">GST Number</label>
                <div className="md:col-span-3"><input type="text" name="gst_number" value={formData.gst_number} onChange={handleChange} maxLength="15" className="form-input w-full rounded border-gray-300 text-sm uppercase"  placeholder="Enter Gst Number"/></div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">CIN Number</label>
              <div className="md:col-span-3"><input type="text" name="cin_number" value={formData.cin_number} onChange={handleChange} maxLength="21" className="form-input w-full rounded border-gray-300 text-sm uppercase"  placeholder="Enter Cin Number"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <label className="md:col-span-1 font-medium text-sm text-gray-700">Is MSME?</label>
              <div className="md:col-span-3">
                <label className="inline-flex items-center">
                  <input type="checkbox" name="is_msme" checked={formData.is_msme} onChange={handleChange} className="rounded border-gray-300" />
                  <span className="ml-2 text-sm text-gray-600">Yes, registered under MSME</span>
                </label>
              </div>
            </div>
            {formData.is_msme && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <label className="md:col-span-1 font-medium text-sm text-gray-700">MSME Reg No</label>
                <div className="md:col-span-3"><input type="text" name="msme_reg_number" value={formData.msme_reg_number} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Msme Reg Number"/></div>
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
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Contact Person"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                <select name="designation_id" value={formData.designation_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {Object.entries(designations).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Mobile"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Email"/>
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
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label><input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Address Line 1"/></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label><input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Address Line 2"/></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                <select name="country_id" value={formData.country_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {Object.entries(countries).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                <select name="state_id" value={formData.state_id} onChange={handleChange} disabled={!formData.country_id} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-100">
                  <option value="">— Select —</option>
                  {Object.entries(states).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                <select name="city_id" value={formData.city_id} onChange={handleChange} disabled={!formData.state_id} className="form-select w-full rounded border-gray-300 text-sm disabled:bg-gray-100">
                  <option value="">— Select —</option>
                  {Object.entries(cities).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Pincode"/>
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
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Term</label>
                <select name="payment_term_id" value={formData.payment_term_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {Object.entries(paymentTerms).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Agent</label>
                <select name="agent_id" value={formData.agent_id} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
                  <option value="">— Select —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Jobwork Parameters — always shown for Jobbers */}
        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-scissors text-gray-500"></i>
            <h3 className="text-base font-semibold">Jobwork Parameters</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jobwork Type</label>
                <select name="jobwork_type" value={formData.jobwork_type} onChange={handleChange} className="form-select w-full rounded border-gray-300 text-sm">
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
                  <input type="checkbox" name="is_tds_applicable" checked={formData.is_tds_applicable} onChange={handleChange} className="rounded border-gray-300" />
                  <span className="ml-2 text-sm text-gray-700">TDS Applicable</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white border rounded shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
            <i className="bi bi-bank text-gray-500"></i>
            <h3 className="text-base font-semibold">Bank Details</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Beneficiary Name</label><input type="text" name="beneficiary_name" value={formData.beneficiary_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Beneficiary Name"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label><input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Bank Name"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Branch</label><input type="text" name="branch_name" value={formData.branch_name} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Branch Name"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label><input type="text" name="account_number" value={formData.account_number} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm"  placeholder="Enter Account Number"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label><input type="text" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm uppercase"  placeholder="Enter Ifsc Code"/></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">SWIFT Code</label><input type="text" name="swift_code" value={formData.swift_code} onChange={handleChange} className="form-input w-full rounded border-gray-300 text-sm uppercase"  placeholder="Enter Swift Code"/></div>
            </div>
          </div>
        </div>

        {/* Other */}
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
              <div className="md:col-span-3"><textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="form-textarea w-full rounded border-gray-300 text-sm" placeholder="Enter Remarks"></textarea></div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
            <i className="bi bi-check-lg me-1"></i> {isEdit ? 'Update' : 'Save'} Jobber
          </button>
          <Link href="/masters/jobbers" className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">Cancel</Link>
        </div>
      </form>
    </DashboardLayout>
  );
}
